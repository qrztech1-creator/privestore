import { createFileRoute } from "@tanstack/react-router";
import { PanelShell } from "@/components/PanelShell";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Mail, Trash } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/usuarios")({
  component: () => {
    const { isAdmin } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [invites, setInvites] = useState<any[]>([]);
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState<"all" | "admin" | "user">("all");
    const [inviteEmail, setInviteEmail] = useState("");
    const [busy, setBusy] = useState(false);

    async function load() {
      const [{ data: us }, { data: inv }] = await Promise.all([
        supabase.from("profiles").select("*, roles:user_roles(role)").order("created_at", { ascending: false }),
        supabase.from("team_invites").select("*").order("created_at", { ascending: false }),
      ]);
      setUsers(us || []);
      setInvites(inv || []);
    }
    useEffect(() => { load(); }, []);

    async function toggleAdmin(uid: string, isCurrentlyAdmin: boolean) {
      if (isCurrentlyAdmin) await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "admin");
      else await supabase.from("user_roles").insert({ user_id: uid, role: "admin" });
      toast.success("Atualizado"); load();
    }

    async function sendInvite() {
      if (!inviteEmail.includes("@")) return toast.error("E-mail inválido");
      setBusy(true);
      const { error } = await supabase.from("team_invites").insert({ email: inviteEmail.toLowerCase().trim(), role: "admin" });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Convite registrado. Quando essa pessoa criar conta com este e-mail, vira admin automaticamente.");
      setInviteEmail("");
      load();
    }

    async function deleteInvite(id: string) {
      await supabase.from("team_invites").delete().eq("id", id);
      load();
    }

    const filtered = useMemo(() => {
      const term = q.toLowerCase();
      return users.filter((u: any) => {
        const roles = u.roles?.map((r: any) => r.role) || [];
        const isA = roles.includes("admin");
        if (filter === "admin" && !isA) return false;
        if (filter === "user" && isA) return false;
        if (!term) return true;
        return (u.full_name || "").toLowerCase().includes(term) || (u.email || "").toLowerCase().includes(term);
      });
    }, [users, q, filter]);

    if (!isAdmin) return <PanelShell mode="admin"><div className="p-10">Acesso restrito.</div></PanelShell>;

    const pendingInvites = invites.filter((i) => !i.accepted_at);

    return (
      <PanelShell mode="admin">
        <div className="p-6 md:p-10 max-w-6xl mx-auto">
          <h1 className="font-display text-4xl mb-2">Equipe</h1>
          <p className="text-sm text-muted-foreground mb-6">Convide pessoas para ajudar a administrar a boutique.</p>

          <div className="glass rounded-2xl p-5 mb-6">
            <h3 className="font-display text-xl mb-3">Convidar nova admin</h3>
            <div className="flex gap-2">
              <Input type="email" placeholder="email@dominio.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              <Button onClick={sendInvite} disabled={busy} className="bg-primary text-primary-foreground">
                <Mail className="w-4 h-4 mr-1" />Convidar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">A pessoa precisa criar conta em /login com este e-mail. O papel de admin é atribuído automaticamente.</p>
            {pendingInvites.length > 0 && (
              <div className="mt-4 space-y-1">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Convites pendentes</div>
                {pendingInvites.map((i) => (
                  <div key={i.id} className="flex items-center justify-between text-sm border border-border rounded-lg px-3 py-2">
                    <span>{i.email} <span className="text-xs text-muted-foreground">· {i.role}</span></span>
                    <Button size="icon" variant="ghost" onClick={() => deleteInvite(i.id)}><Trash className="w-3 h-3" /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por nome ou e-mail..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as "all" | "admin" | "user")}>
              <SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                <SelectItem value="admin">Apenas admins</SelectItem>
                <SelectItem value="user">Sem privilégios</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            {filtered.map((u: any) => {
              const roles = u.roles?.map((r: any) => r.role) || [];
              const isA = roles.includes("admin");
              return (
                <div key={u.id} className="glass rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{u.full_name || u.email}</div>
                    <div className="text-xs text-muted-foreground">{u.email} · {roles.join(", ") || "sem papel"}</div>
                  </div>
                  <Button size="sm" variant={isA ? "destructive" : "outline"} onClick={() => toggleAdmin(u.id, isA)}>{isA ? "Remover admin" : "Tornar admin"}</Button>
                </div>
              );
            })}
            {filtered.length === 0 && <div className="glass rounded-xl p-8 text-center text-muted-foreground text-sm">Nenhuma conta encontrada.</div>}
          </div>
        </div>
      </PanelShell>
    );
  },
});
