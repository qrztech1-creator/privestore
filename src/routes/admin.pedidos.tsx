import { createFileRoute } from "@tanstack/react-router";
import { PanelShell } from "@/components/PanelShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin/pedidos")({ component: () => {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("orders").select("*, event:events(bride_name,slug), items:order_items(*)").order("created_at", { ascending: false })
      .then(({ data }) => setOrders(data || []));
  }, []);
  if (!isAdmin) return <PanelShell mode="admin"><div className="p-10">Acesso restrito.</div></PanelShell>;
  return (
    <PanelShell mode="admin">
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <h1 className="font-display text-4xl mb-6">Pedidos</h1>
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.id} className="glass rounded-xl p-4">
              <div className="flex justify-between"><div><div className="font-medium">{o.guest_name}</div><div className="text-xs text-muted-foreground">para {o.event?.bride_name} · {new Date(o.created_at).toLocaleString("pt-BR")}</div></div><div className="text-primary font-display text-xl">R$ {Number(o.total).toFixed(2)}</div></div>
              <ul className="mt-2 text-xs">{o.items?.map((i: any) => <li key={i.id}>· {i.qty}x {i.product_name}</li>)}</ul>
            </div>
          ))}
          {orders.length === 0 && <div className="glass rounded-2xl p-8 text-center text-muted-foreground">Nenhum pedido.</div>}
        </div>
      </div>
    </PanelShell>
  );
}});
