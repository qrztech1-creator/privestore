import { createFileRoute, Link } from "@tanstack/react-router";
import { PanelShell } from "@/components/PanelShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Heart, Package, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/admin/")({ component: AdminHome });

function AdminHome() {
  const { isAdmin, loading } = useAuth();
  const [stats, setStats] = useState({ events: 0, products: 0, orders: 0 });
  useEffect(() => {
    Promise.all([
      supabase.from("events").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }),
    ]).then(([e, p, o]) => setStats({ events: e.count || 0, products: p.count || 0, orders: o.count || 0 }));
  }, []);

  if (!loading && !isAdmin) return <PanelShell mode="admin"><div className="p-10">Acesso restrito.</div></PanelShell>;

  const cards = [
    { label: "Noivas / Eventos", val: stats.events, icon: Heart, to: "/admin/eventos" },
    { label: "Produtos", val: stats.products, icon: Package, to: "/admin/produtos" },
    { label: "Pedidos", val: stats.orders, icon: ShoppingBag, to: "/admin/pedidos" },
  ];
  return (
    <PanelShell mode="admin">
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <h1 className="font-display text-4xl mb-2">Visão geral</h1>
        <p className="text-muted-foreground mb-8">Painel de administração da Privê.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {cards.map(c => (
            <Link key={c.label} to={c.to} className="glass rounded-2xl p-6 hover-lift">
              <c.icon className="w-6 h-6 text-primary mb-3" />
              <div className="font-display text-4xl text-gradient-gold">{c.val}</div>
              <div className="text-sm text-muted-foreground">{c.label}</div>
            </Link>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}
