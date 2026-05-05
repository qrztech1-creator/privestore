import { createFileRoute, Link } from "@tanstack/react-router";
import { PanelShell } from "@/components/PanelShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Plus, Settings, ExternalLink } from "lucide-react";
import { CreateEventDialog } from "@/components/CreateEventDialog";

export const Route = createFileRoute("/admin/eventos")({ component: AdminEvents });

function AdminEvents() {
  const { isAdmin, loading } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  async function load() {
    const { data } = await supabase.from("events").select("*, owner:profiles(full_name,email)").order("created_at", { ascending: false });
    setEvents(data || []);
  }
  useEffect(() => { load(); }, []);
  if (!loading && !isAdmin) return <PanelShell mode="admin"><div className="p-10">Acesso restrito.</div></PanelShell>;
  return (
    <PanelShell mode="admin">
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="flex justify-between mb-6">
          <h1 className="font-display text-4xl">Noivas / Eventos</h1>
          <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />Novo</Button>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(e => (
            <div key={e.id} className="glass rounded-2xl overflow-hidden hover-lift">
              <div className="aspect-[16/9] bg-secondary">{e.banner_url ? <img src={e.banner_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />}</div>
              <div className="p-4">
                <div className="text-xs uppercase text-primary/80">{e.type.replace("_", " ")}</div>
                <h3 className="font-display text-2xl">{e.bride_name}</h3>
                <div className="text-xs text-muted-foreground">{e.owner?.email || "—"}</div>
                <div className="flex gap-2 mt-3">
                  <Button asChild size="sm" variant="outline" className="flex-1"><Link to="/painel/$slug" params={{ slug: e.slug }}><Settings className="w-3 h-3 mr-1" />Gerenciar</Link></Button>
                  <Button asChild size="sm" variant="ghost"><a href={`/n/${e.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="w-3 h-3" /></a></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <CreateEventDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </PanelShell>
  );
}
