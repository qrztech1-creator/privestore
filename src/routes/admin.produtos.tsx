import { createFileRoute } from "@tanstack/react-router";
import { PanelShell } from "@/components/PanelShell";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageInput } from "@/components/ImageInput";
import { Plus, Trash, Pencil, Search, FileUp, Sparkles, Copy, Power } from "lucide-react";
import { toast } from "sonner";
import { ImportPdfDialog } from "@/components/ImportPdfDialog";

export const Route = createFileRoute("/admin/produtos")({ component: AdminProducts });

function AdminProducts() {
  const { isAdmin, loading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState<string>("all");
  const [lineId, setLineId] = useState<string>("all");
  const [statusF, setStatusF] = useState<string>("all");
  const [sort, setSort] = useState<string>("recent");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function load() {
    const [{ data: prods }, { data: c }, { data: l }] = await Promise.all([
      supabase.from("products").select("*, category:categories(id,name,slug,color), line:product_lines(id,name,slug,color)").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("position"),
      supabase.from("product_lines").select("*").order("position"),
    ]);
    setItems(prods || []); setCats(c || []); setLines(l || []);
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Excluir produto?")) return;
    await supabase.from("products").delete().eq("id", id); load();
  }
  async function duplicate(p: any) {
    const { id, created_at, category, ...rest } = p;
    await supabase.from("products").insert({ ...rest, name: `${p.name} (cópia)` });
    toast.success("Duplicado"); load();
  }
  async function toggleActive(p: any) {
    await supabase.from("products").update({ active: !p.active }).eq("id", p.id);
    load();
  }

  const filtered = useMemo(() => {
    let out = items.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (catId !== "all" && p.category_id !== catId) return false;
      if (lineId === "none" && p.line_id) return false;
      if (lineId !== "all" && lineId !== "none" && p.line_id !== lineId) return false;
      if (statusF === "active" && !p.active) return false;
      if (statusF === "inactive" && p.active) return false;
      return true;
    });
    if (sort === "price-asc") out = [...out].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") out = [...out].sort((a, b) => b.price - a.price);
    if (sort === "name") out = [...out].sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [items, q, catId, lineId, statusF, sort]);

  function toggleSelect(id: string, e?: React.MouseEvent) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  }
  function clearSelection() { setSelected(new Set()); }

  function onDragStart(e: React.DragEvent, productId: string) {
    const ids = selected.has(productId) ? Array.from(selected) : [productId];
    e.dataTransfer.setData("product-ids", JSON.stringify(ids));
    e.dataTransfer.effectAllowed = "move";
  }

  async function bulkSetCategory(value: string) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const category_id = value === "none" ? null : value;
    const { error } = await supabase.from("products").update({ category_id }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} produto(s) atualizados`); clearSelection(); load();
  }
  async function bulkSetLine(value: string) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const line_id = value === "none" ? null : value;
    const { error } = await supabase.from("products").update({ line_id }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} produto(s) atualizados`); clearSelection(); load();
  }

  if (!loading && !isAdmin) return <PanelShell mode="admin"><div className="p-10">Acesso restrito.</div></PanelShell>;


  return (
    <PanelShell mode="admin">
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-end gap-3 mb-6">
          <div>
            <h1 className="font-display text-4xl text-primary">Produtos</h1>
            <p className="text-sm text-muted-foreground">A curadoria completa da boutique · {items.length} itens</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImporting(true)}><FileUp className="w-3 h-3 mr-1" />Importar PDF</Button>
            <Button onClick={() => setEditing({})} className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1" />Novo produto</Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar produto..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={catId} onValueChange={setCatId}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={lineId} onValueChange={setLineId}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Linha" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas linhas</SelectItem>
              <SelectItem value="none">— Sem linha —</SelectItem>
              {lines.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusF} onValueChange={setStatusF}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="name">Nome A-Z</SelectItem>
              <SelectItem value="price-asc">Preço ↑</SelectItem>
              <SelectItem value="price-desc">Preço ↓</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selected.size > 0 && (
          <div className="glass rounded-xl p-3 mb-4 flex flex-wrap items-center gap-2 sticky top-2 z-20">
            <span className="text-sm font-medium">{selected.size} selecionado(s)</span>
            <Select onValueChange={bulkSetCategory}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Mover para categoria..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem categoria —</SelectItem>
                {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select onValueChange={bulkSetLine}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Mover para linha..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem linha —</SelectItem>
                {lines.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={clearSelection}>Limpar</Button>
            <span className="text-xs text-muted-foreground ml-auto">Dica: arraste para a aba Linhas/Categorias para mover.</span>
          </div>
        )}

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => {
            const isSel = selected.has(p.id);
            return (
              <div
                key={p.id}
                draggable
                onDragStart={(e) => onDragStart(e, p.id)}
                onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey) toggleSelect(p.id); }}
                className={`glass rounded-xl overflow-hidden hover-lift cursor-grab active:cursor-grabbing ${!p.active ? "opacity-50" : ""} ${isSel ? "ring-2 ring-primary" : ""}`}
              >
                <div className="aspect-square bg-secondary relative">
                  {p.image_url && <img loading="lazy" src={p.image_url} alt={p.name} className="w-full h-full object-cover pointer-events-none" />}
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => toggleSelect(p.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-2 right-2 w-5 h-5 rounded accent-primary"
                  />
                  {p.line && <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider bg-primary/90 text-primary-foreground backdrop-blur px-2 py-0.5 rounded">{p.line.name}</span>}
                  {p.category && <span className="absolute bottom-2 left-2 text-[10px] uppercase tracking-wider bg-background/90 backdrop-blur px-2 py-0.5 rounded">{p.category.name}</span>}
                </div>
                <div className="p-3">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-primary font-display text-lg">R$ {Number(p.price).toFixed(2)}</div>
                  <div className="flex gap-1 mt-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(p)}><Pencil className="w-3 h-3 mr-1" />Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => duplicate(p)} title="Duplicar"><Copy className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(p)} title={p.active ? "Desativar" : "Ativar"}><Power className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash className="w-3 h-3" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="col-span-full glass rounded-xl p-12 text-center text-muted-foreground"><Sparkles className="w-6 h-6 mx-auto mb-2 text-primary" />Nenhum produto. Importe um PDF ou cadastre o primeiro.</div>}
        </div>
      </div>
      {editing && <ProductDialog item={editing} cats={cats} lines={lines} onClose={() => { setEditing(null); load(); }} />}
      {importing && <ImportPdfDialog open={importing} onClose={() => { setImporting(false); load(); }} />}
    </PanelShell>
  );
}

