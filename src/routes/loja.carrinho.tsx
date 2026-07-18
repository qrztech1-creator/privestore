import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useShopCart } from "@/lib/shopCart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { ArrowLeft, MessageCircle, Minus, Plus, Trash, QrCode, CreditCard, Copy } from "lucide-react";
import pixQr from "@/assets/pix-qr.jpeg";

// WhatsApp da loja (formato: DDI+DDD+número, só dígitos)
// Pode ser sobrescrito com a env VITE_STORE_WHATSAPP.
const STORE_WHATSAPP = (import.meta.env.VITE_STORE_WHATSAPP as string) || "5511999999999";

export const Route = createFileRoute("/loja/carrinho")({
  component: CarrinhoPage,
  head: () => ({
    meta: [{ title: "Carrinho — Loja Privê" }, { name: "robots", content: "noindex" }],
  }),
});

type PayMethod = "pix" | "card" | "whatsapp";

function CarrinhoPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const items = useShopCart((s) => s.items);
  const setQty = useShopCart((s) => s.setQty);
  const remove = useShopCart((s) => s.remove);
  const clear = useShopCart((s) => s.clear);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [msg, setMsg] = useState("");
  const [method, setMethod] = useState<PayMethod>("pix");
  const [busy, setBusy] = useState(false);
  const [pixOrderId, setPixOrderId] = useState<string | null>(null);

  async function checkout() {
    if (items.length === 0) return;
    if (!name || !email) return toast.error("Preencha nome e email");
    setBusy(true);
    const { data: order, error } = await supabase.from("shop_orders").insert({
      customer_id: user?.id || null,
      guest_name: name, guest_email: email, guest_phone: phone || null,
      address_line: address || null, address_city: city || null,
      address_state: state || null, address_zip: zip || null,
      message: msg || null, total, status: "pending",
      payment_provider: method,
    }).select().single();
    if (error) { setBusy(false); return toast.error(error.message); }
    const { error: itemErr } = await supabase.from("shop_order_items").insert(items.map((i) => ({
      order_id: order.id, product_id: i.productId, variant_id: i.variantId,
      product_name: i.variantLabel ? `${i.name} — ${i.variantLabel}` : i.name,
      variant_label: i.variantLabel || null, qty: i.qty, unit_price: i.price,
    })));
    if (itemErr) { setBusy(false); return toast.error(itemErr.message); }

    const linhas = items.map((i) => {
      const label = i.variantLabel ? ` (${i.variantLabel})` : "";
      return `• ${i.qty}× ${i.name}${label} — R$ ${(i.price * i.qty).toFixed(2)}`;
    }).join("\n");
    const enderecoLinhas = [
      address && `Endereço: ${address}`,
      (city || state) && `Cidade/UF: ${city || "-"}/${state || "-"}`,
      zip && `CEP: ${zip}`,
    ].filter(Boolean).join("\n");
    const metodoLabel = method === "pix" ? "PIX (envio comprovante)" : method === "card" ? "Cartão" : "Combinar no WhatsApp";
    const texto =
      `*Novo pedido — Loja Privê*\n\n` +
      `*Pedido:* ${order.id.slice(0, 8).toUpperCase()}\n` +
      `*Cliente:* ${name}\n` +
      `*Email:* ${email}\n` +
      (phone ? `*WhatsApp:* ${phone}\n` : "") +
      `*Forma de pagamento:* ${metodoLabel}\n` +
      (enderecoLinhas ? `\n${enderecoLinhas}\n` : "") +
      `\n*Itens:*\n${linhas}\n\n` +
      `*Total: R$ ${total.toFixed(2)}*\n` +
      (msg ? `\n_Observações:_ ${msg}\n` : "") +
      (method === "pix"
        ? `\n💠 Paguei via PIX — segue o comprovante em anexo.`
        : `\nAguardo instruções para pagamento. 💝`);

    const waUrl = `https://wa.me/${STORE_WHATSAPP.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;

    if (method === "pix") {
      // Não limpa carrinho ainda — mostra QR e só limpa quando abrir WhatsApp
      setPixOrderId(order.id);
      setBusy(false);
      toast.success("Pedido registrado! Escaneie o QR do PIX e envie o comprovante no WhatsApp.");
      (window as any).__prive_wa = waUrl;
      return;
    }

    clear();
    setBusy(false);
    toast.success("Pedido registrado! Abrindo WhatsApp...");
    window.open(waUrl, "_blank");
    navigate({ to: "/loja" });
  }

  function openWhatsappAfterPix() {
    const url = (window as any).__prive_wa;
    clear();
    window.open(url, "_blank");
    navigate({ to: "/loja" });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 glass border-b border-border/30 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/loja"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Continuar comprando</Button></Link>
          <Logo className="h-7 ml-auto" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 grid lg:grid-cols-[1fr_400px] gap-6">
        <div>
          <h1 className="font-display text-3xl mb-4">Seu carrinho</h1>
          {items.length === 0 && !pixOrderId ? (
            <div className="glass rounded-2xl p-10 text-center">
              <p className="text-muted-foreground mb-4">Carrinho vazio.</p>
              <Link to="/loja"><Button>Ir para a loja</Button></Link>
            </div>
          ) : pixOrderId ? (
            <div className="glass rounded-2xl p-6 text-center space-y-4">
              <h2 className="font-display text-2xl">Pague com PIX</h2>
              <p className="text-sm text-muted-foreground">Escaneie o QR abaixo no app do seu banco. Depois clique no botão para enviar o comprovante pelo WhatsApp — assim liberamos o envio.</p>
              <img src={pixQr} alt="QR Code PIX" className="w-64 h-64 mx-auto rounded-xl bg-white p-3" />
              <div className="text-xs text-muted-foreground">
                Total: <span className="text-primary font-display text-lg">R$ {total.toFixed(2)}</span>
              </div>
              <Button onClick={openWhatsappAfterPix} className="bg-[#25D366] hover:bg-[#1faa55] text-white w-full">
                <MessageCircle className="w-4 h-4 mr-2" />Já paguei — enviar comprovante
              </Button>
              <p className="text-[10px] text-muted-foreground">Sem o comprovante o pedido não é despachado.</p>
            </div>
          ) : (
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
          )}
        </div>

        {items.length > 0 && !pixOrderId && (
          <aside className="glass rounded-2xl p-5 h-fit lg:sticky lg:top-24 space-y-3">
            <h2 className="font-display text-2xl">Finalizar</h2>
            <div className="flex justify-between font-display text-xl">
              <span>Total</span><span className="text-gradient-gold">R$ {total.toFixed(2)}</span>
            </div>
            <div className="space-y-2">
              <Input placeholder="Seu nome *" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Email *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input placeholder="WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input placeholder="Endereço" value={address} onChange={(e) => setAddress(e.target.value)} />
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
                <Input placeholder="UF" value={state} onChange={(e) => setState(e.target.value)} maxLength={2} />
                <Input placeholder="CEP" value={zip} onChange={(e) => setZip(e.target.value)} />
              </div>
              <Textarea placeholder="Observações" rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} />
            </div>

            <div className="pt-1">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Forma de pagamento</div>
              <div className="grid grid-cols-3 gap-1">
                <button type="button" onClick={() => setMethod("pix")} className={`text-xs rounded-lg border px-2 py-2 flex flex-col items-center gap-1 ${method === "pix" ? "border-primary bg-primary/10" : "border-border/40"}`}>
                  <QrCode className="w-4 h-4" />PIX
                </button>
                <button type="button" onClick={() => setMethod("card")} className={`text-xs rounded-lg border px-2 py-2 flex flex-col items-center gap-1 ${method === "card" ? "border-primary bg-primary/10" : "border-border/40"}`}>
                  <CreditCard className="w-4 h-4" />Cartão
                </button>
                <button type="button" onClick={() => setMethod("whatsapp")} className={`text-xs rounded-lg border px-2 py-2 flex flex-col items-center gap-1 ${method === "whatsapp" ? "border-primary bg-primary/10" : "border-border/40"}`}>
                  <MessageCircle className="w-4 h-4" />Combinar
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {method === "pix" && "Pague com PIX escaneando o QR e envie o comprovante no WhatsApp."}
                {method === "card" && "Finalizamos o cartão pelo WhatsApp — enviaremos o link de pagamento."}
                {method === "whatsapp" && "Combinamos a forma de pagamento diretamente no WhatsApp."}
              </p>
            </div>

            <Button disabled={busy} onClick={checkout} className="w-full bg-[#25D366] hover:bg-[#1faa55] text-white">
              <MessageCircle className="w-4 h-4 mr-2" />
              {busy ? "Enviando..." : method === "pix" ? "Gerar PIX e ir ao WhatsApp" : "Finalizar no WhatsApp"}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">O pedido é registrado no sistema. A loja atualiza o status (pago, enviado, entregue) no painel.</p>
          </aside>
        )}
      </div>
    </div>
  );
}
