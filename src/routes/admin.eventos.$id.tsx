import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { PanelShell } from "@/components/PanelShell";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EventEditor } from "@/components/EventEditor";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin/eventos/$id")({ component: AdminEventDetail });

function AdminEventDetail() {
  const { id } = useParams({ from: "/admin/eventos/$id" });
  const [event, setEvent] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);

  const load = useCallback(async () => {
    const { data: ev } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
    if (!ev) return;
    setEvent(ev);
    const [{ data: ep }, { data: prods }, { data: ords }, { data: invs }] = await Promise.all([
      supabase.from("event_products").select("*, product:products(*)").eq("event_id", id).order("position"),
      supabase.from("products").select("*").eq("active", true),
      supabase.from("orders").select("*, items:order_items(*)").eq("event_id", id).order("created_at", { ascending: false }),
      supabase.from("event_invites").select("*").eq("event_id", id).order("created_at", { ascending: false }),
    ]);
    setItems(ep || []); setProducts(prods || []); setOrders(ords || []); setInvites(invs || []);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const ops = {
    updateEvent: async (patch: any) => {
      const { error } = await supabase.from("events").update(patch).eq("id", id);
      if (error) throw error;
      setEvent({ ...event, ...patch });
    },
    addProduct: async (productId: string) => {
      await supabase.from("event_products").insert({ event_id: id, product_id: productId, desired_qty: 1, position: items.length });
      await load();
    },
    updateEventProduct: async (epId: string, patch: any) => {
      await supabase.from("event_products").update(patch).eq("id", epId);
      await load();
    },
    removeEventProduct: async (epId: string) => {
      await supabase.from("event_products").delete().eq("id", epId);
      await load();
    },
    reload: load,
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <PanelShell mode="admin">
      <div className="px-6 md:px-10 pt-6">
        <Link to="/admin/eventos" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"><ArrowLeft className="w-3 h-3" />voltar para Noivas</Link>
      </div>
      {event ? (
        <EventEditor event={event} items={items} products={products} orders={orders} invites={invites} ops={ops} isAdminMode={true} baseUrl={baseUrl} />
      ) : <div className="p-10 text-muted-foreground">Carregando...</div>}
    </PanelShell>
  );
}
