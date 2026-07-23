import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useShopCart } from "@/lib/shopCart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { ArrowLeft, Minus, Plus, Trash, CreditCard, QrCode } from "lucide-react";
import { createInfinitepayCheckout, createShopOrderServerFn } from "@/lib/infinitepay.functions";

export const Route = createFileRoute("/loja/carrinho")({
  component: CarrinhoPage,
  head: () => ({
    meta: [{ title: "Carrinho — Loja Privê" }, { name: "robots", content: "noindex" }],
  }),
});

type PayMethod = "infinitepay";

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
  const [busy, setBusy] = useState(false);

  async function checkout() {
    if (items.length === 0) return;
    if (!name || !email) return toast.error("Preencha nome e email");
    setBusy(true);

    try {
      // Usa função do servidor para ignorar RLS e garantir permissão total
      const order = await createShopOrderServerFn({
        data: {
          customer_id: user?.id || null,
          guest_name: name,
          guest_email: email,
          guest_phone: phone || null,
          address_line: address || null,
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
        toast.success("Redirecionando para o pagamento seguro na InfinitePay...");
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
          {items.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center">
              <p className="text-muted-foreground mb-4">Carrinho vazio.</p>
              <Link to="/loja"><Button>Ir para a loja</Button></Link>
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

        {items.length > 0 && (
          <aside className="glass rounded-2xl p-5 h-fit lg:sticky lg:top-24 space-y-3">
            <h2 className="font-display text-2xl">Finalizar Pedido</h2>
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
              <Textarea placeholder="Observações do pedido" rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} />
            </div>

            <div className="pt-2 border-t border-border/30">
              <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                Pagamento online instantâneo e seguro via InfinitePay (Cartão ou PIX).
              </p>
            </div>

            <Button
              disabled={busy}
              onClick={checkout}
              className="w-full py-2.5 font-medium shadow-md transition bg-primary text-primary-foreground hover:opacity-90 shadow-glow"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {busy ? "Redirecionando..." : "Finalizar com Cartão ou PIX"}
            </Button>
          </aside>
        )}
      </div>
    </div>
  );
}
