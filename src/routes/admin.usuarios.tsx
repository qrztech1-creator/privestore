import { createFileRoute } from "@tanstack/react-router";
import { PanelShell } from "@/components/PanelShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/usuarios")({ component: () => {
  const { isAdmin, user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  async function load() {
    const { data } = await supabase.from("profiles").select("*, roles:user_roles(role)").order("created_at", { ascending: false });
    setUsers(data || []);
  }
  useEffect(() => { load(); }, []);
  async function toggleAdmin(uid: string, isCurrentlyAdmin: boolean) {
    if (isCurrentlyAdmin) await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "admin");
    else await supabase.from("user_roles").insert({ user_id: uid, role: "admin" });
    toast.success("Atualizado"); load();
  }
  async function makeMyselfAdmin() {
    if (!user) return;
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: "admin" });
    if (error) toast.error(error.message); else { toast.success("Você agora é admin"); load(); }
  }
  if (!isAdmin) return <PanelShell mode="admin"><div className="p-10 space-y-4"><p>Acesso restrito.</p><Button onClick={makeMyselfAdmin}>Tornar-me admin (1ª vez)</Button></div></PanelShell>;
  return (
    <PanelShell mode="admin">
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <h1 className="font-display text-4xl mb-6">Usuárias</h1>
        <div className="space-y-2">
          {users.map((u: any) => {
            const roles = u.roles?.map((r: any) => r.role) || [];
            const isA = roles.includes("admin");
            return (
              <div key={u.id} className="glass rounded-xl p-3 flex items-center justify-between">
                <div><div className="font-medium">{u.full_name || u.email}</div><div className="text-xs text-muted-foreground">{u.email} · {roles.join(", ")}</div></div>
                <Button size="sm" variant={isA ? "destructive" : "outline"} onClick={() => toggleAdmin(u.id, isA)}>{isA ? "Remover admin" : "Tornar admin"}</Button>
              </div>
            );
          })}
        </div>
      </div>
    </PanelShell>
  );
}});
