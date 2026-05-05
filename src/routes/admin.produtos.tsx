import { createFileRoute } from "@tanstack/react-router";
import { PanelShell } from "@/components/PanelShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageInput } from "@/components/ImageInput";
import { Plus, Trash, Pencil, Search, FileUp, Sparkles, Copy, Power } from "lucide-react";
import { toast } from "sonner";
import { ImportPdfDialog } from "@/components/ImportPdfDialog";

export const Route = createFileRoute("/admin/produtos")({ component: AdminProducts });

function AdminProducts() {
  const { isAdmin, loading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  async function load() {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  }
  useEffect(() => { load(); }, []);

  if (!loading && !isAdmin) return <PanelShell mode="admin"><div className="p-10">Acesso restrito.</div></PanelShell>;

  async function remove(id: string) {
    if (!confirm("Excluir produto?")) return;
    await supabase.from("products").delete().eq("id", id); load();
  }
  async function duplicate(p: any) {
    const { id, created_at, ...rest } = p;
    await supabase.from("products").insert({ ...rest, name: `${p.name} (cópia)` });
    toast.success("Duplicado"); load();
  }
  async function toggleActive(p: any) {
    await supabase.from("products").update({ active: !p.active }).eq("id", p.id);
    load();
  }

  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));
  const filtered = items.filter((p) => (q === "" || p.name.toLowerCase().includes(q.toLowerCase())) && (cat === "" || p.category === cat));

  return (
    <PanelShell mode="admin">
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-end gap-3 mb-6">
          <div>
            <h1 className="font-display text-4xl">Catálogo</h1>
            <p className="text-sm text-muted-foreground">{items.length} produtos cadastrados</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImporting(true)}><FileUp className="w-3 h-3 mr-1" />Importar PDF</Button>
            <Button onClick={() => setEditing({})} className="bg-gradient-to-r from-primary to-accent text-primary-foreground"><Plus className="w-4 h-4 mr-1" />Novo</Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar produto..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button size="sm" variant={cat === "" ? "default" : "outline"} onClick={() => setCat("")}>Todas</Button>
          {categories.map((c) => (
            <Button key={c} size="sm" variant={cat === c ? "default" : "outline"} onClick={() => setCat(c)}>{c}</Button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(p => (
            <div key={p.id} className={`glass rounded-2xl overflow-hidden hover-lift ${!p.active ? "opacity-50" : ""}`}>
              <div className="aspect-square bg-secondary">{p.image_url && <img loading="lazy" src={p.image_url} alt="" className="w-full h-full object-cover" />}</div>
              <div className="p-3">
                <div className="text-[10px] uppercase tracking-wider text-primary/70">{p.category || "—"}</div>
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-primary font-display text-lg">R$ {Number(p.price).toFixed(2)}</div>
                <div className="flex gap-1 mt-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(p)}><Pencil className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => duplicate(p)} title="Duplicar"><Copy className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(p)} title={p.active ? "Desativar" : "Ativar"}><Power className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash className="w-3 h-3" /></Button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="col-span-full glass rounded-2xl p-12 text-center text-muted-foreground"><Sparkles className="w-6 h-6 mx-auto mb-2 text-primary" />Nenhum produto. Importe um PDF ou cadastre o primeiro.</div>}
        </div>
      </div>
      {editing && <ProductDialog item={editing} onClose={() => { setEditing(null); load(); }} />}
      {importing && <ImportPdfDialog open={importing} onClose={() => { setImporting(false); load(); }} />}
    </PanelShell>
  );
}

function ProductDialog({ item, onClose }: any) {
  const [f, setF] = useState({ name: "", description: "", price: 0, image_url: "", category: "", active: true, ...item });
  const set = (k: string, v: any) => setF({ ...f, [k]: v });
  async function save() {
    const payload = { name: f.name, description: f.description, price: f.price, image_url: f.image_url, category: f.category, active: f.active };
    const { error } = item.id
      ? await supabase.from("products").update(payload).eq("id", item.id)
      : await supabase.from("products").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); onClose();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass max-w-lg">
        <DialogHeader><DialogTitle className="font-display text-2xl">{item.id ? "Editar" : "Novo"} produto</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-auto pr-2">
          <ImageInput value={f.image_url} onChange={(u) => set("image_url", u)} prompt={f.name} folder="products" label="Foto do produto" />
          <div><Label>Nome</Label><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div><Label>Categoria</Label><Input value={f.category || ""} onChange={(e) => set("category", e.target.value)} /></div>
          <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={f.price} onChange={(e) => set("price", +e.target.value)} /></div>
          <div><Label>Descrição</Label><Textarea rows={3} value={f.description || ""} onChange={(e) => set("description", e.target.value)} /></div>
          <Button onClick={save} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
