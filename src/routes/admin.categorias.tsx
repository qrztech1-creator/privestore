import { createFileRoute } from "@tanstack/react-router";
import { PanelShell } from "@/components/PanelShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash, Tag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/categorias")({ component: AdminCategorias });

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function AdminCategorias() {
  const { isAdmin, loading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("categories").select("*").order("position");
    setItems(data || []);
    const { data: prods } = await supabase.from("products").select("category_id");
    const c: Record<string, number> = {};
    prods?.forEach((p: any) => { if (p.category_id) c[p.category_id] = (c[p.category_id] || 0) + 1; });
    setCounts(c);
  }
  useEffect(() => { load(); }, []);

  if (!loading && !isAdmin) return <PanelShell mode="admin"><div className="p-10">Acesso restrito.</div></PanelShell>;

  async function remove(id: string) {
    if (!confirm("Excluir categoria? Os produtos não serão apagados.")) return;
    await supabase.from("categories").delete().eq("id", id); load();
  }

  async function onDrop(catId: string | null, e: React.DragEvent) {
    e.preventDefault(); setDragOver(null);
    const ids: string[] = JSON.parse(e.dataTransfer.getData("product-ids") || "[]");
    if (ids.length === 0) return;
    const { error } = await supabase.from("products").update({ category_id: catId }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} produto(s) movido(s)`); load();
  }

  return (
    <PanelShell mode="admin">
      <div className="p-6 md:p-10 max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="font-display text-4xl text-primary">Categorias</h1>
            <p className="text-sm text-muted-foreground mt-1">Organize a curadoria da boutique.</p>
          </div>
          <Button onClick={() => setEditing({})} className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1" />Nova categoria</Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver("none"); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => onDrop(null, e)}
            className={`glass rounded-xl p-4 border-2 border-dashed ${dragOver === "none" ? "border-primary bg-primary/10" : "border-border"}`}
          >
            <div className="text-sm font-medium">Sem categoria</div>
            <div className="text-xs text-muted-foreground">Solte aqui para remover</div>
          </div>
          {items.map((c) => (
            <div
              key={c.id}
              onDragOver={(e) => { e.preventDefault(); setDragOver(c.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => onDrop(c.id, e)}
              className={`glass rounded-xl p-4 flex items-center justify-between hover-lift transition ${dragOver === c.id ? "ring-2 ring-primary bg-primary/10" : ""}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: c.color || "var(--secondary)" }}>
                  <Tag className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-display text-lg truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground">/{c.slug} · {counts[c.id] || 0} produtos</div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(c)}><Pencil className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(c.id)}><Trash className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="col-span-full glass rounded-xl p-10 text-center text-muted-foreground">Nenhuma categoria criada ainda.</div>}
        </div>
      </div>
      {editing && <CategoryDialog item={editing} onClose={() => { setEditing(null); load(); }} />}
    </PanelShell>
  );
}

function CategoryDialog({ item, onClose }: any) {
  const [f, setF] = useState({ name: "", slug: "", color: "", position: 0, ...item });
  async function save() {
    const slug = f.slug || slugify(f.name);
    const payload = { name: f.name, slug, color: f.color || null, position: Number(f.position) || 0 };
    const { error } = item.id
      ? await supabase.from("categories").update(payload).eq("id", item.id)
      : await supabase.from("categories").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); onClose();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass max-w-md">
        <DialogHeader><DialogTitle className="font-display text-2xl">{item.id ? "Editar" : "Nova"} categoria</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) })} /></div>
          <div><Label>Slug</Label><Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Ordem</Label><Input type="number" value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} /></div>
            <div><Label>Cor (opcional)</Label><Input type="color" value={f.color || "#e8d5c4"} onChange={(e) => setF({ ...f, color: e.target.value })} /></div>
          </div>
          <Button onClick={save} className="w-full bg-primary text-primary-foreground">Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
