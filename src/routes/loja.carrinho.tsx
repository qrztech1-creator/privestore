import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useShopCart } from "@/lib/shopCart";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { ArrowLeft, Minus, Plus, Trash, Truck, Loader2, User } from "lucide-react";
import { createShopOrderServerFn } from "@/lib/infinitepay.functions";
import { CustomerAuthModal } from "@/components/CustomerAuthModal";

export const Route = createFileRoute("/loja/carrinho")({
  component: CarrinhoPage,
  head: () => ({
    meta: [{ title: "Carrinho — Loja Privê" }, { name: "robots", content: "noindex" }],
  }),
});

function CarrinhoPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const items = useShopCart((s) => s.items);
  const setQty = useShopCart((s) => s.setQty);
  const remove = useShopCart((s) => s.remove);
  const clear = useShopCart((s) => s.clear);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  
  // Endereço detalhado
  const [zip, setZip] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [msg, setMsg] = useState("");

  const numberInputRef = useRef<HTMLInputElement>(null);
  
  const [busy, setBusy] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  // Carregar dados salvos no perfil / metadata do usuário logado
  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");

    const meta = user.user_metadata || {};
    if (meta.full_name && !name) setName(meta.full_name);
    if (meta.phone && !phone) setPhone(meta.phone);
    if (meta.zip && !zip) setZip(meta.zip);
    if (meta.street && !street) setStreet(meta.street);
    if (meta.number && !number) setNumber(meta.number);
    if (meta.complement && !complement) setComplement(meta.complement);
    if (meta.neighborhood && !neighborhood) setNeighborhood(meta.neighborhood);
    if (meta.city && !city) setCity(meta.city);
    if (meta.state && !state) setState(meta.state);

    (async () => {
      try {
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (prof) {
          if (prof.full_name && !name) setName(prof.full_name);
          if (prof.phone && !phone) setPhone(prof.phone);
        }
      } catch (e) {
        console.warn("Erro ao buscar perfil:", e);
      }
    })();
  }, [user]);

  // Busca automática de endereço por CEP (ViaCEP)
  async function handleCepLookup(inputZip: string) {
    const cleanZip = inputZip.replace(/\D/g, "");
    const formattedZip = cleanZip.length > 5 ? `${cleanZip.slice(0, 5)}-${cleanZip.slice(5, 8)}` : cleanZip;
    setZip(formattedZip);
    if (cleanZip.length !== 8) return;

    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setStreet(data.logradouro || "");
        setNeighborhood(data.bairro || "");
        setCity(data.localidade || "");
        setState(data.uf || "");
        toast.success("Endereço localizado! Digite o número da sua casa 🏠");
        setTimeout(() => numberInputRef.current?.focus(), 150);
      } else {
        toast.error("CEP não encontrado. Preencha manualmente.");
      }
    } catch (e) {
      console.error("Erro ao buscar CEP:", e);
    } finally {
      setLoadingCep(false);
    }
  }

  // Cálculos de Frete
  const cleanZipCount = zip.replace(/\D/g, "").length;
  const isFreeShipping = subtotal >= 299;
  
  // Frete por distância (via UF)
  let baseShippingCost = 0;
  if (cleanZipCount === 8) {
    const uf = state.toUpperCase();
    if (uf === "ES") baseShippingCost = 14.90;
    else if (["MG", "RJ", "SP"].includes(uf)) baseShippingCost = 19.90;
    else if (["PR", "SC", "RS", "MS", "MT", "GO", "DF"].includes(uf)) baseShippingCost = 29.90;
    else if (["BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"].includes(uf)) baseShippingCost = 34.90;
    else if (["AM", "PA", "AC", "RO", "RR", "AP", "TO"].includes(uf)) baseShippingCost = 45.90;
    else baseShippingCost = 29.90;
  }
  const shippingCost = isFreeShipping ? 0 : baseShippingCost;
  
  const total = Math.max(0, subtotal + shippingCost);

  async function checkoutWhatsApp() {
    if (items.length === 0) return;
    if (!name || !email) return toast.error("Preencha seu nome e e-mail para prosseguir.");
    if (!phone) return toast.error("Preencha seu WhatsApp/Telefone para prosseguir.");
    if (!street || !city || !state || !zip) return toast.error("Preencha o CEP e o endereço de entrega completo.");
    setBusy(true);

    try {
      if (user) {
        try {
          await supabase.auth.updateUser({
            data: { full_name: name, phone, zip, street, number, complement, neighborhood, city, state },
          });
        } catch (e) {
          console.warn("Erro ao salvar metadata:", e);
        }

        try {
          await supabase.from("profiles").update({ full_name: name, phone }).eq("id", user.id);
        } catch (e) {
          console.warn("Erro ao salvar profile:", e);
        }
      }

      const structuredAddressLine = `${street} | ${number || "S/N"} | ${complement || ""} | ${neighborhood || ""}`;

      const order = await createShopOrderServerFn({
        data: {
          customer_id: user?.id || null,
          guest_name: name,
          guest_email: email,
          guest_phone: phone || null,
          address_line: structuredAddressLine,
          address_city: city || null,
          address_state: state || null,
          address_zip: zip || null,
          message: msg || null,
          total,
          payment_provider: "whatsapp",
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId || null,
            name: i.name,
            variantLabel: i.variantLabel || null,
            qty: i.qty,
            price: i.price,
          })),
        },
      });

      clear();
      setBusy(false);

      const itemsSummary = items
        .map((i) => `• ${i.qty}x ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ""} — R$ ${(i.price * i.qty).toFixed(2)}`)
        .join("\n");

      const orderCode = order?.id ? `#${order.id.slice(0, 8).toUpperCase()}` : "";

      const waText = `🛍️ *NOVO PEDIDO PRIVÊ*

*Pedido:* ${orderCode}
*Cliente:* ${name}
*WhatsApp:* ${phone}
*E-mail:* ${email}

📦 *ENDEREÇO DE ENTREGA:*
${street}, Nº ${number || "S/N"}${complement ? ` (${complement})` : ""}
Bairro: ${neighborhood || "N/I"}
Cidade: ${city}/${state.toUpperCase()} — CEP: ${zip}

🛒 *ITENS DO PEDIDO:*
${itemsSummary}

💰 *RESUMO DO PEDIDO:*
Subtotal: R$ ${subtotal.toFixed(2)}
Frete: ${isFreeShipping ? "GRÁTIS" : `R$ ${shippingCost.toFixed(2)}`}
*TOTAL: R$ ${total.toFixed(2)}*
${msg ? `\n📝 *Observações:* ${msg}` : ""}

Olá! Fiz meu pedido no site da Privê e gostaria de combinar o pagamento e o envio com você! ✨`;

      const storePhoneClean = ((import.meta.env.VITE_STORE_WHATSAPP as string) || "5527992042450").replace(/\D/g, "");
      const waUrl = `https://wa.me/${storePhoneClean.startsWith("55") ? storePhoneClean : "55" + storePhoneClean}?text=${encodeURIComponent(waText)}`;

      toast.success("Pedido registrado com sucesso! Redirecionando para o WhatsApp...");
      window.open(waUrl, "_blank");
      navigate({ to: "/loja" });
    } catch (err: any) {
      console.error("Erro ao registrar pedido via WhatsApp:", err);
      setBusy(false);
      toast.error(err.message || "Erro ao registrar o pedido.");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 glass border-b border-border/30 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/loja"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Continuar comprando</Button></Link>
          <Logo className="h-16 md:h-20 ml-auto" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 grid lg:grid-cols-[1fr_400px] gap-6">
        <div className="space-y-4">
          <h1 className="font-display text-3xl">Seu carrinho</h1>

          {items.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center">
              <p className="text-muted-foreground mb-4">Carrinho vazio.</p>
              <Link to="/loja"><Button>Ir para a loja</Button></Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                {items.map((i) => (
                  <div key={`${i.productId}::${i.variantId || ""}`} className="glass rounded-xl p-3 flex items-center gap-3">
                    {i.imageUrl && <img src={i.imageUrl} className="w-16 h-16 rounded object-cover" alt="" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{i.name}</div>
                      {i.variantLabel && <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{i.variantLabel}</div>}
                      <div className="text-primary text-sm">R$ {i.price.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setQty(i.productId, i.variantId, i.qty - 1)}><Minus className="w-3 h-3" /></Button>
                      <span className="w-6 text-center text-sm">{i.qty}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setQty(i.productId, i.variantId, i.qty + 1)}><Plus className="w-3 h-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(i.productId, i.variantId)}><Trash className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <aside className="glass rounded-2xl p-5 h-fit lg:sticky lg:top-24 space-y-4">
            <h2 className="font-display text-2xl">Resumo do Pedido</h2>
            
            <div className="space-y-2 text-xs border-b border-border/30 pb-3">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Truck className="w-3 h-3 text-primary" /> Frete
                </span>
                {isFreeShipping ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">GRÁTIS</span>
                ) : (
                  <span>{cleanZipCount === 8 ? `R$ ${shippingCost.toFixed(2)}` : "Informe o CEP"}</span>
                )}
              </div>
              {subtotal < 299 && (
                <p className="text-[10px] text-muted-foreground pt-1">
                  Falta R$ {(299 - subtotal).toFixed(2)} para <span className="text-primary font-semibold">Frete Grátis</span>!
                </p>
              )}
            </div>

            <div className="space-y-2 border-b border-border/30 pb-3">
              <div className="flex justify-between font-display text-lg font-bold">
                <span>Total</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary border-b border-border/20 pb-1">
                <User className="w-3.5 h-3.5" /> 1. Dados Pessoais
              </div>
              <Input placeholder="Seu nome completo *" value={name} onChange={(e) => setName(e.target.value)} className="h-10 text-xs rounded-xl" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input placeholder="E-mail *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 text-xs rounded-xl" />
                <Input placeholder="WhatsApp / Telefone *" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10 text-xs rounded-xl" />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary border-b border-border/20 pb-1 pt-2">
                <Truck className="w-3.5 h-3.5" /> 2. Endereço de Entrega
              </div>
              
              <div className="relative">
                <Input
                  placeholder="CEP (00000-000) *"
                  value={zip}
                  onChange={(e) => handleCepLookup(e.target.value)}
                  maxLength={9}
                  className="h-10 text-xs rounded-xl pr-9 font-medium"
                />
                {loadingCep && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-primary" />}
              </div>

              <div className="grid grid-cols-[1fr_95px] gap-2">
                <Input placeholder="Rua / Logradouro *" value={street} onChange={(e) => setStreet(e.target.value)} className="h-10 text-xs rounded-xl" />
                <Input ref={numberInputRef} placeholder="Nº *" value={number} onChange={(e) => setNumber(e.target.value)} className="h-10 text-xs rounded-xl font-bold" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Complemento (Apto, Bloco)" value={complement} onChange={(e) => setComplement(e.target.value)} className="h-10 text-xs rounded-xl" />
                <Input placeholder="Bairro *" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="h-10 text-xs rounded-xl" />
              </div>

              <div className="grid grid-cols-[1fr_75px] gap-2">
                <Input placeholder="Cidade *" value={city} onChange={(e) => setCity(e.target.value)} className="h-10 text-xs rounded-xl" />
                <Input placeholder="UF *" value={state} onChange={(e) => setState(e.target.value)} maxLength={2} className="h-10 text-xs rounded-xl uppercase font-bold text-center" />
              </div>

              <Textarea placeholder="Observações do pedido (opcional)" rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} className="text-xs rounded-xl" />
            </div>

            <div className="pt-3 border-t border-border/30 space-y-2.5">
              <Button
                disabled={busy}
                onClick={checkoutWhatsApp}
                className="w-full py-4 font-semibold text-base shadow-md transition bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2.5 rounded-xl"
              >
                <img src="/whatsapp-glyph.png" alt="" className="w-5 h-5 object-contain brightness-0 invert" />
                {busy ? "Registrando pedido..." : "Finalizar pedido pelo WhatsApp"}
              </Button>

              <p className="text-[11px] text-center text-muted-foreground leading-relaxed pt-1">
                🔒 Você será redirecionado(a) para o WhatsApp da Privê para combinar o pagamento e entrega.
              </p>
            </div>
          </aside>
        )}
      </div>
      <CustomerAuthModal open={showAuth} onOpenChange={setShowAuth} />
    </div>
  );
}
