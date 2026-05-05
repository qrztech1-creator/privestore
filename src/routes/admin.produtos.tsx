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
import { Plus, Trash, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/produtos")({ component: AdminProducts });

function AdminProducts() {
  const { isAdmin, loading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);

  async function load() {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  }
  useEffect(() => { load(); }, []);

  if (!loading && !isAdmin) return <PanelShell mode="admin"><div className="p-10">Acesso restrito.</div></PanelShell>;

  async function remove(id: string) {
    if (!confirm("Excluir produto?")) return;
    await supabase.from("products").delete().eq("id", id);
    load();
  }

  return (
    <PanelShell mode="admin">
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="flex justify-between mb-6">
          <h1 className="font-display text-4xl">Catálogo</h1>
          <Button onClick={() => setEditing({})}><Plus className="w-4 h-4 mr-1" />Novo produto</Button>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(p => (
            <div key={p.id} className="glass rounded-2xl overflow-hidden hover-lift">
              <div className="aspect-square bg-secondary">{p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}</div>
              <div className="p-3">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-primary font-display text-lg">R$ {Number(p.price).toFixed(2)}</div>
                <div className="flex gap-1 mt-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(p)}><Pencil className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash className="w-3 h-3" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {editing && <ProductDialog item={editing} onClose={() => { setEditing(null); load(); }} />}
    </PanelShell>
  );
}

function ProductDialog({ item, onClose }: any) {
  const [f, setF] = useState({ name: "", description: "", price: 0, image_url: "", category: "", ...item });
  const set = (k: string, v: any) => setF({ ...f, [k]: v });
  async function save() {
    const payload = { name: f.name, description: f.description, price: f.price, image_url: f.image_url, category: f.category, active: true };
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
