import { useEffect, useMemo, useRef, useState } from "react";
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
      setColor(colors[0] || null);
      setSize(null);
      setActiveIdx(0);
    }
  }, [open, product?.id, colors]);

  const dbSizes = Array.from(
    new Set(variants.filter((v) => !color || v.color_name === color).map((v) => v.size).filter(Boolean))
  ) as string[];
  const sizes = dbSizes.length > 0 ? dbSizes : [...DEFAULT_SIZES];
  const sizesFromDb = dbSizes.length > 0;

  const visibleImages = useMemo(() => {
    const list: { url: string }[] = [];
    if (color) images.filter((i) => i.color_name === color).forEach((i) => list.push({ url: i.url }));
    images.filter((i) => !i.color_name).forEach((i) => list.push({ url: i.url }));
    if (list.length === 0 && product?.image_url) list.push({ url: product.image_url });
    return list;
  }, [images, color, product?.image_url]);

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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-y-auto max-h-[92vh] md:max-h-[85vh] bg-card border-border/60 rounded-3xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 bg-background/80 backdrop-blur rounded-full p-2 hover:bg-background transition border border-border/40"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="grid md:grid-cols-2">
          <div className="bg-secondary/50 flex flex-col">
            <div
              ref={imgRef}
              className="relative aspect-square md:aspect-[4/5] max-h-[350px] md:max-h-none overflow-hidden cursor-zoom-in bg-secondary"
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
            </div>
            {visibleImages.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto border-t border-border/30">
                {visibleImages.map((im, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`shrink-0 w-14 h-16 md:w-16 md:h-20 rounded-md overflow-hidden border-2 transition ${
                      activeIdx === i ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={im.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 sm:p-6 md:p-8 space-y-5">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-primary/70">
                {product.line_name || product.category_name || "Coleção"}
              </div>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl mt-1">{product.name}</h2>
              <div className="text-primary font-display text-2xl sm:text-3xl mt-2">R$ {price.toFixed(2)}</div>
            </div>

            {product.description && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            )}

            {colors.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
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
                        className={`w-8 h-8 rounded-full border-2 transition ${
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
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
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
                        className={`min-w-11 h-11 px-3 rounded-md border text-sm uppercase tracking-wider transition ${
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

            <div className="flex flex-col gap-2 pt-2">
              {outOfStock ? (
                <Button onClick={joinWaitlist} variant="outline" className="w-full h-12">
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
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground tracking-wider uppercase text-xs shadow-md"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {needsColor ? "Escolha uma cor" : needsSize ? "Escolha o tamanho" : "Adicionar ao carrinho"}
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={onToggleFav} className="h-11">
                      <Heart className={`w-4 h-4 mr-2 ${isFavorite ? "fill-primary text-primary" : ""}`} />
                      {isFavorite ? "Favorito" : "Favoritar"}
                    </Button>
                    <a
                      href="/loja/carrinho"
                      className="inline-flex items-center justify-center h-11 rounded-md border border-border hover:border-primary/50 text-xs font-medium uppercase tracking-wider transition"
                    >
                      <ShoppingBag className="w-4 h-4 mr-2" /> Ver carrinho
                    </a>
                  </div>
                </>
              )}
              <p className="text-[11px] text-muted-foreground text-center pt-1">
                Envio Direto com Rastreio · PIX com 5% OFF · Troca em até 7 dias
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
