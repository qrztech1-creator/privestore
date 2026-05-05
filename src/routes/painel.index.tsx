import { createFileRoute, Link } from "@tanstack/react-router";
import { PanelShell } from "@/components/PanelShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, ExternalLink, Settings } from "lucide-react";
import { CreateEventDialog } from "@/components/CreateEventDialog";

export const Route = createFileRoute("/painel/")({ component: Painel });

function Painel() {
  const { user, isAdmin } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    if (!user) return;
    const q = supabase.from("events").select("*").order("created_at", { ascending: false });
    const { data } = isAdmin ? await q : await q.eq("owner_id", user.id);
    setEvents(data || []);
  }
  useEffect(() => { load(); }, [user, isAdmin]);

  return (
    <PanelShell>
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl">Meus eventos</h1>
            <p className="text-muted-foreground text-sm mt-1">Crie e gerencie suas páginas exclusivas.</p>
          </div>
          <Button onClick={() => setOpen(true)} className="bg-gradient-to-r from-primary to-accent text-primary-foreground"><Plus className="w-4 h-4 mr-2" />Novo evento</Button>
        </div>

        {events.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center">
            <p className="text-muted-foreground mb-4">Você ainda não criou nenhum evento.</p>
            <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Criar meu primeiro evento</Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((e) => (
              <div key={e.id} className="glass rounded-2xl overflow-hidden hover-lift">
                <div className="aspect-[16/10] bg-secondary relative">
                  {e.banner_url ? <img src={e.banner_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30" />}
                  <div className="absolute top-2 right-2 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full glass">{e.visibility}</div>
                </div>
                <div className="p-4">
                  <div className="text-xs uppercase tracking-wider text-primary/80">{e.type.replace("_", " ")}</div>
                  <h3 className="font-display text-2xl mt-1">{e.bride_name}</h3>
                  {e.event_date && <div className="text-xs text-muted-foreground">{new Date(e.event_date).toLocaleDateString("pt-BR")}</div>}
                  <div className="flex gap-2 mt-4">
                    <Button asChild size="sm" variant="outline" className="flex-1"><Link to="/painel/$slug" params={{ slug: e.slug }}><Settings className="w-3 h-3 mr-1" />Gerenciar</Link></Button>
                    <Button asChild size="sm" variant="ghost"><a href={`/n/${e.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="w-3 h-3" /></a></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <CreateEventDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </PanelShell>
  );
}
