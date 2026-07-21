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
import { DEFAULT_SIZES } from "@/lib/variantDefaults";

export const Route = createFileRoute("/n/$slug")({
  component: PublicBride,
  validateSearch: (s: Record<string, unknown>) => ({ t: (s.t as string) || undefined, paid: (s.paid as string) || undefined }),
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="glass rounded-3xl p-10 max-w-md text-center space-y-4">
        <h1 className="font-display text-3xl">Ops, algo deu errado</h1>
        <p className="text-sm text-muted-foreground break-words">{error?.message || "Erro ao carregar a página."}</p>
        <Button onClick={reset}>Tentar novamente</Button>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="glass rounded-3xl p-10 max-w-md text-center">
        <h1 className="font-display text-3xl mb-2">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">Verifique o link recebido.</p>
      </div>
    </div>
  ),
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} · Lista de presentes · Privê` },
      { name: "description", content: "Presenteie com carinho. Lista de presentes exclusiva no Privê." },
      { property: "og:title", content: `Lista de presentes · Privê` },
      { property: "og:description", content: "Presenteie com carinho." },
    ],
  }),
});


function PublicBride() {
  const { slug } = useParams({ from: "/n/$slug" });
  const { t: token, paid } = useSearch({ from: "/n/$slug" });
  const { user, isAdmin } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessOk, setAccessOk] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    (async () => {
      // Public-safe read (no manage_token, secret_code, contact info)
      const { data: pubRows } = await supabase.rpc("get_public_event_by_slug", { _slug: slug });
      let ev: any = Array.isArray(pubRows) ? pubRows[0] : pubRows;

      // Owner/admin can also fetch full row directly (RLS-gated)
      if (user) {
        const { data: full } = await supabase.from("events").select("*").eq("slug", slug).maybeSingle();
        if (full) ev = full;
      }
      setEvent(ev);
      if (ev) {
        const isOwner = user && ev.owner_id === user.id;
        let allowed = false;
        if (ev.visibility === "public" || isOwner || isAdmin) {
          allowed = true;
        } else if (token) {
          const { data: ok } = await supabase.rpc("validate_invite_token", { _event_id: ev.id, _token: token });
          allowed = !!ok;
        }
        setAccessOk(allowed);

        if (allowed) {
          // Use SECURITY DEFINER RPC that validates token/visibility and
          // returns the full nested product (variants + images).
          const { data: epData } = await supabase.rpc("get_event_products_for_guest", {
            _event_id: ev.id,
            _token: token ?? null,
          });
          setItems(Array.isArray(epData) ? epData : []);
        }
      }
      setLoading(false);
      if (paid === "1") toast.success(ev?.thank_you_message || "Pagamento confirmado. Obrigada pelo carinho! 💝");
    })();
  }, [slug, user, isAdmin, token, paid]);

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
            <img src={event.banner_url} alt="" loading="eager" fetchPriority="high" className="w-full h-full object-cover opacity-40" />
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
        <CartFab eventId={event.id} onClick={() => setCartOpen(true)} />
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

const EMPTY_CART: any[] = [];
function CartFab({ eventId, onClick }: { eventId: string; onClick: () => void }) {
  const items = useCart((s) => s.items[eventId] ?? EMPTY_CART);
  const count = items.reduce((s, i) => s + i.qty, 0);
  return (
    <Button onClick={onClick} className="fixed bottom-6 right-6 z-30 rounded-full h-14 w-14 shadow-glow bg-gradient-to-r from-primary to-accent text-primary-foreground" size="icon">
      <ShoppingBag className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-background text-primary border border-primary text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
          {count}
        </span>
      )}
    </Button>
  );
}


function WishCard({ item, eventId, delay }: any) {
  const add = useCart((s) => s.add);
  const remaining = (item.desired_qty || 0) - (item.purchased_qty || 0);
  const giftSold = remaining <= 0;
  const p = item.product;
  if (!p) return null;

  const variants: any[] = p.variants || [];
  const images: any[] = p.images || [];
  const colors = Array.from(new Set(variants.map((v) => v.color_name).filter(Boolean))) as string[];
  const sizesByColor = (color: string | null) =>
    Array.from(new Set(
      variants.filter((v) => !color || v.color_name === color).map((v) => v.size).filter(Boolean)
    )) as string[];

  const [color, setColor] = useState<string | null>(colors[0] || null);
  const [size, setSize] = useState<string | null>(null);

  const colorImages = color ? images.filter((i) => i.color_name === color) : [];
  const generalImages = images.filter((i) => !i.color_name);
  const visibleImage = colorImages[0]?.url || generalImages[0]?.url || p.image_url;

  const colorHex = (c: string) => variants.find((v) => v.color_name === c)?.color_hex || "#cccccc";

  const dbSizes = sizesByColor(color);
  const sizesFromDb = dbSizes.length > 0;
  const sizes = sizesFromDb ? dbSizes : [...DEFAULT_SIZES];

  const selectedVariant = variants.find(
    (v) => (!color || v.color_name === color) && (!sizesFromDb || !size || v.size === size)
  );
  const finalPrice = Number(selectedVariant?.price_override ?? p.price);

  const needsSize = sizes.length > 0 && !size;
  const needsColor = colors.length > 0 && !color;

  // stock from selected variant (null = não controlado)
  const variantStock = selectedVariant?.stock;
  const variantOutOfStock = variantStock !== null && variantStock !== undefined && variantStock <= 0;
  const sold = giftSold || variantOutOfStock;
  const maxQty = Math.min(
    remaining > 0 ? remaining : 0,
    variantStock != null ? Number(variantStock) : Number.POSITIVE_INFINITY
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="glass rounded-2xl overflow-hidden hover-lift group"
    >
      <div className="aspect-square bg-secondary overflow-hidden relative">
        {visibleImage ? <img src={visibleImage} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition duration-700" /> : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />}
        {sold && <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
          <span className="text-xs uppercase tracking-wider px-3 py-1 rounded-full glass">{variantOutOfStock && !giftSold ? "Sem estoque" : "Presenteado"}</span>
        </div>}
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-medium truncate">{p.name}</h3>
        <div className="text-primary font-display text-xl">R$ {finalPrice.toFixed(2)}</div>

        {colors.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {colors.map((c) => {
              // available if any variant of this color has stock > 0 OR stock is null (uncontrolled)
              const anyAvail = variants.some((v) => v.color_name === c && (v.stock == null || v.stock > 0));
              return (
                <button
                  key={c}
                  onClick={() => { setColor(c); setSize(null); }}
                  title={c + (anyAvail ? "" : " (esgotado)")}
                  disabled={!anyAvail}
                  className={`w-6 h-6 rounded-full border-2 transition ${color === c ? "border-primary scale-110" : "border-border"} ${!anyAvail ? "opacity-30 line-through" : ""}`}
                  style={{ background: colorHex(c) }}
                />
              );
            })}
          </div>
        )}

        {sizes.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {sizes.map((s) => {
              const sVariant = sizesFromDb ? variants.find((v) => (!color || v.color_name === color) && v.size === s) : null;
              const sOut = sVariant && sVariant.stock != null && sVariant.stock <= 0;
              return (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  disabled={!!sOut}
                  className={`text-[10px] uppercase px-2 py-0.5 rounded border transition ${size === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"} ${sOut ? "opacity-30 line-through" : ""}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        )}

        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {giftSold ? "esgotado" : variantOutOfStock ? "sem estoque desta variação" :
            (variantStock != null ? `${variantStock} em estoque · ` : "") +
            `${remaining} disponível${remaining > 1 ? "is" : ""} na lista`}
        </div>
        <Button
          size="sm"
          disabled={sold || needsColor || needsSize}
          onClick={() => {
            const label = [color, size].filter(Boolean).join(" · ") || null;
            add(eventId, {
              eventProductId: item.id,
              productId: p.id,
              name: p.name,
              price: finalPrice,
              imageUrl: visibleImage,
              qty: 1,
              maxQty: Number.isFinite(maxQty) ? Math.max(1, maxQty) : remaining,
              variantId: selectedVariant?.id || null,
              variantLabel: label,
            });
            toast.success("Adicionado ao carrinho");
          }}
          className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground"
        >
          <Plus className="w-3 h-3 mr-1" />
          {needsColor ? "Escolha uma cor" : needsSize ? "Escolha o tamanho" : "Presentear"}
        </Button>
      </div>
    </motion.div>
  );
}

