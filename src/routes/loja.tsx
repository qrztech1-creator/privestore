import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useShopCart } from "@/lib/shopCart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { Heart, ShoppingBag, Bell, Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/loja")({
  component: LojaPage,
  head: () => ({
    meta: [
      { title: "Loja Privê — Lingerie exclusiva" },
      { name: "description", content: "Descubra nossa coleção completa. Peças íntimas para momentos especiais." },
      { property: "og:title", content: "Loja Privê" },
      { property: "og:description", content: "Lingerie exclusiva com envio para todo o Brasil." },
    ],
  }),
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="glass rounded-3xl p-10 max-w-md text-center space-y-4">
        <h1 className="font-display text-3xl">Ops, algo deu errado</h1>
        <p className="text-sm text-muted-foreground break-words">{error?.message}</p>
        <Button onClick={reset}>Tentar novamente</Button>
      </div>
    </div>
  ),
});

function LojaPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lineFilter, setLineFilter] = useState<string>("all");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const cartCount = useShopCart((s) => s.items.reduce((a, b) => a + b.qty, 0));

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_shop_catalog");
      setProducts(Array.isArray(data) ? data : []);
      setLoading(false);
      if (user) {
        const { data: favs } = await supabase.from("shop_favorites").select("product_id").eq("user_id", user.id);
        setFavorites(new Set((favs ?? []).map((f: any) => f.product_id)));
      }
    })();
  }, [user]);

  const lines = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => p.line_id && p.line_name && map.set(p.line_id, p.line_name));
    return Array.from(map.entries());
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (lineFilter !== "all" && p.line_id !== lineFilter) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, search, lineFilter]);

  async function toggleFav(pid: string) {
    if (!user) return toast.error("Entre com sua conta para favoritar");
    if (favorites.has(pid)) {
      await supabase.from("shop_favorites").delete().eq("user_id", user.id).eq("product_id", pid);
      const s = new Set(favorites); s.delete(pid); setFavorites(s);
    } else {
      await supabase.from("shop_favorites").insert({ user_id: user.id, product_id: pid });
      setFavorites(new Set([...favorites, pid]));
      toast.success("Favoritado ♡");
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 glass border-b border-border/30 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/"><Logo className="h-8" /></Link>
          <div className="flex-1 relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar peças..." className="pl-9" />
          </div>
          <Link to="/loja/carrinho">
            <Button variant="outline" size="sm" className="relative">
              <ShoppingBag className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">{cartCount}</span>
              )}
            </Button>
          </Link>
        </div>
        {lines.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
            <button onClick={() => setLineFilter("all")} className={`text-xs uppercase tracking-wider px-3 py-1 rounded-full border whitespace-nowrap ${lineFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>Todas</button>
            {lines.map(([id, name]) => (
              <button key={id} onClick={() => setLineFilter(id)} className={`text-xs uppercase tracking-wider px-3 py-1 rounded-full border whitespace-nowrap ${lineFilter === id ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>{name}</button>
            ))}
          </div>
        )}
      </header>

      <section className="px-4 sm:px-6 py-8 max-w-7xl mx-auto">
        {loading ? (
          <p className="text-center text-muted-foreground py-12">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nenhum produto encontrado.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p, i) => (
              <ShopCard key={p.id} product={p} delay={i * 0.03} isFavorite={favorites.has(p.id)} onToggleFav={() => toggleFav(p.id)} user={user} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ShopCard({ product, delay, isFavorite, onToggleFav, user }: any) {
  const add = useShopCart((s) => s.add);
  const variants: any[] = product.variants || [];
  const images: any[] = product.images || [];
  const colors = Array.from(new Set(variants.map((v) => v.color_name).filter(Boolean))) as string[];
  const [color, setColor] = useState<string | null>(colors[0] || null);
  const [size, setSize] = useState<string | null>(null);
  const sizes = Array.from(new Set(variants.filter((v) => !color || v.color_name === color).map((v) => v.size).filter(Boolean))) as string[];

  const colorImages = color ? images.filter((i) => i.color_name === color) : [];
  const generalImages = images.filter((i) => !i.color_name);
  const img = colorImages[0]?.url || generalImages[0]?.url || product.image_url;

  const selectedVariant = variants.find((v) => (!color || v.color_name === color) && (!size || v.size === size));
  const price = Number(selectedVariant?.price_override ?? product.price);
  const stock = selectedVariant?.stock;
  const outOfStock = stock != null && stock <= 0;
  const needsSize = sizes.length > 0 && !size;
  const needsColor = colors.length > 0 && !color;

  async function joinWaitlist() {
    const email = user?.email || prompt("Deixe seu email pra avisarmos quando chegar:");
    if (!email) return;
    const { error } = await supabase.from("shop_waitlist").insert({
      user_id: user?.id || null, email,
      product_id: product.id, variant_id: selectedVariant?.id || null,
    });
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    toast.success("Você será avisado assim que chegar 🔔");
  }

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay }} className="glass rounded-2xl overflow-hidden group">
      <div className="aspect-square bg-secondary overflow-hidden relative">
        {img ? <img src={img} alt={product.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /> : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />}
        <button onClick={onToggleFav} className="absolute top-2 right-2 bg-background/70 backdrop-blur rounded-full p-2 hover:scale-110 transition">
          <Heart className={`w-4 h-4 ${isFavorite ? "fill-primary text-primary" : "text-muted-foreground"}`} />
        </button>
        {outOfStock && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <span className="text-xs uppercase tracking-wider px-3 py-1 rounded-full glass">Esgotado</span>
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-primary/70">{product.line_name || product.category_name || ""}</div>
        <h3 className="font-medium text-sm truncate">{product.name}</h3>
        <div className="text-primary font-display text-lg">R$ {price.toFixed(2)}</div>
        {colors.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {colors.map((c) => {
              const avail = variants.some((v) => v.color_name === c && (v.stock == null || v.stock > 0));
              const hex = variants.find((v) => v.color_name === c)?.color_hex || "#ccc";
              return (
                <button key={c} onClick={() => { setColor(c); setSize(null); }} disabled={!avail} title={c}
                  className={`w-5 h-5 rounded-full border-2 ${color === c ? "border-primary scale-110" : "border-border"} ${!avail ? "opacity-30" : ""}`}
                  style={{ background: hex }} />
              );
            })}
          </div>
        )}
        {sizes.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {sizes.map((s) => {
              const sv = variants.find((v) => (!color || v.color_name === color) && v.size === s);
              const so = sv && sv.stock != null && sv.stock <= 0;
              return (
                <button key={s} onClick={() => setSize(s)} disabled={!!so}
                  className={`text-[10px] uppercase px-2 py-0.5 rounded border ${size === s ? "bg-primary text-primary-foreground border-primary" : "border-border"} ${so ? "opacity-30 line-through" : ""}`}>{s}</button>
              );
            })}
          </div>
        )}
        {outOfStock ? (
          <Button size="sm" variant="outline" onClick={joinWaitlist} className="w-full text-xs">
            <Bell className="w-3 h-3 mr-1" />Avise-me quando chegar
          </Button>
        ) : (
          <Button size="sm" disabled={needsColor || needsSize} onClick={() => {
            const label = [color, size].filter(Boolean).join(" · ") || null;
            add({
              productId: product.id, variantId: selectedVariant?.id || null,
              name: product.name, variantLabel: label, price, imageUrl: img, qty: 1,
              maxQty: stock != null ? Number(stock) : 99,
            });
            toast.success("Adicionado ao carrinho");
          }} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs">
            <Plus className="w-3 h-3 mr-1" />{needsColor ? "Escolha cor" : needsSize ? "Escolha tamanho" : "Comprar"}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
