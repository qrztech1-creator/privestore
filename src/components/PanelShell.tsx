import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Heart, LayoutDashboard, Package, LogOut, ShoppingBag, Users, ArrowLeft } from "lucide-react";

export function PanelShell({ children, mode = "bride" }: { children: ReactNode; mode?: "bride" | "admin" }) {
  const { user, isAdmin, signOut, loading } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;

  const adminNav = [
    { to: "/admin", label: "Visão geral", icon: LayoutDashboard },
    { to: "/admin/eventos", label: "Noivas / Eventos", icon: Heart },
    { to: "/admin/produtos", label: "Catálogo", icon: Package },
    { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
    { to: "/admin/usuarios", label: "Usuárias", icon: Users },
  ];
  const brideNav = [
    { to: "/painel", label: "Meus eventos", icon: Heart },
  ];
  const items = mode === "admin" ? adminNav : brideNav;

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border hidden md:flex flex-col">
        <div className="p-5 border-b border-sidebar-border">
          <Link to="/"><Logo className="h-10" /></Link>
          <div className="mt-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{mode === "admin" ? "admin" : "área da noiva"}</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((it) => {
            const active = path === it.to || (it.to !== "/admin" && it.to !== "/painel" && path.startsWith(it.to));
            return (
              <Link key={it.to} to={it.to} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${active ? "bg-sidebar-accent text-sidebar-primary font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"}`}>
                <it.icon className="w-4 h-4" />{it.label}
              </Link>
            );
          })}
          {isAdmin && mode !== "admin" && (
            <Link to="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-primary border border-primary/30 mt-3"><LayoutDashboard className="w-4 h-4" />Modo admin</Link>
          )}
          {mode === "admin" && (
            <Link to="/painel" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground"><ArrowLeft className="w-4 h-4" />Área pessoal</Link>
          )}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="text-xs text-muted-foreground px-2 pb-2 truncate">{user.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={async () => { await signOut(); nav({ to: "/" }); }}>
            <LogOut className="w-4 h-4 mr-2" />Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
