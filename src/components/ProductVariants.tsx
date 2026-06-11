import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash, GripVertical } from "lucide-react";
import { ImageInput } from "@/components/ImageInput";
import { toast } from "sonner";

interface Variant {
  id?: string;
  color_name: string;
  color_hex: string;
  size: string;
  stock: number | null;
  price_override: number | null;
  position: number;
}

interface ProductImage {
  id?: string;
  url: string;
  color_name: string; // "" = geral
  position: number;
}

export function VariantsEditor({ productId }: { productId: string }) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from("product_variants").select("*").eq("product_id", productId).order("position");
    setVariants((data || []).map((v: any) => ({
      id: v.id,
      color_name: v.color_name || "",
      color_hex: v.color_hex || "#cccccc",
      size: v.size || "",
      stock: v.stock,
      price_override: v.price_override,
      position: v.position,
    })));
    setLoading(false);
  }
  useEffect(() => { load(); }, [productId]);

  function addRow() {
    setVariants([...variants, { color_name: "", color_hex: "#c9a27a", size: "", stock: null, price_override: null, position: variants.length }]);
  }
  function update(i: number, patch: Partial<Variant>) {
    setVariants(variants.map((v, idx) => idx === i ? { ...v, ...patch } : v));
  }
  async function remove(i: number) {
    const v = variants[i];
    if (v.id) await supabase.from("product_variants").delete().eq("id", v.id);
    setVariants(variants.filter((_, idx) => idx !== i));
  }
  async function saveAll() {
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const payload = {
        product_id: productId,
        color_name: v.color_name || null,
        color_hex: v.color_hex || null,
        size: v.size || null,
        stock: v.stock,
        price_override: v.price_override,
        position: i,
      };
      if (v.id) await supabase.from("product_variants").update(payload).eq("id", v.id);
      else await supabase.from("product_variants").insert(payload);
    }
    toast.success("Variações salvas");
    load();
  }

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Cada combinação cor + tamanho é uma variação. Estoque vazio = sem controle.</p>
        <Button size="sm" variant="outline" onClick={addRow}><Plus className="w-3 h-3 mr-1" />Variação</Button>
      </div>
      {variants.length === 0 && <div className="text-sm text-muted-foreground text-center py-4 glass rounded-lg">Nenhuma variação. Produto vendido como item único.</div>}
      {variants.map((v, i) => (
        <div key={i} className="glass rounded-lg p-2 flex flex-wrap items-end gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground mt-3" />
          <div className="flex-1 min-w-[140px]">
            <Label className="text-[10px] uppercase">Cor (nome)</Label>
            <Input value={v.color_name} placeholder="Ex: Vermelho" onChange={(e) => update(i, { color_name: e.target.value })} className="h-8" />
          </div>
          <div>
            <Label className="text-[10px] uppercase">Hex</Label>
            <input type="color" value={v.color_hex} onChange={(e) => update(i, { color_hex: e.target.value })} className="h-8 w-12 rounded border border-border" />
          </div>
          <div className="w-20">
            <Label className="text-[10px] uppercase">Tamanho</Label>
            <Input value={v.size} placeholder="P/M/G" onChange={(e) => update(i, { size: e.target.value })} className="h-8" />
          </div>
          <div className="w-20">
            <Label className="text-[10px] uppercase">Estoque</Label>
            <Input type="number" value={v.stock ?? ""} onChange={(e) => update(i, { stock: e.target.value === "" ? null : Number(e.target.value) })} className="h-8" />
          </div>
          <div className="w-24">
            <Label className="text-[10px] uppercase">Preço R$</Label>
            <Input type="number" step="0.01" value={v.price_override ?? ""} placeholder="—" onChange={(e) => update(i, { price_override: e.target.value === "" ? null : Number(e.target.value) })} className="h-8" />
          </div>
          <Button size="icon" variant="ghost" onClick={() => remove(i)}><Trash className="w-3 h-3" /></Button>
        </div>
      ))}
      {variants.length > 0 && <Button size="sm" onClick={saveAll} className="w-full bg-primary text-primary-foreground">Salvar variações</Button>}
    </div>
  );
}

export function GalleryEditor({ productId, variants }: { productId: string; variants: { color_name: string; color_hex?: string }[] }) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const colors = Array.from(new Set(variants.map((v) => v.color_name).filter(Boolean)));

  async function load() {
    const { data } = await supabase.from("product_images").select("*").eq("product_id", productId).order("position");
    setImages((data || []).map((d: any) => ({ id: d.id, url: d.url, color_name: d.color_name || "", position: d.position })));
    setLoading(false);
  }
  useEffect(() => { load(); }, [productId]);

  async function addImage(url: string | null, color: string) {
    if (!url) return;
    const { error } = await supabase.from("product_images").insert({ product_id: productId, url, color_name: color || null, position: images.length });
    if (error) return toast.error(error.message);
    load();
  }
  async function remove(id?: string) {
    if (!id) return;
    await supabase.from("product_images").delete().eq("id", id);
    load();
  }
  async function setColor(id: string | undefined, color: string) {
    if (!id) return;
    await supabase.from("product_images").update({ color_name: color || null }).eq("id", id);
    load();
  }

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Adicione várias fotos. Defina a cor para que troque automaticamente quando a noiva selecionar.
        Sem cor = aparece em todas.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {images.map((img) => (
          <div key={img.id} className="glass rounded-lg overflow-hidden">
            <div className="aspect-square bg-secondary">
              <img src={img.url} alt="" loading="lazy" className="w-full h-full object-cover" />
            </div>
            <div className="p-2 space-y-1">
              <select
                value={img.color_name}
                onChange={(e) => setColor(img.id, e.target.value)}
                className="w-full text-xs rounded bg-secondary border border-border px-1 py-1"
              >
                <option value="">— geral —</option>
                {colors.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <Button size="sm" variant="ghost" className="w-full text-destructive" onClick={() => remove(img.id)}>
                <Trash className="w-3 h-3 mr-1" />Remover
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="glass rounded-lg p-3">
        <Label className="text-xs">Adicionar nova foto</Label>
        <ImageInput value={null} onChange={(u) => addImage(u, "")} folder={`products/${productId}`} label="" />
      </div>
    </div>
  );
}
