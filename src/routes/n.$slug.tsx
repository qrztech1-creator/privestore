import { createFileRoute, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { ParticlesBackground } from "@/components/ParticlesBackground";
import { Countdown } from "@/components/Countdown";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCart } from "@/lib/cart";
import { Heart, Plus, Minus, ShoppingBag, Share2, MessageCircle, Lock, Trash } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/n/$slug")({
  component: PublicBride,
  validateSearch: (s: Record<string, unknown>) => ({ t: (s.t as string) || undefined }),
});

function PublicBride() {
  const { slug } = useParams({ from: "/n/$slug" });
  const { t: token } = useSearch({ from: "/n/$slug" });
  const { user, isAdmin } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessOk, setAccessOk] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: ev } = await supabase.from("events").select("*").eq("slug", slug).maybeSingle();
      setEvent(ev);
      if (ev) {
        // Owner or admin always has access; public events open; private/secret need invite token
        const isOwner = user && ev.owner_id === user.id;
        if (ev.visibility === "public" || isOwner || isAdmin) {
          setAccessOk(true);
        } else if (token) {
          const { data: inv } = await supabase.from("event_invites").select("*").eq("token", token).eq("event_id", ev.id).maybeSingle();
          setAccessOk(!!inv);
        }
        const { data: ep } = await supabase.from("event_products").select("*, product:products(*)").eq("event_id", ev.id).order("position");
        setItems(ep || []);
      }
      setLoading(false);
    })();
  }, [slug, user, isAdmin, token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center"><p>Página não encontrada.</p></div>;

  if (!accessOk) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass rounded-3xl p-10 max-w-md text-center">
          <Lock className="w-10 h-10 text-primary mx-auto mb-4" />
          <h1 className="font-display text-3xl mb-2">Acesso restrito</h1>
          <p className="text-muted-foreground text-sm">Esta página é privada. Use o link recebido pela noiva.</p>
        </div>
      </div>
    );
  }

  const p = event.palette || {};
  const styleVars: any = {
    "--p-primary": p.primary, "--p-accent": p.accent, "--p-bg": p.bg, "--p-text": p.text,
  };

  return (
    <div className="palette-scope min-h-screen" style={styleVars}>
      {(isAdmin || user?.id === event.owner_id) && event.visibility !== "public" && (
        <div className="bg-primary/20 border-b border-primary/40 px-4 py-2 text-xs text-center">
          👁 Você está vendo uma página {event.visibility} como {isAdmin ? "admin" : "dona"}.
        </div>
      )}

      {/* HERO */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 overflow-hidden">
        {event.banner_url && (
          <div className="absolute inset-0 -z-20">
            <img src={event.banner_url} alt="" className="w-full h-full object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
          </div>
        )}
        <ParticlesBackground />
        <Logo className="h-10 absolute top-6 left-6 opacity-80" />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="text-center max-w-3xl">
          <span className="text-xs uppercase tracking-[0.4em] text-primary/80">{event.type.replace("_", " ")}</span>
          <h1 className="font-display text-6xl sm:text-8xl mt-4 leading-none">
            {event.bride_name}
            {event.partner_name && <><br /><em className="text-gradient-gold text-5xl sm:text-7xl">& {event.partner_name}</em></>}
          </h1>
          {event.event_date && (
            <div className="mt-8">
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">contagem regressiva</div>
              <Countdown target={event.event_date} />
            </div>
          )}
        </motion.div>
        <Button onClick={() => setCartOpen(true)} className="fixed bottom-6 right-6 z-30 rounded-full h-14 w-14 shadow-glow bg-gradient-to-r from-primary to-accent text-primary-foreground" size="icon">
          <ShoppingBag className="w-5 h-5" />
        </Button>
      </section>

      {/* MESSAGE */}
      {event.message && (
        <section className="px-6 py-20 max-w-3xl mx-auto text-center">
          <div className="gold-divider w-24 mx-auto mb-6" />
          <p className="font-display text-2xl sm:text-3xl italic leading-relaxed">"{event.message}"</p>
          <p className="mt-4 text-sm uppercase tracking-[0.3em] text-primary/80">— {event.bride_name}</p>
        </section>
      )}

      {/* PLAYLIST */}
      {event.playlist_url && (
        <section className="px-6 py-12 max-w-3xl mx-auto">
          <h2 className="font-display text-3xl text-center mb-6">A trilha sonora</h2>
          <div className="glass rounded-2xl overflow-hidden">
            <iframe src={event.playlist_url.includes("embed") ? event.playlist_url : event.playlist_url.replace("open.spotify.com/", "open.spotify.com/embed/")} width="100%" height="352" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
          </div>
        </section>
      )}

      {/* WISHLIST */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <Heart className="w-6 h-6 text-primary mx-auto mb-3" />
          <h2 className="font-display text-4xl sm:text-5xl">Lista da noiva</h2>
          <p className="text-muted-foreground text-sm mt-2">Itens cuidadosamente escolhidos por {event.bride_name}.</p>
        </div>
        {items.length === 0 ? <p className="text-center text-muted-foreground">A lista será revelada em breve.</p> :
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {items.map((it, i) => <WishCard key={it.id} item={it} eventId={event.id} delay={i * 0.05} />)}
          </div>}
      </section>

      <CartDialog open={cartOpen} onOpenChange={setCartOpen} event={event} />

      <footer className="border-t border-border/30 py-8 px-6 text-center text-xs text-muted-foreground">
        <Logo className="h-7 mx-auto mb-2 opacity-60" />
        Uma experiência Privê.
      </footer>
    </div>
  );
}

function WishCard({ item, eventId, delay }: any) {
  const add = useCart((s) => s.add);
  const remaining = (item.desired_qty || 0) - (item.purchased_qty || 0);
  const sold = remaining <= 0;
  const p = item.product;
  if (!p) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="glass rounded-2xl overflow-hidden hover-lift group"
    >
      <div className="aspect-square bg-secondary overflow-hidden relative">
        {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" /> : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />}
        {sold && <div className="absolute inset-0 bg-background/70 flex items-center justify-center"><span className="text-xs uppercase tracking-wider px-3 py-1 rounded-full glass">Presenteado</span></div>}
      </div>
      <div className="p-4">
        <h3 className="font-medium truncate">{p.name}</h3>
        <div className="text-primary font-display text-xl">R$ {Number(p.price).toFixed(2)}</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{remaining > 0 ? `${remaining} disponível${remaining > 1 ? "is" : ""}` : "esgotado"}</div>
        <Button
          size="sm"
          disabled={sold}
          onClick={() => { add(eventId, { eventProductId: item.id, productId: p.id, name: p.name, price: Number(p.price), imageUrl: p.image_url, qty: 1, maxQty: remaining }); toast.success("Adicionado ao carrinho"); }}
          className="w-full mt-3 bg-gradient-to-r from-primary to-accent text-primary-foreground"
        >
          <Plus className="w-3 h-3 mr-1" />Presentear
        </Button>
      </div>
    </motion.div>
  );
}

function CartDialog({ open, onOpenChange, event }: any) {
  const cart = useCart();
  const items = cart.items[event.id] || [];
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function checkout(mode: "wa" | "register" | "card") {
    if (items.length === 0) return;
    if (!name) return toast.error("Informe seu nome");
    setBusy(true);
    const { data: order, error } = await supabase.from("orders").insert({
      event_id: event.id, guest_name: name, guest_phone: phone || null, guest_email: email || null,
      message: msg || null, total, status: "pending",
    }).select().single();
    if (error) { setBusy(false); return toast.error(error.message); }
    await supabase.from("order_items").insert(items.map(i => ({
      order_id: order.id, event_product_id: i.eventProductId, product_id: i.productId,
      product_name: i.name, qty: i.qty, unit_price: i.price,
    })));

    if (mode === "card") {
      const { data, error: fnErr } = await supabase.functions.invoke("create-checkout", {
        body: { order_id: order.id, success_url: window.location.href + "?paid=1", cancel_url: window.location.href },
      });
      setBusy(false);
      if (fnErr || !data?.url) return toast.error(fnErr?.message || "Falha ao iniciar pagamento");
      cart.clear(event.id);
      window.location.href = data.url;
      return;
    }

    cart.clear(event.id);
    setBusy(false);
    if (mode === "wa" && event.whatsapp_number) {
      const text = `Oi! Acabei de fazer um pedido para ${event.bride_name}:\n\n${items.map(i => `• ${i.qty}x ${i.name}`).join("\n")}\n\nTotal: R$ ${total.toFixed(2)}\nMeu nome: ${name}`;
      window.open(`https://wa.me/${event.whatsapp_number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`, "_blank");
    }
    toast.success("Pedido enviado ✨");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-2xl">Carrinho</DialogTitle></DialogHeader>
        {items.length === 0 ? <p className="text-center text-muted-foreground py-8">Vazio.</p> : (
          <>
            <div className="space-y-2 mb-4">
              {items.map(i => (
                <div key={i.eventProductId} className="flex items-center gap-2 glass rounded-lg p-2">
                  {i.imageUrl && <img src={i.imageUrl} className="w-12 h-12 rounded object-cover" alt="" />}
                  <div className="flex-1 min-w-0"><div className="text-sm truncate">{i.name}</div><div className="text-xs text-primary">R$ {i.price.toFixed(2)}</div></div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => cart.setQty(event.id, i.eventProductId, i.qty - 1)}><Minus className="w-3 h-3" /></Button>
                    <span className="w-6 text-center text-sm">{i.qty}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => cart.setQty(event.id, i.eventProductId, i.qty + 1)}><Plus className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => cart.remove(event.id, i.eventProductId)}><Trash className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-display text-xl mb-4"><span>Total</span><span className="text-gradient-gold">R$ {total.toFixed(2)}</span></div>
            <div className="space-y-2">
              <Input placeholder="Seu nome *" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input placeholder="E-mail (opcional)" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Textarea placeholder="Mensagem para a noiva (opcional)" value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} />
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <Button onClick={() => checkout("card")} disabled={busy} className="w-full bg-primary text-primary-foreground">💳 Pagar com cartão</Button>
              {event.whatsapp_number && <Button onClick={() => checkout("wa")} disabled={busy} className="w-full bg-[#25D366] hover:bg-[#1faa55] text-white"><MessageCircle className="w-4 h-4 mr-1" />Combinar pelo WhatsApp</Button>}
              <Button onClick={() => checkout("register")} disabled={busy} variant="outline" className="w-full">Apenas registrar presente</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
