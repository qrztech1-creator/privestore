import { createFileRoute, Link } from "@tanstack/react-router";
import { PanelShell } from "@/components/PanelShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Settings, ExternalLink, Copy, Search, Link2 } from "lucide-react";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/eventos")({ component: AdminEvents });

function AdminEvents() {
  const { isAdmin, loading } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");

  async function load() {
    const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    setEvents(data || []);
  }
  useEffect(() => { load(); }, []);

  if (!loading && !isAdmin) return <PanelShell mode="admin"><div className="p-10">Acesso restrito.</div></PanelShell>;

  const filtered = events.filter((e) => (q === "" || e.bride_name.toLowerCase().includes(q.toLowerCase()) || (e.partner_name || "").toLowerCase().includes(q.toLowerCase())) && (type === "all" || e.type === type));

  function copyManageLink(ev: any) {
    const url = `${window.location.origin}/g/${ev.manage_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link da noiva copiado");
  }

  return (
    <PanelShell mode="admin">
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div>
            <h1 className="font-display text-4xl">Noivas</h1>
            <p className="text-sm text-muted-foreground">{events.length} cadastradas · {filtered.length} exibidas</p>
          </div>
          <Button onClick={() => setOpen(true)} className="bg-gradient-to-r from-primary to-accent text-primary-foreground"><Plus className="w-4 h-4 mr-1" />Nova noiva</Button>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {[
            { v: "all", l: "Todos" }, { v: "casamento", l: "Casamento" },
            { v: "cha_lingerie", l: "Chá" }, { v: "despedida_solteira", l: "Despedida" },
          ].map((t) => (
            <Button key={t.v} size="sm" variant={type === t.v ? "default" : "outline"} onClick={() => setType(t.v)}>{t.l}</Button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((e) => (
            <div key={e.id} className="glass rounded-2xl overflow-hidden hover-lift">
              <div className="aspect-[16/9] bg-secondary relative">
                {e.banner_url ? <img loading="lazy" src={e.banner_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />}
                <div className="absolute top-2 right-2 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full glass">{e.visibility}</div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <div className="text-xs uppercase text-primary/80">{e.type.replace("_", " ")}</div>
                  <h3 className="font-display text-2xl">{e.bride_name}</h3>
                  {e.event_date && <div className="text-xs text-muted-foreground">{new Date(e.event_date).toLocaleDateString("pt-BR")}</div>}
                </div>
                <div className="flex gap-1.5">
                  <Button asChild size="sm" variant="outline" className="flex-1"><Link to="/admin/eventos/$id" params={{ id: e.id }}><Settings className="w-3 h-3 mr-1" />Gerenciar</Link></Button>
                  <Button size="sm" variant="ghost" title="Link da noiva" onClick={() => copyManageLink(e)}><Link2 className="w-3 h-3" /></Button>
                  <Button asChild size="sm" variant="ghost" title="Página pública"><a href={`/n/${e.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="w-3 h-3" /></a></Button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full glass rounded-2xl p-12 text-center text-muted-foreground">
              Nenhuma noiva encontrada. <button onClick={() => setOpen(true)} className="underline text-primary">Cadastrar a primeira</button>.
            </div>
          )}
        </div>
      </div>
      <CreateEventDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </PanelShell>
  );
}
