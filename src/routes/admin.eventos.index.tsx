import { createFileRoute, Link } from "@tanstack/react-router";
import { PanelShell } from "@/components/PanelShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ExternalLink, Search, Copy, Heart } from "lucide-react";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/eventos/")({ component: AdminEvents });

const TYPE_LABELS: Record<string, string> = {
  casamento: "Casamento",
  cha_lingerie: "Chá de Lingerie",
  despedida_solteira: "Despedida de Solteira",
};

function AdminEvents() {
  const { isAdmin, loading } = useAuth();
  const nav = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  async function load() {
    const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    setEvents(data || []);
  }
  useEffect(() => { load(); }, []);

  if (!loading && !isAdmin) return <PanelShell mode="admin"><div className="p-10">Acesso restrito.</div></PanelShell>;

  const filtered = events.filter((e) => q === "" || e.bride_name.toLowerCase().includes(q.toLowerCase()) || (e.partner_name || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <PanelShell mode="admin">
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
          <div>
            <h1 className="font-display text-4xl">Eventos</h1>
            <p className="text-sm text-muted-foreground">Gerencie todas as experiências em preparação.</p>
          </div>
          <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1" />NOVA NOIVA
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por noiva..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="glass rounded-2xl divide-y divide-border">
          {filtered.map((e) => (
            <div key={e.id} className="p-4 md:p-5 flex flex-wrap items-center gap-3 hover:bg-secondary/40 transition">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display text-xl">{e.bride_name}</span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-border">{TYPE_LABELS[e.type] || e.type}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {e.event_date ? new Date(e.event_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "Sem data"} · /{e.slug}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button asChild size="icon" variant="ghost" title="Página pública">
                  <a href={`/n/${e.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a>
                </Button>
                {e.manage_token && (
                  <>
                    <Button asChild size="sm" variant="outline" title="Abrir painel da noiva">
                      <a href={`/g/${e.manage_token}`} target="_blank" rel="noreferrer">
                        <Heart className="w-3.5 h-3.5 mr-1" />Painel da noiva
                      </a>
                    </Button>
                    <Button size="icon" variant="ghost" title="Copiar link do painel da noiva" onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/g/${e.manage_token}`);
                      toast.success("Link da noiva copiado");
                    }}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <Button asChild size="sm" className="bg-primary text-primary-foreground">
                  <Link to="/admin/eventos/$id" params={{ id: e.id }}>Editar</Link>
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              Nenhuma noiva encontrada. <button onClick={() => setOpen(true)} className="underline text-primary">Cadastrar a primeira</button>.
            </div>
          )}
        </div>
      </div>
      <CreateEventDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </PanelShell>
  );
}
