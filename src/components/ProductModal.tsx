import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, Plus, Bell, X, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useShopCart } from "@/lib/shopCart";
import { DEFAULT_SIZES } from "@/lib/variantDefaults";

interface Props {
  product: any | null;
  open: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFav: () => void;
  user: any;
}

export function ProductModal({ product, open, onClose, isFavorite, onToggleFav, user }: Props) {
  const add = useShopCart((s) => s.add);
  const variants: any[] = product?.variants || [];
  const images: any[] = product?.images || [];
  const colors = useMemo(
    () => Array.from(new Set(variants.map((v) => v.color_name).filter(Boolean))) as string[],
    [variants]
  );
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (open) {
      // Garante que o lightbox fullscreen SEMPRE inicia fechado ao abrir o produto
      setFullscreenImageOpen(false);

      // Detecta a cor correspondente à imagem exibida (ex: variante Rubi vinda do carrossel/card)
      const targetUrl = product?.image_url?.toLowerCase() || "";
      const matchingImgColor = images.find(
        (i) => i.url && targetUrl && i.url.toLowerCase() === targetUrl
      )?.color_name;
      const matchingVarColor = variants.find(
        (v) => v.image_url && targetUrl && v.image_url.toLowerCase() === targetUrl
      )?.color_name;
      const colorInUrl = colors.find(
        (c) => targetUrl && targetUrl.includes(c.toLowerCase())
      );

      const initialColor = matchingImgColor || matchingVarColor || colorInUrl || colors[0] || null;
      setColor(initialColor);
      setSize(null);
      setActiveIdx(0);
    }
  }, [open, product?.id, product?.image_url, colors, images, variants]);

  const dbSizes = Array.from(
    new Set(variants.filter((v) => !color || v.color_name === color).map((v) => v.size).filter(Boolean))
  ) as string[];
  const sizes = dbSizes.length > 0 ? dbSizes : [...DEFAULT_SIZES];
  const sizesFromDb = dbSizes.length > 0;

  const visibleImages = useMemo(() => {
    const list: { url: string }[] = [];
    // 1. Fotos vinculadas especificamente à cor selecionada
    if (color) {
      images.filter((i) => i.color_name === color).forEach((i) => list.push({ url: i.url }));
      variants.filter((v) => v.color_name === color && v.image_url).forEach((v) => {
        if (!list.some((i) => i.url === v.image_url)) list.push({ url: v.image_url });
      });
    }
    // 2. Fotos gerais sem cor vinculada
    images.filter((i) => !i.color_name).forEach((i) => {
      if (!list.some((l) => l.url === i.url)) list.push({ url: i.url });
    });
    // 3. Fallback se não houver imagens cadastradas para a cor
    if (list.length === 0 && product?.image_url) {
      list.push({ url: product.image_url });
    }
    return list;
  }, [images, variants, color, product?.image_url]);

  const selectedVariant = variants.find(
    (v) => (!color || v.color_name === color) && (!sizesFromDb || !size || v.size === size)
  );
  const price = Number(selectedVariant?.price_override ?? product?.price ?? 0);
  const stock = selectedVariant?.stock;
  const outOfStock = stock != null && stock <= 0;
  const needsSize = sizes.length > 0 && !size;
  const needsColor = colors.length > 0 && !color;

  const imgRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [fullscreenImageOpen, setFullscreenImageOpen] = useState(false);

  function onMove(e: React.MouseEvent) {
    const r = imgRef.current?.getBoundingClientRect();
    if (!r) return;
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  }

  async function joinWaitlist() {
    if (!product) return;
    const email = user?.email || prompt("Deixe seu email pra avisarmos quando chegar:");
    if (!email) return;
    const { error } = await supabase.from("shop_waitlist").insert({
      user_id: user?.id || null,
      email,
      product_id: product.id,
      variant_id: selectedVariant?.id || null,
    });
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    toast.success("Você será avisada assim que chegar 🔔");
  }

  const mainImg = visibleImages[activeIdx]?.url || visibleImages[0]?.url;

  if (!product) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="w-full h-full max-h-none md:max-h-[85vh] md:max-w-4xl p-0 overflow-y-auto bg-card border-none md:border md:border-border/60 rounded-none md:rounded-3xl shadow-2xl">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-40 bg-background/80 backdrop-blur rounded-full p-2.5 hover:bg-background transition border border-border/40"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="grid md:grid-cols-2">
            {/* ÁREA DE IMAGENS — DESKTOP (side-by-side) & MOBILE (imagem + miniaturas à direita) */}
            <div className="bg-transparent md:bg-secondary/50 p-3 sm:p-4 md:p-0 flex flex-col justify-center">
              {/* MOBILE LAYOUT (imagem compacta à esquerda + miniaturas empilhadas à direita) */}
              <div className="flex md:hidden gap-3 items-stretch h-[210px]">
                {/* Imagem Principal no Mobile (Clique abre modal maior em tela cheia com X) */}
                <div
                  onClick={() => setFullscreenImageOpen(true)}
                  className="flex-1 bg-secondary rounded-2xl overflow-hidden relative cursor-pointer border border-border/40 group shadow-sm"
                >
                  {mainImg ? (
                    <img src={mainImg} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFullscreenImageOpen(true);
                    }}
                    className="absolute bottom-2 right-2 bg-black/70 hover:bg-black text-white text-[10px] px-2.5 py-1 rounded-full backdrop-blur font-medium shadow-md transition"
                  >
                    Ampliar 🔍
                  </button>
                </div>

                {/* Miniaturas à direita no Mobile */}
                {visibleImages.length > 1 && (
                  <div className="w-16 flex flex-col gap-2 overflow-y-auto max-h-[210px] shrink-0 pr-1">
                    {visibleImages.map((im, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveIdx(i)}
                        className={`w-full aspect-square rounded-xl overflow-hidden border-2 shrink-0 transition ${
                          activeIdx === i ? "border-primary scale-95 shadow-sm" : "border-transparent opacity-70"
                        }`}
                      >
                        <img src={im.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* DESKTOP LAYOUT (imagem alta com zoom no hover + miniaturas embaixo) */}
              <div className="hidden md:flex flex-col">
                <div
                  ref={imgRef}
                  onClick={() => setFullscreenImageOpen(true)}
                  className="relative aspect-[4/5] overflow-hidden cursor-zoom-in bg-secondary"
                  onMouseMove={onMove}
                  onMouseEnter={onMove}
                  onMouseLeave={() => setZoom(null)}
                >
                  {mainImg ? (
                    zoom ? (
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `url(${mainImg})`,
                          backgroundSize: "200%",
                          backgroundPosition: `${zoom.x}% ${zoom.y}%`,
                          backgroundRepeat: "no-repeat",
                        }}
                      />
                    ) : (
                      <img src={mainImg} alt={product.name} className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFullscreenImageOpen(true);
                    }}
                    className="absolute bottom-3 right-3 bg-black/70 hover:bg-black text-white text-xs px-3 py-1.5 rounded-full backdrop-blur font-medium shadow-md transition"
                  >
                    Ampliar 🔍
                  </button>
                </div>

                {visibleImages.length > 1 && (
                  <div className="flex gap-2 p-3 overflow-x-auto border-t border-border/30">
                    {visibleImages.map((im, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveIdx(i)}
                        className={`shrink-0 w-16 h-20 rounded-md overflow-hidden border-2 transition ${
                          activeIdx === i ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img src={im.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* DETALHES DO PRODUTO (Título, Preço, Cores, Tamanhos e Botões de Compra) */}
            <div className="p-4 sm:p-6 md:p-8 space-y-3.5 sm:space-y-5">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-primary/70">
                  {product.line_name || product.category_name || "Coleção"}
                </div>
                <div className="flex items-baseline justify-between gap-2 mt-0.5">
                  <h2 className="font-display text-xl sm:text-3xl md:text-4xl">{product.name}</h2>
                  <div className="text-primary font-display text-xl sm:text-2xl md:text-3xl font-bold shrink-0">
                    R$ {price.toFixed(2)}
                  </div>
                </div>
              </div>

              {product.description && (
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2 sm:line-clamp-none">
                  {product.description}
                </p>
              )}

              {colors.length > 0 && (
                <div>
                  <div className="text-[10px] sm:text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
                    Cor {color && <span className="text-foreground font-semibold">· {color}</span>}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {colors.map((c) => {
                      const avail = variants.some((v) => v.color_name === c && (v.stock == null || v.stock > 0));
                      const hex = variants.find((v) => v.color_name === c)?.color_hex || "#ccc";
                      return (
                        <button
                          key={c}
                          onClick={() => {
                            setColor(c);
                            setSize(null);
                            setActiveIdx(0);
                          }}
                          disabled={!avail}
                          title={c}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition ${
                            color === c ? "border-primary scale-110 shadow-sm" : "border-border"
                          } ${!avail ? "opacity-30" : ""}`}
                          style={{ background: hex }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {sizes.length > 0 && (
                <div>
                  <div className="text-[10px] sm:text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
                    Tamanho {size && <span className="text-foreground font-semibold">· {size}</span>}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {sizes.map((s) => {
                      const sv = sizesFromDb
                        ? variants.find((v) => (!color || v.color_name === color) && v.size === s)
                        : null;
                      const so = sv && sv.stock != null && sv.stock <= 0;
                      return (
                        <button
                          key={s}
                          onClick={() => setSize(s)}
                          disabled={!!so}
                          className={`min-w-9 h-9 sm:min-w-11 sm:h-11 px-2.5 sm:px-3 rounded-md border text-xs sm:text-sm uppercase tracking-wider transition ${
                            size === s
                              ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                              : "border-border hover:border-primary/50"
                          } ${so ? "opacity-30 line-through" : ""}`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                {outOfStock ? (
                  <Button onClick={joinWaitlist} variant="outline" className="w-full h-11 sm:h-12 text-xs">
                    <Bell className="w-4 h-4 mr-2" />
                    Avise-me quando chegar
                  </Button>
                ) : (
                  <>
                    <Button
                      disabled={needsColor || needsSize}
                      onClick={() => {
                        const label = [color, size].filter(Boolean).join(" · ") || null;
                        add({
                          productId: product.id,
                          variantId: selectedVariant?.id || null,
                          name: product.name,
                          variantLabel: label,
                          price,
                          imageUrl: mainImg,
                          qty: 1,
                          maxQty: stock != null ? Number(stock) : 99,
                        });
                        toast.success("Adicionado ao carrinho");
                      }}
                      className="w-full h-11 sm:h-12 bg-primary hover:bg-primary/90 text-primary-foreground tracking-wider uppercase text-xs font-bold shadow-md"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {needsColor ? "Escolha uma cor" : needsSize ? "Escolha o tamanho" : "Adicionar ao carrinho"}
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={onToggleFav} className="h-10 sm:h-11 text-xs">
                        <Heart className={`w-3.5 h-3.5 mr-1.5 ${isFavorite ? "fill-primary text-primary" : ""}`} />
                        {isFavorite ? "Favorito" : "Favoritar"}
                      </Button>
                      <a
                        href="/loja/carrinho"
                        className="inline-flex items-center justify-center h-10 sm:h-11 rounded-md border border-border hover:border-primary/50 text-xs font-medium uppercase tracking-wider transition"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 mr-1.5" /> Ver carrinho
                      </a>
                    </div>
                  </>
                )}
                <p className="text-[10px] text-muted-foreground text-center pt-0.5">
                  Envio Direto com Rastreio · PIX com 5% OFF · Troca em até 7 dias
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* FULLSCREEN IMAGE LIGHTBOX MODAL (Renderizado via Portal em document.body com isolamento de eventos) */}
      {fullscreenImageOpen &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200 pointer-events-auto"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setFullscreenImageOpen(false);
            }}
          >
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setFullscreenImageOpen(false);
              }}
              className="fixed top-4 right-4 z-[100005] w-11 h-11 shrink-0 min-w-11 min-h-11 aspect-square rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center backdrop-blur transition border border-white/40 shadow-2xl cursor-pointer"
              aria-label="Fechar Imagem Ampliada"
            >
              <X className="w-6 h-6 text-white shrink-0" />
            </button>

            <div
              className="relative max-w-full max-h-[78vh] flex items-center justify-center z-[100000]"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                key={mainImg}
                src={mainImg}
                alt={product.name}
                className="max-w-full max-h-[78vh] object-contain rounded-2xl shadow-2xl transition-all duration-300 animate-in fade-in duration-300"
              />
            </div>

            {visibleImages.length > 1 && (
              <div
                className="flex gap-3 mt-4 max-w-full overflow-x-auto p-2.5 z-[100000] bg-black/40 rounded-2xl backdrop-blur-sm border border-white/10"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                {visibleImages.map((im, i) => (
                  <button
                    key={i}
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setActiveIdx(i);
                    }}
                    className={`shrink-0 w-14 h-16 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                      activeIdx === i
                        ? "border-primary scale-105 shadow-xl ring-2 ring-primary/50"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={im.url} alt="" className="w-full h-full object-cover pointer-events-none" />
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
