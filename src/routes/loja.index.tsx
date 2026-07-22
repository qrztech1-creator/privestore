import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useShopCart } from "@/lib/shopCart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import {
  Heart, ShoppingBag, Bell, Search, Plus, MessageCircle,
  Truck, ShieldCheck, Sparkles, RefreshCw, Instagram, Mail, ArrowRight, Star,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { DEFAULT_SIZES } from "@/lib/variantDefaults";
import { ProductModal } from "@/components/ProductModal";

const STORE_WHATSAPP = (import.meta.env.VITE_STORE_WHATSAPP as string) || "5511999999999";

export const Route = createFileRoute("/loja/")({
  component: LojaPage,
  head: () => ({
    meta: [
      { title: "Privê — Lingerie de autor, feita para você" },
      { name: "description", content: "Coleções autorais em renda, seda e cetim. Peças íntimas com envio para todo o Brasil. PIX com desconto." },
      { property: "og:title", content: "Privê — Lingerie de autor" },
      { property: "og:description", content: "Lingerie exclusiva, envio Brasil, PIX 5% OFF." },
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [lineFilter, setLineFilter] = useState<string>("all");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [modalProduct, setModalProduct] = useState<any | null>(null);
  const cartCount = useShopCart((s) => s.items.reduce((a, b) => a + b.qty, 0));
  const searchWrapRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!searchWrapRef.current?.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const lines = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => p.line_id && p.line_name && map.set(p.line_id, p.line_name));
    return Array.from(map.entries());
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (lineFilter !== "all" && p.line_id !== lineFilter) return false;
      return true;
    });
  }, [products, lineFilter]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => {
        const hay = `${p.name || ""} ${p.line_name || ""} ${p.category_name || ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8);
  }, [products, search]);

  const featured = useMemo(() => products.slice(0, 4), [products]);

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

  const waHref = `https://wa.me/${STORE_WHATSAPP.replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Vim da loja Privê 💌")}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Announcement bar */}
      <div className="bg-primary text-primary-foreground text-[11px] sm:text-xs tracking-[0.2em] uppercase py-2 text-center">
        <span className="opacity-80">Frete grátis acima de R$ 299</span>
        <span className="mx-3 opacity-40">·</span>
        <span>PIX com 5% OFF</span>
        <span className="mx-3 opacity-40 hidden sm:inline">·</span>
        <span className="hidden sm:inline opacity-80">Entrega discreta em todo Brasil</span>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="shrink-0"><Logo className="h-9" /></Link>
          <nav className="hidden md:flex items-center gap-6 text-[13px] tracking-wider uppercase text-foreground/70">
            <a href="#colecoes" className="hover:text-primary transition">Coleções</a>
            <a href="#linhas" className="hover:text-primary transition">Linhas</a>
            <a href="#destaques" className="hover:text-primary transition">Destaques</a>
            <a href="#historia" className="hover:text-primary transition">Sobre</a>
          </nav>
          <div ref={searchWrapRef} className="flex-1 relative max-w-xs ml-auto">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Buscar peças..."
              className="pl-9 h-9 bg-secondary/60 border-border/50"
            />
            {searchOpen && search.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/60 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">Nada encontrado para "{search}"</div>
                ) : (
                  <ul className="py-1">
                    {searchResults.map((p) => (
                      <li key={p.id}>
                        <button
                          onClick={() => { setModalProduct(p); setSearchOpen(false); setSearch(""); }}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-secondary/60 text-left transition"
                        >
                          <div className="w-12 h-14 rounded-md bg-secondary overflow-hidden shrink-0">
                            {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{p.name}</div>
                            <div className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">
                              {p.line_name || p.category_name || "Coleção"}
                            </div>
                          </div>
                          <div className="text-primary text-sm font-display shrink-0">R$ {Number(p.price).toFixed(2)}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <Link to="/loja/carrinho">
            <Button variant="outline" size="sm" className="relative border-border/60">
              <ShoppingBag className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">{cartCount}</span>
              )}
            </Button>
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-secondary via-background to-accent/30" />
        <div className="absolute inset-0 -z-10 opacity-40" style={{
          backgroundImage: "radial-gradient(circle at 15% 20%, oklch(0.78 0.075 35 / 0.35), transparent 40%), radial-gradient(circle at 85% 80%, oklch(0.36 0.09 22 / 0.25), transparent 45%)",
        }} />
        <div className="max-w-7xl mx-auto px-4 py-16 sm:py-24 grid lg:grid-cols-2 gap-10 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-[11px] uppercase tracking-[0.25em] text-primary mb-6">
              <Sparkles className="w-3 h-3" />Nova coleção · Verão 2026
            </div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[0.95] mb-6">
              Sedução <span className="italic text-gradient-gold">íntima,</span>
              <br />feita à mão.
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-lg mb-8">
              Peças autorais em renda francesa, seda e cetim — desenhadas para mulheres que sabem o que querem vestir por baixo.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#colecoes">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 tracking-wider uppercase text-xs">
                  Comprar agora<ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
              <a href="#linhas">
                <Button size="lg" variant="outline" className="border-primary/30 text-primary hover:bg-primary/5 px-8 h-12 tracking-wider uppercase text-xs">
                  Ver linhas
                </Button>
              </a>
              <a href={waHref} target="_blank" rel="noreferrer">
                <Button size="lg" variant="ghost" className="text-foreground/70 hover:text-primary px-4 h-12 tracking-wider uppercase text-xs">
                  <MessageCircle className="w-4 h-4 mr-2" />Consultora
                </Button>
              </a>
            </div>
            <div className="flex items-center gap-6 mt-10 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((i) => <Star key={i} className="w-3.5 h-3.5 fill-gold text-gold" />)}
              </div>
              <span>+2.400 clientes apaixonadas</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.1 }} className="relative">
            <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/30 to-gold/20" />
              {featured[0]?.image_url ? (
                <img src={featured[0].image_url} alt={featured[0].name} className="w-full h-full object-cover" />
              ) : null}
              <div className="absolute bottom-6 left-6 right-6 glass rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Sparkles className="w-4 h-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Editor's pick</div>
                  <div className="font-display text-lg truncate">{featured[0]?.name || "Peça do momento"}</div>
                </div>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 w-28 h-28 rounded-full bg-primary text-primary-foreground flex flex-col items-center justify-center text-center font-display shadow-xl rotate-12">
              <span className="text-2xl leading-none">-15%</span>
              <span className="text-[9px] uppercase tracking-widest mt-1">1ª compra</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="border-y border-border/40 bg-secondary/40">
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          {[
            { Icon: Truck, t: "Envio discreto", s: "Para todo Brasil" },
            { Icon: ShieldCheck, t: "Pagamento seguro", s: "PIX, cartão ou WhatsApp" },
            { Icon: RefreshCw, t: "Troca fácil", s: "Até 7 dias" },
            { Icon: Sparkles, t: "Peças autorais", s: "Produção limitada" },
          ].map(({ Icon, t, s }) => (
            <div key={t} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shrink-0 border border-border/50">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="font-medium">{t}</div>
                <div className="text-xs text-muted-foreground">{s}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Linhas */}
      {lines.length > 0 && (
        <section id="linhas" className="max-w-7xl mx-auto px-4 py-16">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-primary/70 mb-2">Nossas linhas</div>
              <h2 className="font-display text-4xl sm:text-5xl">Escolha o seu <em className="text-gradient-gold not-italic">humor</em></h2>
            </div>
            <button onClick={() => { setLineFilter("all"); document.getElementById("colecoes")?.scrollIntoView({ behavior: "smooth" }); }} className="text-xs uppercase tracking-wider text-primary underline underline-offset-4">
              Ver tudo →
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {lines.slice(0, 8).map(([id, name], i) => {
              const sample = products.find((p) => p.line_id === id);
              return (
                <motion.button
                  key={id}
                  initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  onClick={() => { setLineFilter(id); document.getElementById("colecoes")?.scrollIntoView({ behavior: "smooth" }); }}
                  className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-secondary border border-border/40"
                >
                  {sample?.image_url ? (
                    <img src={sample.image_url} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" alt={name} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <div className="text-[10px] uppercase tracking-widest opacity-70">Linha</div>
                    <div className="font-display text-2xl">{name}</div>
                    <div className="mt-2 inline-flex items-center gap-1 text-[11px] uppercase tracking-wider opacity-90 group-hover:opacity-100">
                      Explorar <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>
      )}

      {/* Destaques */}
      {featured.length > 0 && (
        <section id="destaques" className="bg-secondary/40 border-y border-border/40">
          <div className="max-w-7xl mx-auto px-4 py-16">
            <div className="mb-8">
              <div className="text-[11px] uppercase tracking-[0.3em] text-primary/70 mb-2">Editor's picks</div>
              <h2 className="font-display text-4xl sm:text-5xl">As mais desejadas</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {featured.map((p, i) => (
                <ShopCard key={p.id} product={p} delay={i * 0.03} isFavorite={favorites.has(p.id)} onToggleFav={() => toggleFav(p.id)} onOpen={() => setModalProduct(p)} user={user} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Coleção completa */}
      <section id="colecoes" className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-primary/70 mb-2">Coleção</div>
            <h2 className="font-display text-4xl sm:text-5xl">
              {lineFilter === "all" ? "Todas as peças" : lines.find(([id]) => id === lineFilter)?.[1] || "Coleção"}
            </h2>
          </div>
          <div className="text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "peça" : "peças"}</div>
        </div>

        {lines.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6 -mx-4 px-4">
            <button onClick={() => setLineFilter("all")} className={`text-[11px] uppercase tracking-widest px-4 py-2 rounded-full border whitespace-nowrap transition ${lineFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border/60 hover:border-primary/50"}`}>Todas</button>
            {lines.map(([id, name]) => (
              <button key={id} onClick={() => setLineFilter(id)} className={`text-[11px] uppercase tracking-widest px-4 py-2 rounded-full border whitespace-nowrap transition ${lineFilter === id ? "bg-primary text-primary-foreground border-primary" : "border-border/60 hover:border-primary/50"}`}>{name}</button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-center text-muted-foreground py-12">Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 glass rounded-3xl">
            <p className="text-muted-foreground mb-4">Nada encontrado por aqui.</p>
            <Button variant="outline" onClick={() => { setSearch(""); setLineFilter("all"); }}>Limpar filtros</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p, i) => (
              <ShopCard key={p.id} product={p} delay={i * 0.03} isFavorite={favorites.has(p.id)} onToggleFav={() => toggleFav(p.id)} onOpen={() => setModalProduct(p)} user={user} />
            ))}
          </div>
        )}
      </section>

      {/* História / CTA band */}
      <section id="historia" className="relative overflow-hidden bg-primary">
        <div className="absolute inset-0 opacity-25 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle at 20% 30%, oklch(0.74 0.10 70 / 0.6), transparent 40%), radial-gradient(circle at 80% 70%, oklch(0.78 0.075 35 / 0.5), transparent 45%)",
        }} />
        <div className="relative max-w-6xl mx-auto px-4 py-20 text-center text-primary-foreground">
          <div className="text-[11px] uppercase tracking-[0.3em] opacity-70 mb-4">Nossa história</div>
          <h2 className="font-display text-4xl sm:text-6xl leading-tight max-w-3xl mx-auto mb-6">
            Cada peça nasce de um <em className="italic">ritual</em> — de mãos que costuram devagar.
          </h2>
          <p className="max-w-xl mx-auto opacity-80 mb-8">
            A Privê é um ateliê. Trabalhamos com tiragens pequenas, tecidos escolhidos a dedo e um compromisso: fazer você se sentir como a versão mais sua.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href={waHref} target="_blank" rel="noreferrer">
              <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 px-8 h-12 tracking-wider uppercase text-xs">
                <MessageCircle className="w-4 h-4 mr-2" />Falar com consultora
              </Button>
            </a>
            <a href="#colecoes">
              <Button size="lg" variant="outline" className="border-primary-foreground/50 bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary px-8 h-12 tracking-wider uppercase text-xs">
                Explorar coleção
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="text-[11px] uppercase tracking-[0.3em] text-primary/70 mb-3">Lista de espera</div>
        <h3 className="font-display text-3xl sm:text-4xl mb-3">Seja a primeira a saber</h3>
        <p className="text-muted-foreground mb-6">Lançamentos, drops limitados e convites secretos.</p>
        <form onSubmit={(e) => { e.preventDefault(); toast.success("Bem-vinda 💌"); }} className="flex gap-2 max-w-md mx-auto">
          <Input placeholder="seu@email.com" type="email" className="h-12" />
          <Button className="h-12 px-6 tracking-wider uppercase text-xs">Assinar</Button>
        </form>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 py-12 grid sm:grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div>
            <Logo className="h-8 mb-3" />
            <p className="text-xs text-muted-foreground">Lingerie de autor. Feita devagar, para durar.</p>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-primary/70 mb-3">Navegar</div>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#colecoes" className="hover:text-primary">Coleções</a></li>
              <li><a href="#linhas" className="hover:text-primary">Linhas</a></li>
              <li><a href="#destaques" className="hover:text-primary">Destaques</a></li>
              <li><Link to="/loja/carrinho" className="hover:text-primary">Carrinho</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-primary/70 mb-3">Ajuda</div>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href={waHref} target="_blank" rel="noreferrer" className="hover:text-primary">Atendimento</a></li>
              <li>Trocas & devoluções</li>
              <li>Envios</li>
              <li>Guia de tamanhos</li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-primary/70 mb-3">Contato</div>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2"><MessageCircle className="w-3 h-3" />WhatsApp</li>
              <li className="flex items-center gap-2"><Instagram className="w-3 h-3" />@priveloja</li>
              <li className="flex items-center gap-2"><Mail className="w-3 h-3" />contatopriveloja@gmail.com</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/40 py-4 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Privê — Todos os direitos reservados
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <a
        href={waHref}
        target="_blank"
        rel="noreferrer"
        aria-label="Falar no WhatsApp"
        className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-2xl hover:scale-110 transition"
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" />
        <MessageCircle className="w-6 h-6 relative" />
      </a>
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
  const dbSizes = Array.from(new Set(variants.filter((v) => !color || v.color_name === color).map((v) => v.size).filter(Boolean))) as string[];
  const sizes = dbSizes.length > 0 ? dbSizes : [...DEFAULT_SIZES];
  const sizesFromDb = dbSizes.length > 0;

  const colorImages = color ? images.filter((i) => i.color_name === color) : [];
  const generalImages = images.filter((i) => !i.color_name);
  const img = colorImages[0]?.url || generalImages[0]?.url || product.image_url;

  const selectedVariant = variants.find((v) => (!color || v.color_name === color) && (!sizesFromDb || !size || v.size === size));
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
    <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay }} className="bg-card rounded-2xl overflow-hidden group border border-border/40 hover:border-primary/40 hover:shadow-xl transition">
      <div className="aspect-[4/5] bg-secondary overflow-hidden relative">
        {img ? <img src={img} alt={product.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /> : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />}
        <button onClick={onToggleFav} className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-full p-2 hover:scale-110 transition">
          <Heart className={`w-4 h-4 ${isFavorite ? "fill-primary text-primary" : "text-muted-foreground"}`} />
        </button>
        {outOfStock && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <span className="text-xs uppercase tracking-wider px-3 py-1 rounded-full glass">Esgotado</span>
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-primary/70">{product.line_name || product.category_name || ""}</div>
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
              const sv = sizesFromDb ? variants.find((v) => (!color || v.color_name === color) && v.size === s) : null;
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
          }} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs tracking-wider uppercase">
            <Plus className="w-3 h-3 mr-1" />{needsColor ? "Escolha cor" : needsSize ? "Escolha tamanho" : "Comprar"}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
