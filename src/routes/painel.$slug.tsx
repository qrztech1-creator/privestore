import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { PanelShell } from "@/components/PanelShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageInput } from "@/components/ImageInput";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, Trash, Plus, Sparkles, Heart, ShoppingBag, Link2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/painel/$slug")({ component: ManageEvent });

const PALETTES = [
  { name: "Champagne & Bordô", primary: "#d4a574", accent: "#8b3a4a", bg: "#1a1416", text: "#f7eee5" },
  { name: "Rosé & Marfim", primary: "#e8a4a8", accent: "#c97b8a", bg: "#1f1518", text: "#fdf2ef" },
  { name: "Esmeralda & Ouro", primary: "#d4b574", accent: "#3a6b5c", bg: "#0f1815", text: "#f0ede0" },
  { name: "Lilás & Prata", primary: "#c9b8d4", accent: "#7a6885", bg: "#161420", text: "#f5f0fa" },
  { name: "Nude & Cobre", primary: "#c9956b", accent: "#a85a3a", bg: "#1a1410", text: "#f7ece0" },
];

function ManageEvent() {
  const { slug } = useParams({ from: "/painel/$slug" });
  const { user, isAdmin } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase.from("events").select("*").eq("slug", slug).maybeSingle();
    setEvent(data);
  }
  useEffect(() => { load(); }, [slug]);

  async function save(patch: any) {
    setSaving(true);
    const { error } = await supabase.from("events").update(patch).eq("id", event.id);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Salvo"); setEvent({ ...event, ...patch }); }
  }

  if (!event) return <PanelShell><div className="p-10">Carregando...</div></PanelShell>;

  const isOwner = user?.id === event.owner_id;
  const mode = isAdmin && !isOwner ? "admin" : "bride";
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/n/${event.slug}` : "";

  return (
    <PanelShell mode={mode}>
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Link to={mode === "admin" ? "/admin/eventos" : "/painel"} className="text-xs text-muted-foreground hover:text-primary">← voltar</Link>
            <h1 className="font-display text-4xl mt-1">{event.bride_name}</h1>
            <div className="text-xs uppercase tracking-wider text-primary/80">{event.type.replace("_", " ")}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copiado"); }}>
              <Copy className="w-3 h-3 mr-1" />Copiar link
            </Button>
            <Button asChild size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
              <a href={`/n/${event.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="w-3 h-3 mr-1" />Abrir página</a>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="page" className="w-full">
          <TabsList className="glass">
            <TabsTrigger value="page"><Sparkles className="w-3 h-3 mr-1" />Página</TabsTrigger>
            <TabsTrigger value="list"><Heart className="w-3 h-3 mr-1" />Lista</TabsTrigger>
            <TabsTrigger value="orders"><ShoppingBag className="w-3 h-3 mr-1" />Pedidos</TabsTrigger>
            <TabsTrigger value="invites"><Link2 className="w-3 h-3 mr-1" />Convites</TabsTrigger>
          </TabsList>

          <TabsContent value="page" className="space-y-5 mt-6">
            <PageTab event={event} onSave={save} saving={saving} />
          </TabsContent>
          <TabsContent value="list" className="mt-6"><WishlistTab event={event} /></TabsContent>
          <TabsContent value="orders" className="mt-6"><OrdersTab event={event} /></TabsContent>
          <TabsContent value="invites" className="mt-6"><InvitesTab event={event} /></TabsContent>
        </Tabs>
      </div>
    </PanelShell>
  );
}