function CartDialog({ open, onOpenChange, event }: any) {
  const items = useCart((s) => s.items[event.id] ?? EMPTY_CART);
  const clearCart = useCart((s) => s.clear);
  const setQty = useCart((s) => s.setQty);
  const removeItem = useCart((s) => s.remove);
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
      product_name: i.variantLabel ? `${i.name} — ${i.variantLabel}` : i.name,
      qty: i.qty, unit_price: i.price,
      variant_id: i.variantId || null, variant_label: i.variantLabel || null,
    })));

    if (mode === "card") {
      const { data, error: fnErr } = await supabase.functions.invoke("create-checkout", {
        body: { order_id: order.id, success_url: window.location.href + "?paid=1", cancel_url: window.location.href },
      });
      setBusy(false);
      if (fnErr || !data?.url) return toast.error(fnErr?.message || "Falha ao iniciar pagamento");
      clearCart(event.id);
      window.location.href = data.url;
      return;
    }

    clearCart(event.id);
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
                <div key={`${i.eventProductId}::${i.variantId || ""}`} className="flex items-center gap-2 glass rounded-lg p-2">
                  {i.imageUrl && <img src={i.imageUrl} loading="lazy" className="w-12 h-12 rounded object-cover" alt="" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{i.name}</div>
                    {i.variantLabel && <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{i.variantLabel}</div>}
                    <div className="text-xs text-primary">R$ {i.price.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setQty(event.id, i.eventProductId, i.qty - 1, i.variantId)}><Minus className="w-3 h-3" /></Button>
                    <span className="w-6 text-center text-sm">{i.qty}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setQty(event.id, i.eventProductId, i.qty + 1, i.variantId)}><Plus className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeItem(event.id, i.eventProductId, i.variantId)}><Trash className="w-3 h-3" /></Button>
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
