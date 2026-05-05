import { createFileRoute } from "@tanstack/react-router";
import { PanelShell } from "@/components/PanelShell";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/usuarios")({
  component: () => {
    const { isAdmin } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState<"all" | "admin" | "user">("all");
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
    if (!isAdmin) return <PanelShell mode="admin"><div className="p-10">Acesso restrito.</div></PanelShell>;
    return (
      <PanelShell mode="admin">
        <div className="p-6 md:p-10 max-w-6xl mx-auto">
          <h1 className="font-display text-4xl mb-2">Equipe</h1>
          <p className="text-sm text-muted-foreground mb-6">Contas com acesso administrativo. Noivas não têm conta — usam links exclusivos.</p>
          <div className="space-y-2">
            {users.map((u: any) => {
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
          </div>
        </div>
      </PanelShell>
    );
  },
});