function PageTab({ event, onSave, saving }: any) {
  const [form, setForm] = useState(event);
  useEffect(() => setForm(event), [event.id]);
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  const palette = form.palette || {};

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4 glass rounded-2xl p-6">
        <h3 className="font-display text-2xl">Informações</h3>
        <div><Label>Nome da noiva</Label><Input value={form.bride_name || ""} onChange={(e) => set("bride_name", e.target.value)} /></div>
        <div><Label>Parceiro(a)</Label><Input value={form.partner_name || ""} onChange={(e) => set("partner_name", e.target.value)} /></div>
        <div><Label>Data do evento</Label><Input type="datetime-local" value={form.event_date ? new Date(form.event_date).toISOString().slice(0, 16) : ""} onChange={(e) => set("event_date", e.target.value)} /></div>
        <div><Label>Mensagem da noiva</Label><Textarea rows={4} value={form.message || ""} onChange={(e) => set("message", e.target.value)} placeholder="Compartilhe um recado especial..." /></div>
        <div><Label>WhatsApp (com DDI, ex: 5511999998888)</Label><Input value={form.whatsapp_number || ""} onChange={(e) => set("whatsapp_number", e.target.value)} /></div>
        <div><Label>Playlist (Spotify embed URL ou link)</Label><Input value={form.playlist_url || ""} onChange={(e) => set("playlist_url", e.target.value)} placeholder="https://open.spotify.com/embed/playlist/..." /></div>
        <div>
          <Label>Visibilidade</Label>
          <Select value={form.visibility} onValueChange={(v) => set("visibility", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Pública</SelectItem>
              <SelectItem value="private">Privada (só com link)</SelectItem>
              <SelectItem value="secret">Secreta (com código)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4 glass rounded-2xl p-6">
        <h3 className="font-display text-2xl">Visual</h3>
        <ImageInput
          label="Banner da página"
          value={form.banner_url}
          onChange={(url) => set("banner_url", url)}
          prompt={`${form.bride_name} ${form.partner_name || ""} ${form.type}`}
          folder={`events/${event.id}`}
        />
        <div>
          <Label className="mb-2 block">Paleta de cores</Label>
          <div className="grid grid-cols-2 gap-2">
            {PALETTES.map((p) => {
              const active = palette.primary === p.primary;
              return (
                <button type="button" key={p.name} onClick={() => set("palette", p)}
                  className={`p-3 rounded-xl border text-left transition ${active ? "border-primary ring-2 ring-primary/30" : "border-border"}`}>
                  <div className="flex gap-1 mb-2">
                    <div className="w-5 h-5 rounded-full" style={{ background: p.primary }} />
                    <div className="w-5 h-5 rounded-full" style={{ background: p.accent }} />
                    <div className="w-5 h-5 rounded-full border" style={{ background: p.bg }} />
                  </div>
                  <div className="text-xs">{p.name}</div>
                </button>
              );
            })}
          </div>
        </div>
        <Button disabled={saving} onClick={() => onSave({
          bride_name: form.bride_name, partner_name: form.partner_name, event_date: form.event_date || null,
          message: form.message, whatsapp_number: form.whatsapp_number, playlist_url: form.playlist_url,
          visibility: form.visibility, banner_url: form.banner_url, palette: form.palette,
        })} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar alterações
        </Button>
      </div>
    </div>
  );
}

function WishlistTab({ event }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    const { data: ep } = await supabase.from("event_products").select("*, product:products(*)").eq("event_id", event.id).order("position");
    setItems(ep || []);
    const { data: p } = await supabase.from("products").select("*").eq("active", true);
    setProducts(p || []);
  }
  useEffect(() => { load(); }, [event.id]);

  async function addProduct(productId: string) {
    const { error } = await supabase.from("event_products").insert({ event_id: event.id, product_id: productId, desired_qty: 1 });
    if (error) return toast.error(error.message);
    toast.success("Adicionado à lista");
    setShowAdd(false); load();
  }
  async function setQty(id: string, qty: number) {
    await supabase.from("event_products").update({ desired_qty: Math.max(1, qty) }).eq("id", id);
    load();
  }
  async function remove(id: string) {
    await supabase.from("event_products").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-display text-2xl">Lista de presentes</h3>
        <Button onClick={() => setShowAdd(!showAdd)}><Plus className="w-4 h-4 mr-1" />Adicionar produto</Button>
      </div>
      {showAdd && (
        <div className="glass rounded-2xl p-4">
          {products.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum produto no catálogo. Peça à admin para cadastrar.</p> :
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-96 overflow-auto">
              {products.filter(p => !items.find(i => i.product_id === p.id)).map(p => (
                <button key={p.id} onClick={() => addProduct(p.id)} className="text-left glass rounded-lg p-3 hover:border-primary border border-transparent">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-primary">R$ {Number(p.price).toFixed(2)}</div>
                </button>
              ))}
            </div>}
        </div>
      )}
      <div className="grid gap-3">
        {items.map((it) => (
          <div key={it.id} className="glass rounded-xl p-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-secondary overflow-hidden shrink-0">
              {it.product?.image_url && <img src={it.product.image_url} className="w-full h-full object-cover" alt="" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{it.product?.name}</div>
              <div className="text-xs text-muted-foreground">R$ {Number(it.product?.price || 0).toFixed(2)} · comprados: {it.purchased_qty}/{it.desired_qty}</div>
            </div>
            <div className="flex items-center gap-2">
              <Input type="number" min={1} className="w-20" value={it.desired_qty} onChange={(e) => setQty(it.id, +e.target.value)} />
              <Button variant="ghost" size="icon" onClick={() => remove(it.id)}><Trash className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">Nenhum item ainda. Adicione produtos do catálogo.</div>}
      </div>
    </div>
  );
}

function OrdersTab({ event }: any) {
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("orders").select("*, items:order_items(*)").eq("event_id", event.id).order("created_at", { ascending: false })
      .then(({ data }) => setOrders(data || []));
  }, [event.id]);
  return (
    <div className="space-y-3">
      {orders.length === 0 ? <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">Nenhum pedido ainda.</div> :
        orders.map(o => (
          <div key={o.id} className="glass rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{o.guest_name}</div>
                <div className="text-xs text-muted-foreground">{o.guest_phone} · {new Date(o.created_at).toLocaleString("pt-BR")}</div>
              </div>
              <div className="text-right"><div className="text-primary font-display text-xl">R$ {Number(o.total).toFixed(2)}</div><div className="text-[10px] uppercase">{o.status}</div></div>
            </div>
            {o.message && <p className="mt-2 text-sm italic text-muted-foreground">"{o.message}"</p>}
            <ul className="mt-2 text-xs">{o.items?.map((i: any) => <li key={i.id}>· {i.qty}x {i.product_name}</li>)}</ul>
          </div>
        ))}
    </div>
  );
}

function InvitesTab({ event }: any) {
  const [invites, setInvites] = useState<any[]>([]);
  const [label, setLabel] = useState("");
  async function load() {
    const { data } = await supabase.from("event_invites").select("*").eq("event_id", event.id).order("created_at", { ascending: false });
    setInvites(data || []);
  }
  useEffect(() => { load(); }, [event.id]);
  async function create() {
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    await supabase.from("event_invites").insert({ event_id: event.id, token, guest_label: label || null });
    setLabel(""); load();
  }
  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4 flex gap-2">
        <Input placeholder="Nome da convidada (opcional)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <Button onClick={create}><Plus className="w-4 h-4 mr-1" />Gerar convite</Button>
      </div>
      <div className="space-y-2">
        {invites.map(i => {
          const url = typeof window !== "undefined" ? `${window.location.origin}/n/${event.slug}?t=${i.token}` : "";
          return (
            <div key={i.id} className="glass rounded-xl p-3 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm">{i.guest_label || "Convidada"}</div>
                <div className="text-xs text-muted-foreground truncate">{url}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast.success("Copiado"); }}><Copy className="w-3 h-3" /></Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
