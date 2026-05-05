import { createFileRoute, Link } from "@tanstack/react-router";
import { PanelShell } from "@/components/PanelShell";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Heart, Package, ShoppingBag, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";

export const Route = createFileRoute("/admin/")({ component: AdminHome });

const COLORS = ["#d4a574", "#8b3a4a", "#c9956b", "#7a6885", "#3a6b5c"];

function AdminHome() {
  const { isAdmin, loading } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [period, setPeriod] = useState<"7" | "30" | "90" | "365">("30");

  useEffect(() => {
    Promise.all([
      supabase.from("events").select("*"),
      supabase.from("orders").select("*, items:order_items(*), event:events(bride_name)"),
      supabase.from("products").select("*"),
    ]).then(([e, o, p]) => { setEvents(e.data || []); setOrders(o.data || []); setProducts(p.data || []); });
  }, []);

  const filteredOrders = useMemo(() => {
    const cutoff = Date.now() - parseInt(period) * 86400000;
    return orders.filter((o) => new Date(o.created_at).getTime() >= cutoff);
  }, [orders, period]);

  const totalRevenue = filteredOrders.reduce((s, o) => s + Number(o.total), 0);
  const paidRevenue = filteredOrders.filter((o) => o.status === "paid" || o.status === "fulfilled").reduce((s, o) => s + Number(o.total), 0);
  const avgTicket = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;
  const activeEvents = events.filter((e) => e.status === "active").length;

  const revenueByDay = useMemo(() => {
    const map = new Map<string, number>();
    const days = parseInt(period);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      map.set(d, 0);
    }
    filteredOrders.forEach((o) => {
      const d = new Date(o.created_at).toISOString().slice(0, 10);
      if (map.has(d)) map.set(d, (map.get(d) || 0) + Number(o.total));
    });
    return Array.from(map.entries()).map(([date, total]) => ({ date: date.slice(5), total }));
  }, [filteredOrders, period]);

  const ordersByStatus = useMemo(() => {
    const map = new Map<string, number>();
    filteredOrders.forEach((o) => map.set(o.status, (map.get(o.status) || 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  const topBrides = useMemo(() => {
    const map = new Map<string, number>();
    filteredOrders.forEach((o) => {
      const k = o.event?.bride_name || "—";
      map.set(k, (map.get(k) || 0) + Number(o.total));
    });
    return Array.from(map.entries()).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [filteredOrders]);

  if (!loading && !isAdmin) return <PanelShell mode="admin"><div className="p-10">Acesso restrito.</div></PanelShell>;

  const kpis = [
    { label: "Receita (período)", val: `R$ ${totalRevenue.toFixed(2)}`, sub: `Pagos: R$ ${paidRevenue.toFixed(2)}`, icon: DollarSign },
    { label: "Pedidos", val: filteredOrders.length, sub: `Ticket médio R$ ${avgTicket.toFixed(2)}`, icon: ShoppingBag },
    { label: "Noivas ativas", val: activeEvents, sub: `${events.length} no total`, icon: Heart, to: "/admin/eventos" },
    { label: "Catálogo", val: products.length, sub: `${products.filter((p) => p.active).length} ativos`, icon: Package, to: "/admin/produtos" },
  ];

  return (
    <PanelShell mode="admin">
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl">Visão geral</h1>
            <p className="text-sm text-muted-foreground">Indicadores em tempo real da boutique.</p>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-[180px]"><Calendar className="w-3 h-3 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((c) => {
            const Inner = (
              <>
                <c.icon className="w-5 h-5 text-primary mb-2" />
                <div className="font-display text-3xl text-gradient-gold">{c.val}</div>
                <div className="text-sm">{c.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{c.sub}</div>
              </>
            );
            return c.to ? (
              <Link key={c.label} to={c.to} className="glass rounded-2xl p-5 hover-lift block">{Inner}</Link>
            ) : (
              <div key={c.label} className="glass rounded-2xl p-5">{Inner}</div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="glass rounded-2xl p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-3"><h3 className="font-display text-xl">Receita</h3><TrendingUp className="w-4 h-4 text-primary" /></div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueByDay}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4a574" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#d4a574" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#3a2a2a" />
                <XAxis dataKey="date" stroke="#aaa" fontSize={11} />
                <YAxis stroke="#aaa" fontSize={11} />
                <Tooltip contentStyle={{ background: "#1a1416", border: "1px solid #d4a57440" }} />
                <Area type="monotone" dataKey="total" stroke="#d4a574" fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="font-display text-xl mb-3">Pedidos por status</h3>
            {ordersByStatus.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p> :
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={ordersByStatus} dataKey="value" nameKey="name" outerRadius={80} label>
                    {ordersByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-display text-xl mb-3">Top noivas (receita)</h3>
          {topBrides.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Sem pedidos no período.</p> :
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topBrides}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3a2a2a" />
                <XAxis dataKey="name" stroke="#aaa" fontSize={11} />
                <YAxis stroke="#aaa" fontSize={11} />
                <Tooltip contentStyle={{ background: "#1a1416", border: "1px solid #d4a57440" }} />
                <Bar dataKey="total" fill="#d4a574" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>}
        </div>
      </div>
    </PanelShell>
  );
}
