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
import { ArrowLeft, Minus, Plus, Trash, CreditCard, Sparkles, Truck, Search, Loader2, Ticket, User } from "lucide-react";
import { createInfinitepayCheckout, createShopOrderServerFn } from "@/lib/infinitepay.functions";
import { CustomerAuthModal } from "@/components/CustomerAuthModal";
import { ExitIntentPopup } from "@/components/ExitIntentPopup";

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

  // Regras de Primeira Compra (10% OFF)
  const [isFirstPurchase, setIsFirstPurchase] = useState<boolean>(false);
  const [checkingOrders, setCheckingOrders] = useState<boolean>(false);

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

  // Verificar se o usuário logado possui pedidos anteriores
  useEffect(() => {
    if (!user) {
      setIsFirstPurchase(false);
      return;
    }

    (async () => {
      setCheckingOrders(true);
      try {
        const { data, error } = await supabase
          .from("shop_orders")
          .select("id")
          .or(`customer_id.eq.${user.id},guest_email.eq.${user.email}`)
          .limit(1);

        if (!error) {
          setIsFirstPurchase(!data || data.length === 0);
        }
      } catch (err) {
        console.error("Erro ao verificar histórico de pedidos:", err);
      } finally {
        setCheckingOrders(false);
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

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [loadingCoupon, setLoadingCoupon] = useState(false);

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setLoadingCoupon(true);
    const code = couponInput.toUpperCase().trim();
    const { data, error } = await supabase.from("shop_coupons").select("*").eq("code", code).eq("active", true).single();
    setLoadingCoupon(false);
    
    if (error || !data) {
      toast.error("Cupom inválido ou expirado.");
      setAppliedCoupon(null);
    } else {
      setAppliedCoupon(data);
      toast.success("Cupom aplicado com sucesso!");
    }
  }

  // Cálculos de Desconto e Frete
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
    else baseShippingCost = 29.90; // Default fallback
  }
  const shippingCost = isFreeShipping ? 0 : baseShippingCost;
  
  // Regra de descontos (Mutuamente Exclusivos: Cupom OU 1ª Compra)
  let couponDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === "percentage") couponDiscount = Math.round(subtotal * (appliedCoupon.discount_value / 100) * 100) / 100;
    else couponDiscount = appliedCoupon.discount_value;
  }
  
  const firstPurchaseDiscount = (user && isFirstPurchase && !appliedCoupon) ? Math.round(subtotal * 0.10 * 100) / 100 : 0;
  
  const activeDiscount = Math.max(couponDiscount, firstPurchaseDiscount);
  const total = Math.max(0, subtotal - activeDiscount + shippingCost);

  // 5% de desconto no PIX permanece sempre após tudo se a forma escolhida for PIX
  const totalProductsAfterDiscount = Math.max(0, subtotal - activeDiscount);
  const pixDiscount = Math.round(totalProductsAfterDiscount * 0.05 * 100) / 100;
  const pixTotal = Math.max(0, total - pixDiscount);

  async function checkout() {
    if (items.length === 0) return;
    if (!name || !email) return toast.error("Preencha seu nome e e-mail para prosseguir.");
    if (!street || !city || !state || !zip) return toast.error("Preencha o CEP e o endereço de entrega.");
    setBusy(true);

    try {
      // Salvar dados atualizados no perfil do usuário para compras futuras
      if (user) {
        supabase.auth.updateUser({
          data: {
            full_name: name,
            phone,
            zip,
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
          },
        }).catch((e) => console.warn("Erro ao salvar metadata:", e));

        supabase.from("profiles").update({
          full_name: name,
          phone,
        }).eq("id", user.id).catch((e) => console.warn("Erro ao salvar profile:", e));
      }

      // Linha de endereço estruturada enviada para o servidor (rua | numero | complemento | bairro)
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
          payment_provider: "infinitepay",
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

      const res = await createInfinitepayCheckout({
        data: {
          order_id: order.id,
          success_url: `${window.location.origin}/loja?pagamento=sucesso`,
          cancel_url: `${window.location.origin}/loja/carrinho`,
        },
      });

      if (res.ok && res.url) {
        clear();
        setBusy(false);
        toast.success("Redirecionando para o pagamento seguro...");
        window.location.href = res.url;
        return;
      }

      throw new Error(res.error || "Erro ao gerar checkout");
    } catch (err: any) {
      console.error("Erro ao finalizar pedido:", err);
      setBusy(false);
      toast.error(err.message || "Erro ao processar o pedido.");
    }
  }

  async function checkoutWhatsApp() {
    if (items.length === 0) return;
    if (!name || !email) return toast.error("Preencha seu nome e e-mail para prosseguir.");
    if (!phone) return toast.error("Preencha seu WhatsApp/Telefone para prosseguir.");
    if (!street || !city || !state || !zip) return toast.error("Preencha o CEP e o endereço de entrega completo.");
    setBusy(true);

    try {
      if (user) {
        supabase.auth.updateUser({
          data: { full_name: name, phone, zip, street, number, complement, neighborhood, city, state },
        }).catch((e) => console.warn("Erro ao salvar metadata:", e));

        supabase.from("profiles").update({ full_name: name, phone }).eq("id", user.id).catch((e) => console.warn("Erro ao salvar profile:", e));
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

      const waText = `🛍️ *NOVO PEDIDO PRIVÊ — COMBINAR VIA WHATSAPP*

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
${activeDiscount > 0 ? `Desconto: -R$ ${activeDiscount.toFixed(2)}\n` : ""}Frete: ${isFreeShipping ? "GRÁTIS" : `R$ ${shippingCost.toFixed(2)}`}
*TOTAL A PAGAR: R$ ${total.toFixed(2)}*
${pixDiscount > 0 ? `*(No PIX 5% OFF: R$ ${pixTotal.toFixed(2)})*\n` : ""}${msg ? `\n📝 *Observações:* ${msg}` : ""}

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

          {/* Banner de incentivo ao desconto de 1ª Compra se não estiver logada */}
          {!user && (
            <div className="glass rounded-2xl p-4 border border-primary/30 bg-primary/5 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">10% de desconto na sua primeira compra! ✨</p>
                    <p className="text-[11px] text-muted-foreground">Cadastre-se ou entre na sua conta para ativar o desconto.</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="text-xs shrink-0 border-primary/40 text-primary" onClick={() => setShowAuth(true)}>
                  Entrar / Cadastrar
                </Button>
              </div>
              <div className="pt-2 border-t border-border/20 text-[10px] text-muted-foreground space-y-0.5">
                <p>⚠️ <strong>Atenção:</strong> O desconto de 1ª compra não acumula com cupons ou outras promoções (é um ou outro).</p>
                <p>⚡ <strong>Desconto PIX:</strong> O desconto de 5% no PIX permanece sempre ativo no final se o pagamento for no PIX.</p>
              </div>
            </div>
          )}

          {/* Banner de confirmação do desconto de 1ª Compra se estiver logada e for elegível */}
          {user && isFirstPurchase && (
            <div className="glass rounded-2xl p-4 border border-emerald-500/40 bg-emerald-500/10 space-y-2">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">10% OFF na 1ª Compra aplicado! ✨</p>
                  <p className="text-[11px] text-muted-foreground">Desconto exclusivo concedido por ser seu primeiro pedido.</p>
                </div>
              </div>
              <div className="pt-2 border-t border-emerald-500/20 text-[10px] text-muted-foreground space-y-0.5">
                <p>ℹ️ Não acumulável com cupons promocionais (aplica-se o desconto ativado). ⚡ +5% OFF garantido no PIX!</p>
              </div>
            </div>
          )}

          {user && !isFirstPurchase && !checkingOrders && (
            <div className="glass rounded-2xl p-3 border border-border/40 text-xs text-muted-foreground space-y-1">
              <p>Desconto de 1ª compra já utilizado em pedido anterior.</p>
              <p className="text-[10px]">⚡ O desconto de 5% no PIX permanece sempre ativo se optar por pagamento via PIX!</p>
            </div>
          )}

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
              
              {/* Cupom Input */}
              <div className="space-y-1">
                <div className="glass rounded-2xl p-4 border border-border/40 flex gap-2 items-center">
                  <Ticket className="w-5 h-5 text-muted-foreground shrink-0" />
                  <Input 
                    placeholder="Tem um cupom?" 
                    className="bg-transparent border-none focus-visible:ring-0 shadow-none px-2 uppercase" 
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    disabled={!!appliedCoupon}
                  />
                  {appliedCoupon ? (
                    <Button variant="ghost" size="sm" onClick={() => { setAppliedCoupon(null); setCouponInput(""); }} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">Remover</Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={handleApplyCoupon} disabled={!couponInput || loadingCoupon}>
                      {loadingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground px-2">
                  * Cupons de desconto não são acumulativos com o desconto de 1ª compra (é um ou outro). O desconto de 5% no PIX se mantém sempre ativo.
                </p>
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

              {firstPurchaseDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Desconto 1ª Compra (10% OFF)</span>
                  <span>- R$ {firstPurchaseDiscount.toFixed(2)}</span>
                </div>
              )}

              {couponDiscount > 0 && appliedCoupon && (
                <div className="flex justify-between text-primary font-medium">
                  <span className="flex items-center gap-1"><Ticket className="w-3 h-3"/> Cupom ({appliedCoupon.code})</span>
                  <span>- R$ {couponDiscount.toFixed(2)}</span>
                </div>
              )}

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
              <div className="flex justify-between font-display text-[15px] text-muted-foreground">
                <span>Total (Cartão)</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/30">
                <div>
                  <span className="font-display text-sm text-emerald-600 dark:text-emerald-400 font-bold block">Total no PIX</span>
                  <span className="text-[10px] text-muted-foreground">5% OFF mantido no PIX</span>
                </div>
                <div className="text-right">
                  <span className="font-display text-xl text-emerald-600 dark:text-emerald-400 font-bold">R$ {pixTotal.toFixed(2)}</span>
                  <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Economize R$ {pixDiscount.toFixed(2)}</span>
                </div>
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
                onClick={checkout}
                className="w-full py-3.5 font-medium shadow-md transition bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-95 shadow-glow"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {busy ? "Gerando Pagamento..." : "Pagar Online (Cartão ou PIX)"}
              </Button>

              <div className="relative text-center my-1">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/30" /></div>
                <span className="relative bg-background px-2 text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">ou prefere combinar?</span>
              </div>

              <Button
                disabled={busy}
                variant="outline"
                onClick={checkoutWhatsApp}
                className="w-full py-3.5 font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 transition flex items-center justify-center gap-2"
              >
                <img src="/whatsapp-glyph.png" alt="" className="w-5 h-5 object-contain" />
                Combinar no WhatsApp
              </Button>

              <p className="text-[11px] text-center text-muted-foreground leading-relaxed pt-1">
                🔒 Pagamento direto no site ou atendimento personalizado no WhatsApp.
              </p>
            </div>
          </aside>
        )}
      </div>
      <CustomerAuthModal open={showAuth} onOpenChange={setShowAuth} />
      <ExitIntentPopup onApplyCoupon={(code) => setCouponInput(code)} />
    </div>
  );
}
