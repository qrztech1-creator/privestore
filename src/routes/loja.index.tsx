import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useShopCart } from "@/lib/shopCart";
import { useFavorites } from "@/lib/favorites";
import { useRecentlyViewed } from "@/lib/recentlyViewed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import {
  Heart, ShoppingBag, Bell, Search, Plus, MessageCircle,
  Truck, ShieldCheck, Sparkles, RefreshCw, Instagram, Mail, ArrowRight, Star,
  User, LogOut, X, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { DEFAULT_SIZES } from "@/lib/variantDefaults";
import { ProductModal } from "@/components/ProductModal";
import { CustomerAuthModal } from "@/components/CustomerAuthModal";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STORE_WHATSAPP = (import.meta.env.VITE_STORE_WHATSAPP as string) || "5527992042450";

export const Route = createFileRoute("/loja/")({
  component: LojaPage,
  head: () => ({
    meta: [
      { title: "Privê — Lingerie de autor, feita para você" },
      { name: "description", content: "Coleções autorais em renda, seda e cetim. Peças íntimas com envio para todo o Brasil. Atendimento exclusivo via WhatsApp." },
      { property: "og:title", content: "Privê — Lingerie de autor" },
      { property: "og:description", content: "Lingerie exclusiva, envio Brasil, atendimento via WhatsApp." },
      { property: "og:image", content: "https://prive.qrztech.com/og-image.jpg" },
      { property: "og:image:secure_url", content: "https://prive.qrztech.com/og-image.jpg" },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:image", content: "https://prive.qrztech.com/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [lineFilter, setLineFilter] = useState<string>("all");
  const [modalProduct, setModalProduct] = useState<any | null>(null);
  
  // Customer Auth Modal state
  const [showAuthModal, setShowAuthModal] = useState(false);

  const cartCount = useShopCart((s) => s.items.reduce((a, b) => a + b.qty, 0));
  
  const favorites = useFavorites((s) => s.favorites);
  const initFavorites = useFavorites((s) => s.init);
  const toggleFavorite = useFavorites((s) => s.toggle);

  const recentlyViewedIds = useRecentlyViewed((s) => s.ids);
  const addRecentlyViewed = useRecentlyViewed((s) => s.add);

  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    // Safety timeout: never stay loading more than 12s
    const loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("[Loja] Catalog loading timeout, forcing loading=false");
        setLoading(false);
      }
    }, 12000);

    (async () => {
      try {
        // Attempt RPC call first (returns JSONB)
        const { data: rpcData, error: rpcErr } = await supabase.rpc("get_shop_catalog");

        // Parse JSONB: the RPC might return a single jsonb value, or an array
        let catalog: any[] = [];
        if (!rpcErr && rpcData) {
          if (Array.isArray(rpcData) && rpcData.length > 0) {
            catalog = rpcData;
          } else if (typeof rpcData === 'object' && !Array.isArray(rpcData)) {
            // If it's a single JSON object containing an array
            const parsed = Array.isArray(rpcData) ? rpcData : [];
            catalog = parsed;
          }
        }

        if (catalog.length > 0) {
          if (mounted) setProducts(catalog);
        } else {
          // Fallback: direct query to products table
          console.log("[Loja] RPC returned empty, using fallback query");
          const { data: rawProds, error: rawErr } = await supabase
            .from("products")
            .select("*, variants:product_variants(*), images:product_images(*)")
            .eq("active", true)
            .order("name");
          if (!rawErr && rawProds && rawProds.length > 0 && mounted) {
            setProducts(rawProds);
          } else if (mounted) {
            console.warn("[Loja] Fallback also empty/failed", rawErr);
            setProducts([]);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar catálogo da loja:", err);
        if (mounted) setProducts([]);
      } finally {
        if (mounted) setLoading(false);
        clearTimeout(loadingTimeout);
      }
    })();
    return () => { mounted = false; clearTimeout(loadingTimeout); };
  }, []);

  useEffect(() => {
    initFavorites(user?.id);
  }, [user, initFavorites]);

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

  // Destaque do topo da Home (Hero Banner Slider):
  // 1º slide: Baby Doll Amara na cor Rubi
  // 2º e 3º slides: Outros 2 bodys na tonalidade Rubi/Vermelho/Vinho (com a imagem dessa variação de cor)
  // 4º em diante: Aleatório determinístico (modelos e variações de cores misturados de forma constante, sem piscar no mobile)
  const bodyProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    
    // Pool de produtos para o destaque rotativo (bodys / lingeries)
    const pool = products.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const cat = (p.category_name || "").toLowerCase();
      const slug = (p.category_slug || "").toLowerCase();
      return cat.includes("body") || cat.includes("acessorios") || name.includes("body") || slug.includes("acessorios") || name.includes("amara");
    });
    
    const bodys = pool.length > 0 ? pool : products;

    // Helper determinístico para buscar imagem sem causar re-renders ou re-fetches
    const findProductImage = (p: any, colorKeywords?: string[]) => {
      const imgs = p.images || [];
      const vars = p.variants || [];
      
      if (colorKeywords && colorKeywords.length > 0) {
        for (const kw of colorKeywords) {
          const foundImg = imgs.find((i: any) => (i.color_name || "").toLowerCase().includes(kw));
          if (foundImg?.url) return foundImg.url;
        }
        for (const kw of colorKeywords) {
          const foundVar = vars.find((v: any) => (v.color_name || "").toLowerCase().includes(kw));
          if (foundVar?.image_url) return foundVar.image_url;
        }
      }
      
      const allImgs: string[] = [];
      if (p.image_url) allImgs.push(p.image_url);
      imgs.forEach((i: any) => i.url && allImgs.push(i.url));
      vars.forEach((v: any) => v.image_url && allImgs.push(v.image_url));

      const uniqueImgs = Array.from(new Set(allImgs));
      if (uniqueImgs.length > 0) {
        // Hash determinístico baseado no ID do produto (permanente, não muda entre re-renders)
        const hash = (p.id || "").split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        return uniqueImgs[hash % uniqueImgs.length];
      }
      return p.image_url;
    };

    // Função auxiliar para ordenação determinística (estável)
    const getHash = (id: string) => (id || "").split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);

    // 1. Buscar o Amara para garantir como 1º slide na cor Rubi
    const amaraRaw = bodys.find(p => (p.name || "").toLowerCase().includes("amara"));
    let amaraSlide = null;
    if (amaraRaw) {
      const rubiImg = findProductImage(amaraRaw, ["rubi", "vermelho", "vinho"]);
      amaraSlide = {
        ...amaraRaw,
        image_url: rubiImg || "https://images.tcdn.com.br/img/img_prod/794909/baby_doll_amara_4328_variacao_25668_4_b4852564e8bc544a4d3e8c4b5c3caa06.jpg"
      };
    }

    // 2. Buscar outros bodys que possuem opção de cor Rubi/Vermelho/Vinho (excluindo Amara)
    const rubiCandidates = bodys.filter((p) => {
      if (amaraRaw && p.id === amaraRaw.id) return false;
      const name = (p.name || "").toLowerCase();
      const vars = p.variants || [];
      const imgs = p.images || [];
      const hasRubiVar = vars.some((v: any) => 
        ["rubi", "vermelho", "vinho"].some(kw => (v.color_name || "").toLowerCase().includes(kw))
      );
      const hasRubiImg = imgs.some((i: any) => 
        ["rubi", "vermelho", "vinho"].some(kw => (i.color_name || "").toLowerCase().includes(kw))
      );
      return name.includes("rubi") || name.includes("vermelho") || name.includes("vinho") || hasRubiVar || hasRubiImg;
    });

    const rubiSlides = rubiCandidates.map((p) => ({
      ...p,
      image_url: findProductImage(p, ["rubi", "vermelho", "vinho"]) || p.image_url
    }));

    // Ordenar deterministicamente
    const sortedRubiSlides = [...rubiSlides].sort((a, b) => getHash(a.id) - getHash(b.id));
    const initialRubiItems = sortedRubiSlides.slice(0, amaraSlide ? 2 : 3);

    const usedIds = new Set<string>();
    if (amaraRaw) usedIds.add(amaraRaw.id);
    initialRubiItems.forEach(item => usedIds.add(item.id));

    // 3. Demais bodys/produtos para o restante da rotação
    const remainingProducts = bodys.filter(p => !usedIds.has(p.id));

    const randomSlides = remainingProducts.map((p) => ({
      ...p,
      image_url: findProductImage(p)
    }));

    const sortedRandom = [...randomSlides].sort((a, b) => getHash(b.id) - getHash(a.id));

    const finalSlides = [
      ...(amaraSlide ? [amaraSlide] : []),
      ...initialRubiItems,
      ...sortedRandom
    ];

    return finalSlides.length > 0 ? finalSlides : bodys;
  }, [products]);

  const [highlightIdx, setHighlightIdx] = useState(0);

  useEffect(() => {
    if (bodyProducts.length <= 1) return;
    const interval = setInterval(() => {
      setHighlightIdx((prev) => (prev + 1) % bodyProducts.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [bodyProducts]);

  // Precarregar imagens do hero banner para transição instantânea e sem piscadas no mobile
  useEffect(() => {
    if (!bodyProducts || bodyProducts.length === 0) return;
    bodyProducts.forEach((p: any) => {
      if (p?.image_url) {
        const img = new Image();
        img.src = p.image_url;
      }
    });
  }, [bodyProducts]);

  const currentHighlight = bodyProducts[highlightIdx] || featured[0] || products[0];

  const recentlyViewedProducts = useMemo(() => {
    if (!recentlyViewedIds || recentlyViewedIds.length === 0) return [];
    const map = new Map(products.map((p) => [p.id, p]));
    return recentlyViewedIds.map((id) => map.get(id)).filter(Boolean);
  }, [products, recentlyViewedIds]);

  async function handleToggleFav(pid: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    const wasFav = favorites.has(pid);
    await toggleFavorite(pid, user?.id);
    if (!wasFav) {
      toast.success("Adicionado aos favoritos ♡");
    } else {
      toast.info("Removido dos favoritos");
    }
  }

  function handleOpenModal(product: any) {
    setModalProduct(product);
    addRecentlyViewed(product.id);
  }

  const waHref = `https://wa.me/${STORE_WHATSAPP.replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Vim da loja Privê 💌")}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Announcement bar — Marquee 360° Infinito */}
      <div className="bg-primary text-primary-foreground text-[11px] sm:text-xs tracking-[0.2em] uppercase py-2.5 overflow-hidden whitespace-nowrap relative select-none">
        <div className="inline-flex animate-marquee gap-8 items-center font-medium">
          {[0, 1, 2, 3].flatMap((loopIdx) => [
            <span key={`a-${loopIdx}`} className="inline-flex items-center gap-2">
              🚚 FRETE GRÁTIS ACIMA DE R$ 299
            </span>,
            <span key={`sep1-${loopIdx}`} className="opacity-40">·</span>,
            <span key={`b-${loopIdx}`} className="inline-flex items-center gap-2">
              ✨ EXCLUSIVIDADE & ATENDIMENTO PERSONALIZADO
            </span>,
            <span key={`sep2-${loopIdx}`} className="opacity-40">·</span>,
            <span key={`c-${loopIdx}`} className="inline-flex items-center gap-2">
              📦 ENVIO DIRETO COM RASTREIO EM TODO BRASIL
            </span>,
            <span key={`sep3-${loopIdx}`} className="opacity-40">·</span>,
          ])}
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="shrink-0"><Logo className="h-18 md:h-24" /></Link>
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
          <div className="flex items-center gap-2 shrink-0">
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: "/painel", search: { tab: "favoritos" } })}
                className="border-border/60"
                title="Meus Favoritos"
              >
                <Heart className={`w-4 h-4 ${favorites.size > 0 ? "fill-primary text-primary" : ""}`} />
                {favorites.size > 0 && <span className="ml-1 text-xs font-bold">{favorites.size}</span>}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (user) {
                  navigate({ to: "/painel", search: { tab: "pedidos" } });
                } else {
                  setShowAuthModal(true);
                }
              }}
              className="border-border/60"
              title={user ? "Meu Painel" : "Entrar / Cadastrar"}
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline ml-1 text-xs truncate max-w-[110px]">
                {user ? (user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "Meu Painel") : "Entrar"}
              </span>
            </Button>

            <Link to="/loja/carrinho">
              <Button variant="outline" size="sm" className="relative border-border/60">
                <ShoppingBag className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">{cartCount}</span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-secondary via-background to-accent/30" />
        <div className="absolute inset-0 -z-10 opacity-40" style={{
          backgroundImage: "radial-gradient(circle at 15% 20%, oklch(0.78 0.075 35 / 0.35), transparent 40%), radial-gradient(circle at 85% 80%, oklch(0.36 0.09 22 / 0.25), transparent 45%)",
        }} />
        <div className="max-w-7xl mx-auto px-4 pt-4 pb-8 sm:pt-6 sm:pb-12 grid lg:grid-cols-2 gap-8 items-center">
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
            <div
              onClick={() => currentHighlight && handleOpenModal(currentHighlight)}
              className="relative aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl group cursor-pointer border border-border/40"
            >
              <div className="w-full h-full bg-secondary overflow-hidden relative">
                {currentHighlight?.image_url && (
                  <img
                    key={currentHighlight.image_url}
                    src={currentHighlight.image_url}
                    alt={currentHighlight?.name || "Lingerie Privê"}
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700 animate-in fade-in duration-500"
                  />
                )}
              </div>
              <div className="absolute bottom-6 left-6 right-6 glass rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Destaque · Body Privê</div>
                    <div className="font-display text-lg truncate text-foreground">{currentHighlight?.name || "Peça do momento"}</div>
                    {currentHighlight?.price && (
                      <div className="text-xs text-primary font-semibold">R$ {Number(currentHighlight.price).toFixed(2)}</div>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="text-xs shrink-0 border-primary/40 text-primary">
                  Ver peça
                </Button>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 w-28 h-28 rounded-full bg-primary text-primary-foreground flex flex-col items-center justify-center text-center font-display shadow-xl rotate-12">
              <Sparkles className="w-6 h-6 mb-1" />
              <span className="text-[10px] uppercase tracking-widest font-semibold">Exclusivo</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="border-y border-border/40 bg-secondary/40">
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          {[
            { Icon: Truck, t: "Envio Direto com Rastreio", s: "Para todo Brasil" },
            { Icon: ShieldCheck, t: "Atendimento exclusivo", s: "Direto no WhatsApp" },
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
                <ShopCard key={p.id} product={p} delay={i * 0.03} isFavorite={favorites.has(p.id)} onToggleFav={(e: any) => handleToggleFav(p.id, e)} onOpen={() => handleOpenModal(p)} user={user} />
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
              <ShopCard key={p.id} product={p} delay={i * 0.03} isFavorite={favorites.has(p.id)} onToggleFav={(e: any) => handleToggleFav(p.id, e)} onOpen={() => handleOpenModal(p)} user={user} />
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

      {/* VISTOS RECENTAMENTE */}
      {recentlyViewedProducts.length > 0 && (
        <section className="py-12 border-t border-border/30 bg-secondary/15">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="font-display text-2xl mb-6">Vistos Recentemente</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {recentlyViewedProducts.map((p: any) => (
                <div
                  key={p.id}
                  onClick={() => handleOpenModal(p)}
                  className="cursor-pointer bg-card rounded-xl p-2.5 border border-border/40 hover:border-primary/50 transition group"
                >
                  <div className="aspect-[3/4] rounded-lg bg-secondary overflow-hidden mb-2 relative">
                    {p.image_url && (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    )}
                  </div>
                  <h3 className="font-medium text-xs truncate">{p.name}</h3>
                  <p className="text-primary text-xs font-display font-semibold mt-0.5">R$ {Number(p.price).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="border-t border-border/40 bg-card text-xs">
        <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <Logo className="h-18 sm:h-24 mb-4" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Lingerie autoral em renda e seda. Peças exclusivas desenhadas para valorizar sua essência com elegância.
            </p>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-primary/70 mb-3">Navegar</div>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#colecoes" className="hover:text-primary transition-colors">Coleções</a></li>
              <li><a href="#linhas" className="hover:text-primary transition-colors">Linhas</a></li>
              <li><a href="#destaques" className="hover:text-primary transition-colors">Destaques</a></li>
              <li><Link to="/loja/carrinho" className="hover:text-primary transition-colors">Carrinho</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-primary/70 mb-3">Ajuda</div>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href={waHref} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">Atendimento</a></li>
              <li><a href={waHref} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">Trocas & devoluções</a></li>
              <li className="opacity-70">Envios</li>
              <li className="opacity-70">Guia de tamanhos</li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-primary/70 mb-3">Contato</div>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <a href={waHref} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <MessageCircle className="w-3.5 h-3.5 text-primary" />
                  +55 27 99204-2450
                </a>
              </li>
              <li>
                <a href="https://www.instagram.com/priveloja/" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Instagram className="w-3.5 h-3.5 text-primary" />
                  @priveloja
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-primary" />
                contatopriveloja@gmail.com
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/40 py-4 text-center text-[11px] text-muted-foreground">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} Privê — Todos os direitos reservados.</span>
            <span>
              Desenvolvido por{" "}
              <a href="https://qrztech.com" target="_blank" rel="noreferrer" className="text-primary font-medium hover:underline">
                QRZ Tech
              </a>
            </span>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <a
        href={waHref}
        target="_blank"
        rel="noreferrer"
        aria-label="Falar no WhatsApp"
        className="fixed bottom-5 right-5 z-50 h-14 w-14 flex items-center justify-center hover:scale-110 transition"
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-35" />
        <img
          src="/whatsapp-glyph.png"
          alt="WhatsApp"
          className="w-14 h-14 object-contain relative drop-shadow-lg"
        />
      </a>

      <ProductModal
        product={modalProduct}
        open={!!modalProduct}
        onClose={() => setModalProduct(null)}
        isFavorite={modalProduct ? favorites.has(modalProduct.id) : false}
        onToggleFav={() => modalProduct && handleToggleFav(modalProduct.id)}
        user={user}
      />

      <CustomerAuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
      />

    </div>
  );
}

function ShopCard({ product, delay, isFavorite, onToggleFav, onOpen, user }: any) {
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
    <div className="bg-card rounded-2xl overflow-hidden group border border-border/40 hover:border-primary/40 hover:shadow-xl transition-all duration-300">
      <div className="aspect-[4/5] bg-secondary overflow-hidden relative">
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Abrir ${product.name}`}
          className="absolute inset-0 w-full h-full block group/img cursor-zoom-in"
        >
          {img ? (
            <img
              src={img}
              alt={product.name}
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
          )}
        </button>
        {user && (
          <button onClick={onToggleFav} className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur rounded-full p-2 hover:scale-110 transition">
            <Heart className={`w-4 h-4 ${isFavorite ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </button>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center pointer-events-none">
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
          }} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] sm:text-xs font-semibold tracking-normal uppercase px-1.5 truncate shadow-sm">
            <Plus className="w-3 h-3 mr-1 shrink-0 inline" />{needsColor ? "Escolher cor" : needsSize ? "Escolher tamanho" : "Comprar"}
          </Button>
        )}
      </div>
    </div>
  );
}
