import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageInput } from "@/components/ImageInput";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, Trash, Plus, Sparkles, Heart, ShoppingBag, Link2, Settings, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";

const PALETTES = [
  { name: "Champagne & Bordô", primary: "#d4a574", accent: "#8b3a4a", bg: "#1a1416", text: "#f7eee5" },
  { name: "Rosé & Marfim", primary: "#e8a4a8", accent: "#c97b8a", bg: "#1f1518", text: "#fdf2ef" },
  { name: "Esmeralda & Ouro", primary: "#d4b574", accent: "#3a6b5c", bg: "#0f1815", text: "#f0ede0" },
  { name: "Lilás & Prata", primary: "#c9b8d4", accent: "#7a6885", bg: "#161420", text: "#f5f0fa" },
  { name: "Nude & Cobre", primary: "#c9956b", accent: "#a85a3a", bg: "#1a1410", text: "#f7ece0" },
];

export interface EventOps {
  updateEvent: (patch: any) => Promise<any>;
  addProduct: (productId: string) => Promise<void>;
  updateEventProduct: (id: string, patch: { desired_qty?: number; is_favorite?: boolean; position?: number }) => Promise<void>;
  removeEventProduct: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

export function EventEditor({
  event, items, products, orders, invites, ops, isAdminMode, baseUrl, initialTab = "page",
}: {
  event: any;
  items: any[];
  products: any[];
  orders: any[];
  invites: any[];
  ops: EventOps;
  isAdminMode: boolean;
  baseUrl: string;
  initialTab?: string;
}) {
  const publicUrl = `${baseUrl}/n/${event.slug}`;
  const manageUrl = event.manage_token ? `${baseUrl}/g/${event.manage_token}` : "";

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-primary/80">{event.type.replace("_", " ")}</div>
          <h1 className="font-display text-4xl mt-1">{event.bride_name}{event.partner_name && <span className="text-muted-foreground"> & {event.partner_name}</span>}</h1>
          {event.event_date && <div className="text-xs text-muted-foreground mt-1">{new Date(event.event_date).toLocaleString("pt-BR")}</div>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link público copiado"); }}>
            <Copy className="w-3 h-3 mr-1" />Link público
          </Button>
          <Button asChild size="sm" className="bg-primary text-primary-foreground">
            <a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-3 h-3 mr-1" />Abrir página</a>
          </Button>
        </div>
      </div>

      <Tabs key={initialTab} defaultValue={initialTab} className="w-full">
        <TabsList className="glass flex-wrap h-auto">
          <TabsTrigger value="page"><Sparkles className="w-3 h-3 mr-1" />Página</TabsTrigger>
          <TabsTrigger value="list"><Heart className="w-3 h-3 mr-1" />Lista</TabsTrigger>
          <TabsTrigger value="orders"><ShoppingBag className="w-3 h-3 mr-1" />Pedidos {orders.length > 0 && <span className="ml-1 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px]">{orders.length}</span>}</TabsTrigger>
          <TabsTrigger value="invites"><Link2 className="w-3 h-3 mr-1" />Convites</TabsTrigger>
          {isAdminMode && <TabsTrigger value="config"><Settings className="w-3 h-3 mr-1" />Configurações</TabsTrigger>}
        </TabsList>

        <TabsContent value="page" className="mt-6">
          <PageTab event={event} updateEvent={ops.updateEvent} />
        </TabsContent>
        <TabsContent value="list" className="mt-6">
          <WishlistTab items={items} products={products} ops={ops} />
        </TabsContent>
        <TabsContent value="orders" className="mt-6">
          <OrdersTab orders={orders} eventId={event.id} reload={ops.reload} canEdit={isAdminMode} />
        </TabsContent>
        <TabsContent value="invites" className="mt-6">
          <InvitesTab event={event} invites={invites} reload={ops.reload} baseUrl={baseUrl} />
        </TabsContent>
        {isAdminMode && (
          <TabsContent value="config" className="mt-6">
            <ConfigTab event={event} manageUrl={manageUrl} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function PageTab({ event, updateEvent }: any) {
  const [form, setForm] = useState(event);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(event), [event.id]);
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  const palette = form.palette || {};

  async function save() {
    setSaving(true);
    try {
      await updateEvent({
        bride_name: form.bride_name, partner_name: form.partner_name,
        event_date: form.event_date || null, message: form.message,
        whatsapp_number: form.whatsapp_number, playlist_url: form.playlist_url,
        visibility: form.visibility, banner_url: form.banner_url, palette: form.palette,
        thank_you_message: form.thank_you_message,
      });
      toast.success("Salvo ✨");
    } catch (e: any) { toast.error(e.message || "Erro ao salvar"); }
    finally { setSaving(false); }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4 glass rounded-2xl p-6">
        <h3 className="font-display text-2xl">Informações</h3>
        <div><Label>Nome da noiva</Label><Input value={form.bride_name || ""} onChange={(e) => set("bride_name", e.target.value)} /></div>
        <div><Label>Parceiro(a)</Label><Input value={form.partner_name || ""} onChange={(e) => set("partner_name", e.target.value)} /></div>
        <div><Label>Data do evento</Label><Input type="datetime-local" value={form.event_date ? new Date(form.event_date).toISOString().slice(0, 16) : ""} onChange={(e) => set("event_date", e.target.value)} /></div>
        <div><Label>Mensagem da noiva</Label><Textarea rows={4} value={form.message || ""} onChange={(e) => set("message", e.target.value)} placeholder="Compartilhe um recado especial..." /></div>
        <div><Label>WhatsApp (DDI+DDD+número)</Label><Input value={form.whatsapp_number || ""} onChange={(e) => set("whatsapp_number", e.target.value)} placeholder="5511999998888" /></div>
        <div><Label>Playlist (link Spotify)</Label><Input value={form.playlist_url || ""} onChange={(e) => set("playlist_url", e.target.value)} placeholder="https://open.spotify.com/playlist/..." /></div>
        <div><Label>Mensagem de agradecimento (após pedido)</Label><Textarea rows={3} value={form.thank_you_message || ""} onChange={(e) => set("thank_you_message", e.target.value)} placeholder="Muito obrigada pelo carinho..." /></div>
        <div>
          <Label>Visibilidade</Label>
          <Select value={form.visibility} onValueChange={(v) => set("visibility", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Pública (qualquer pessoa)</SelectItem>
              <SelectItem value="private">Privada (só com link de convite)</SelectItem>
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
        <Button disabled={saving} onClick={save} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar alterações
        </Button>
      </div>
    </div>
  );
}

function WishlistTab({ items, products, ops }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = products.filter((p: any) => !items.find((i: any) => i.product_id === p.id) && (search === "" || p.name.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-display text-2xl">Lista de presentes ({items.length})</h3>
        <Button onClick={() => setShowAdd(!showAdd)}><Plus className="w-4 h-4 mr-1" />{showAdd ? "Fechar" : "Adicionar"}</Button>
      </div>
      {showAdd && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <Input placeholder="Buscar no catálogo..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {filtered.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum produto disponível.</p> :
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-96 overflow-auto">
              {filtered.map((p: any) => (
                <button key={p.id} onClick={async () => { await ops.addProduct(p.id); toast.success("Adicionado"); }} className="text-left glass rounded-lg p-3 hover:border-primary border border-transparent">
                  {p.image_url && <img src={p.image_url} alt="" loading="lazy" className="w-full aspect-square object-cover rounded mb-2" />}
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-primary">R$ {Number(p.price).toFixed(2)}</div>
                </button>
              ))}
            </div>}
        </div>
      )}
      <div className="grid gap-3">
        {items.map((it: any) => (
          <div key={it.id} className="glass rounded-xl p-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-secondary overflow-hidden shrink-0">
              {it.product?.image_url && <img loading="lazy" src={it.product.image_url} className="w-full h-full object-cover" alt="" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{it.product?.name}</div>
              <div className="text-xs text-muted-foreground">R$ {Number(it.product?.price || 0).toFixed(2)} · presenteados {it.purchased_qty}/{it.desired_qty}</div>
            </div>
            <div className="flex items-center gap-2">
              <Input type="number" min={1} className="w-20" defaultValue={it.desired_qty}
                onBlur={(e) => ops.updateEventProduct(it.id, { desired_qty: Math.max(1, +e.target.value) })} />
              <Button variant="ghost" size="icon" onClick={async () => { await ops.removeEventProduct(it.id); }}><Trash className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">Nenhum item ainda. Adicione produtos do catálogo.</div>}
      </div>
    </div>
  );
}

function OrdersTab({ orders, canEdit, reload }: any) {
  async function markDelivered(id: string) {
    await supabase.from("orders").update({ delivered_at: new Date().toISOString(), status: "delivered" }).eq("id", id);
    toast.success("Marcado como entregue");
    reload();
  }
  return (
    <div className="space-y-3">
      {orders.length === 0 ? <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">Nenhum pedido ainda.</div> :
        orders.map((o: any) => (
          <div key={o.id} className="glass rounded-xl p-4">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <div className="font-medium">{o.guest_name}</div>
                <div className="text-xs text-muted-foreground">{o.guest_phone || o.guest_email || "—"} · {new Date(o.created_at).toLocaleString("pt-BR")}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-primary font-display text-xl">R$ {Number(o.total).toFixed(2)}</div>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${o.status === "paid" ? "bg-emerald-500/20 text-emerald-300" : o.status === "delivered" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{o.status}</span>
              </div>
            </div>
            {o.message && <p className="mt-2 text-sm italic text-muted-foreground">"{o.message}"</p>}
            {o.items && <ul className="mt-2 text-xs space-y-0.5">{o.items.map((i: any) => <li key={i.id}>· {i.qty}× {i.product_name} — R$ {Number(i.unit_price).toFixed(2)}</li>)}</ul>}
            {canEdit && o.status !== "delivered" && (
              <Button size="sm" variant="outline" className="mt-3" onClick={() => markDelivered(o.id)}>Marcar como entregue</Button>
            )}
          </div>
        ))}
    </div>
  );
}

function InvitesTab({ event, invites, reload, baseUrl }: any) {
  const [label, setLabel] = useState("");
  async function create() {
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    await supabase.from("event_invites").insert({ event_id: event.id, token, guest_label: label || null });
    setLabel(""); reload();
  }
  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4 flex gap-2">
        <Input placeholder="Nome da convidada (opcional)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <Button onClick={create}><Plus className="w-4 h-4 mr-1" />Gerar convite</Button>
      </div>
      <div className="space-y-2">
        {invites.map((i: any) => {
          const url = `${baseUrl}/n/${event.slug}?t=${i.token}`;
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
        {invites.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">Nenhum convite gerado ainda.</p>}
      </div>
    </div>
  );
}

function ConfigTab({ event, manageUrl }: any) {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="glass rounded-2xl p-6 space-y-4">
        <h3 className="font-display text-2xl">Link da noiva</h3>
        <p className="text-sm text-muted-foreground">Envie este link exclusivo para a noiva. Ela poderá editar a página dela sem precisar de login.</p>
        <div className="flex gap-2">
          <Input readOnly value={manageUrl} className="font-mono text-xs" />
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(manageUrl); toast.success("Copiado"); }}><Copy className="w-3 h-3" /></Button>
        </div>
        <div className="text-xs text-muted-foreground">⚠ Quem tiver esse link consegue editar. Compartilhe apenas com a noiva.</div>
      </div>
      <div className="glass rounded-2xl p-6 text-center">
        <h3 className="font-display text-2xl mb-3">QR Code da página pública</h3>
        <div className="bg-white p-4 rounded-xl inline-block">
          <QRCodeSVG value={`${typeof window !== "undefined" ? window.location.origin : ""}/n/${event.slug}`} size={200} />
        </div>
        <div className="mt-3 text-xs text-muted-foreground flex items-center justify-center gap-1"><QrCode className="w-3 h-3" />Imprima no convite</div>
      </div>
    </div>
  );
}
