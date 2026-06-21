import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EventEditor, type EventOps } from "@/components/EventEditor";
import { Logo } from "@/components/Logo";
import { Lock, LayoutDashboard, FileEdit, Heart, Users, ShoppingBag, ExternalLink, Copy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/Countdown";
import { toast } from "sonner";

export const Route = createFileRoute("/g/$token")({ component: BrideArea });

type View = "overview" | "page" | "list" | "guests" | "orders";

const NAV: { id: View; label: string; icon: typeof Heart }[] = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
  { id: "page", label: "Página do Evento", icon: FileEdit },
  { id: "list", label: "Lista de Desejos", icon: Heart },
  { id: "guests", label: "Convidadas", icon: Users },
  { id: "orders", label: "Presentes Recebidos", icon: ShoppingBag },
];

function BrideArea() {
  const { token } = useParams({ from: "/g/$token" });
  const [event, setEvent] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [view, setView] = useState<View>("overview");

  const load = useCallback(async () => {
    const { data: ev, error } = await supabase.rpc("get_event_by_token", { _token: token });
    if (error || !ev) { setNotFound(true); setLoading(false); return; }
    setEvent(ev);
    const [{ data: ep }, { data: prods }, { data: ords }, { data: invs }] = await Promise.all([
      // SECURITY DEFINER RPC — works for the manage_token holder even when anon.
      supabase.rpc("get_event_products_for_guest", { _event_id: (ev as any).id, _token: token }),
      supabase.from("products").select("*, variants:product_variants(*), images:product_images(*)").eq("active", true),
      supabase.rpc("get_orders_by_token", { _token: token }),
      supabase.rpc("list_invites_by_token", { _token: token }),
    ]);
    setItems(Array.isArray(ep) ? ep : []);
    setProducts(prods || []);
    setOrders((ords as any) || []);
    setInvites((invs as any) || []);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="glass rounded-3xl p-10 max-w-md text-center">
        <Lock className="w-10 h-10 text-primary mx-auto mb-4" />
        <h1 className="font-display text-3xl mb-2">Link inválido</h1>
        <p className="text-muted-foreground text-sm">Este link de gerenciamento não existe ou foi revogado. Fale com a Privê.</p>
      </div>
    </div>
  );

  const ops: EventOps = {
    updateEvent: async (patch: any) => {
      const { data, error } = await supabase.rpc("update_event_by_token", { _token: token, _patch: patch });
      if (error) throw error;
      setEvent(data);
    },
    addProduct: async (productId: string) => {
      const { error } = await supabase.rpc("upsert_event_product_by_token", {
        _token: token, _product_id: productId, _desired_qty: 1, _is_favorite: false, _position: items.length,
      });
      if (error) throw error;
      await load();
    },
    updateEventProduct: async (id: string, patch: any) => {
      const ep = items.find((i) => i.id === id);
      if (!ep) return;
      await supabase.rpc("upsert_event_product_by_token", {
        _token: token, _product_id: ep.product_id,
        _desired_qty: patch.desired_qty ?? ep.desired_qty,
        _is_favorite: patch.is_favorite ?? ep.is_favorite,
        _position: patch.position ?? ep.position,
      });
      await load();
    },
    removeEventProduct: async (id: string) => {
      const { error } = await supabase.rpc("remove_event_product_by_token", { _token: token, _ep_id: id });
      if (error) throw error;
      await load();
    },
    createInvite: async (label: string) => {
      const { error } = await supabase.rpc("create_invite_by_token", { _token: token, _label: label || "" });
      if (error) throw error;
      await load();
    },
    deleteInvite: async (inviteId: string) => {
      const { error } = await supabase.rpc("delete_invite_by_token", { _token: token, _invite_id: inviteId });
      if (error) throw error;
      await load();
    },
    reload: load,
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${baseUrl}/n/${event.slug}`;
  const totalPurchased = items.reduce((s, i) => s + (i.purchased_qty || 0), 0);
  const totalDesired = items.reduce((s, i) => s + (i.desired_qty || 0), 0);
  const guestSet = new Set(invites.map((i) => i.guest_label).filter(Boolean));

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border hidden md:flex flex-col">
        <div className="p-5 flex items-center gap-3">
          <Logo className="h-9 w-9 rounded-full" />
          <div>
            <div className="font-display text-lg leading-none">Área da Noiva</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((it) => {
            const Icon = it.icon;
            const active = view === it.id;
            return (
              <button key={it.id} onClick={() => setView(it.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition text-left ${
                  active ? "bg-primary text-primary-foreground font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                }`}>
                <Icon className="w-4 h-4" />{it.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border text-[10px] text-muted-foreground px-4">Plataforma Privê</div>
      </aside>

      <main className="flex-1 min-w-0">
        {view === "overview" ? (
          <div className="p-6 md:p-10 max-w-6xl mx-auto">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-primary/80">{event.type.replace("_", " ")}</div>
                <h1 className="font-display text-4xl mt-1">{event.bride_name}</h1>
                {event.event_date && <div className="text-sm text-muted-foreground mt-1">📅 {new Date(event.event_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</div>}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" asChild><a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-3 h-3 mr-1" />Pré-visualizar</a></Button>
                <Button variant="outline" size="sm" asChild><a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-3 h-3 mr-1" />Página pública</a></Button>
                <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copiado"); }}>
                  <Copy className="w-3 h-3 mr-1" />Copiar link
                </Button>
              </div>
            </div>

            {event.event_date && (
              <div className="glass rounded-2xl p-6 mb-6">
                <div className="text-xs uppercase tracking-[0.3em] text-primary/80 text-center mb-4">Faltam para o seu dia</div>
                <Countdown target={event.event_date} />
              </div>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard icon={Heart} label="Itens na Lista" value={items.length} />
              <StatCard icon={ShoppingBag} label="Presentes Recebidos" value={`${totalPurchased}/${totalDesired}`} />
              <StatCard icon={Users} label="Convidadas" value={guestSet.size || invites.length} />
              <StatCard icon={ShoppingBag} label="Pedidos" value={orders.length} />
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="glass rounded-2xl p-5">
                <h3 className="font-display text-2xl mb-4">Últimos presentes</h3>
                {orders.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">Ainda não chegou nenhum presente — em breve!</p>
                ) : (
                  <ul className="space-y-3">
                    {orders.slice(0, 5).map((o: any) => (
                      <li key={o.id} className="flex justify-between text-sm">
                        <span>{o.guest_name}</span>
                        <span className="text-primary">R$ {Number(o.total).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <button onClick={() => setView("orders")} className="mt-4 text-xs uppercase tracking-wider text-primary border-b border-primary inline-block">Ver todos</button>
              </div>

              <div className="glass rounded-2xl p-5">
                <h3 className="font-display text-2xl mb-4">Acesso rápido</h3>
                <div className="space-y-2">
                  <QuickLink label="Editar minha página" onClick={() => setView("page")} />
                  <QuickLink label="Gerenciar lista de desejos" onClick={() => setView("list")} />
                  <QuickLink label="Compartilhar com convidadas" onClick={() => setView("guests")} />
                  <QuickLink label="Ver presentes recebidos" onClick={() => setView("orders")} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EventEditor
            event={event} items={items} products={products} orders={orders} invites={invites}
            ops={ops} isAdminMode={false} baseUrl={baseUrl}
            initialTab={view === "page" ? "page" : view === "list" ? "list" : view === "guests" ? "invites" : "orders"}
          />
        )}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Heart; label: string; value: number | string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <Icon className="w-4 h-4 text-primary mb-2" />
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="font-display text-3xl mt-1">{value}</div>
    </div>
  );
}

function QuickLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary hover:bg-secondary/30 transition text-sm">
      <span>{label}</span>
      <ArrowRight className="w-4 h-4 text-primary" />
    </button>
  );
}
