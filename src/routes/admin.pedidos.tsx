import { createFileRoute } from "@tanstack/react-router";
import { PanelShell } from "@/components/PanelShell";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pedidos")({ component: AdminOrders });

function AdminOrders() {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [period, setPeriod] = useState("all");
  const [open, setOpen] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("orders").select("*, event:events(bride_name,slug), items:order_items(*)").order("created_at", { ascending: false });
    setOrders(data || []);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const cutoff = period === "all" ? 0 : Date.now() - parseInt(period) * 86400000;
    return orders.filter((o) => {
      if (cutoff && new Date(o.created_at).getTime() < cutoff) return false;
      if (status !== "all" && o.status !== status) return false;
      if (q && !o.guest_name.toLowerCase().includes(q.toLowerCase()) && !o.event?.bride_name?.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [orders, q, status, period]);

  const total = filtered.reduce((s, o) => s + Number(o.total), 0);

  async function setOrderStatus(id: string, st: string) {
    const patch: any = { status: st };
    if (st === "fulfilled") patch.delivered_at = new Date().toISOString();
    if (st === "paid") patch.paid_at = new Date().toISOString();
    await supabase.from("orders").update(patch).eq("id", id);
    toast.success("Atualizado"); load();
  }

  function exportCSV() {
    const rows = [["Data", "Noiva", "Convidada", "Telefone", "Email", "Total", "Status", "Itens"]];
    filtered.forEach((o) => rows.push([
      new Date(o.created_at).toLocaleString("pt-BR"),
      o.event?.bride_name || "",
      o.guest_name, o.guest_phone || "", o.guest_email || "",
      String(o.total), o.status,
      (o.items || []).map((i: any) => `${i.qty}x ${i.product_name}`).join("; "),
    ]));
    const csv = rows.map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `pedidos-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (!isAdmin) return <PanelShell mode="admin"><div className="p-10">Acesso restrito.</div></PanelShell>;

  return (
    <PanelShell mode="admin">
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <h1 className="font-display text-4xl">Pedidos</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} pedidos · Total <span className="text-primary">R$ {total.toFixed(2)}</span></p>
          </div>
          <Button variant="outline" onClick={exportCSV}><Download className="w-3 h-3 mr-1" />Exportar CSV</Button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por convidada ou noiva..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="fulfilled">Entregue</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo período</SelectItem>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {filtered.map((o) => {
            const isOpen = open === o.id;
            return (
              <div key={o.id} className="glass rounded-xl">
                <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setOpen(isOpen ? null : o.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{o.guest_name} <span className="text-muted-foreground text-xs">→ {o.event?.bride_name}</span></div>
                    <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")} · {o.guest_phone || o.guest_email || "—"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-primary font-display text-lg">R$ {Number(o.total).toFixed(2)}</div>
                    <div className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${o.status === "paid" ? "bg-emerald-500/20 text-emerald-300" : o.status === "fulfilled" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{o.status}</div>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
                {isOpen && (
                  <div className="border-t border-border/30 p-4 space-y-3">
                    {o.message && <p className="text-sm italic text-muted-foreground">"{o.message}"</p>}
                    <ul className="text-sm space-y-1">{o.items?.map((i: any) => <li key={i.id}>· {i.qty}× {i.product_name} — R$ {Number(i.unit_price).toFixed(2)}</li>)}</ul>
                    <div className="flex flex-wrap gap-2">
                      {o.status !== "paid" && <Button size="sm" variant="outline" onClick={() => setOrderStatus(o.id, "paid")}>Marcar pago</Button>}
                      {o.status !== "fulfilled" && <Button size="sm" variant="outline" onClick={() => setOrderStatus(o.id, "fulfilled")}>Marcar entregue</Button>}
                      {o.status !== "cancelled" && <Button size="sm" variant="ghost" onClick={() => setOrderStatus(o.id, "cancelled")}>Cancelar</Button>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <div className="glass rounded-2xl p-8 text-center text-muted-foreground">Nenhum pedido encontrado.</div>}
        </div>
      </div>
    </PanelShell>
  );
}