function ProductDialog({ item, cats, onClose }: any) {
  const [f, setF] = useState({ name: "", description: "", price: 0, image_url: "", category_id: null, active: true, ...item });
  const set = (k: string, v: any) => setF({ ...f, [k]: v });
  async function save() {
    const payload = { name: f.name, description: f.description, price: Number(f.price) || 0, image_url: f.image_url, category_id: f.category_id || null, active: f.active };
    const { error } = item.id
      ? await supabase.from("products").update(payload).eq("id", item.id)
      : await supabase.from("products").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); onClose();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass max-w-lg">
        <DialogHeader><DialogTitle className="font-display text-2xl text-primary">{item.id ? "Editar" : "Novo"} produto</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-auto pr-2">
          <ImageInput value={f.image_url} onChange={(u) => set("image_url", u)} prompt={f.name} folder="products" label="Foto do produto" />
          <div><Label>Nome</Label><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div>
            <Label>Categoria</Label>
            <Select value={f.category_id || "none"} onValueChange={(v) => set("category_id", v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem categoria —</SelectItem>
                {cats.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={f.price} onChange={(e) => set("price", e.target.value)} /></div>
          <div><Label>Descrição</Label><Textarea rows={3} value={f.description || ""} onChange={(e) => set("description", e.target.value)} /></div>
          <Button onClick={save} className="w-full bg-primary text-primary-foreground">Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
