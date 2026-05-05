import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EventEditor } from "@/components/EventEditor";
import { Logo } from "@/components/Logo";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/g/$token")({ component: BrideArea });

function BrideArea() {
  const { token } = useParams({ from: "/g/$token" });
  const [event, setEvent] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const { data: ev, error } = await supabase.rpc("get_event_by_token", { _token: token });
    if (error || !ev) { setNotFound(true); setLoading(false); return; }
    setEvent(ev);
    const [{ data: ep }, { data: prods }, { data: ords }, { data: invs }] = await Promise.all([
      supabase.from("event_products").select("*, product:products(*)").eq("event_id", ev.id).order("position"),
      supabase.from("products").select("*").eq("active", true),
      supabase.rpc("get_orders_by_token", { _token: token }),
      supabase.from("event_invites").select("*").eq("event_id", ev.id).order("created_at", { ascending: false }),
    ]);
    setItems(ep || []); setProducts(prods || []); setOrders((ords as any) || []); setInvites(invs || []);
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

  const ops = {
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
      // direct update via RPC unsupported here for simplicity — use product_id lookup
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
    reload: load,
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/30 px-6 py-4 flex items-center justify-between">
        <Logo className="h-8" />
        <div className="text-xs uppercase tracking-[0.3em] text-primary/80">área da noiva</div>
      </header>
      <EventEditor event={event} items={items} products={products} orders={orders} invites={invites} ops={ops} isAdminMode={false} baseUrl={baseUrl} />
    </div>
  );
}
