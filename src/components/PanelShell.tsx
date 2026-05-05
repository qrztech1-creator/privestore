import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Package, LogOut, ShoppingBag, Heart, BarChart3, Tag } from "lucide-react";

interface Props {
  children: ReactNode;
  mode?: "admin" | "bride-token";
  brideName?: string;
  brideToken?: string;
}

export function PanelShell({ children, mode = "admin", brideName, brideToken }: Props) {
  const { user, isAdmin, signOut, loading } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });

  // Admin mode requires login
  useEffect(() => {
    if (mode === "admin" && !loading && (!user || !isAdmin)) nav({ to: "/login" });
  }, [loading, user, isAdmin, mode, nav]);

  if (mode === "admin" && (loading || !user)) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  const adminNav = [
    { to: "/admin", label: "Dashboard", icon: BarChart3 },
    { to: "/admin/eventos", label: "Noivas", icon: Heart },
    { to: "/admin/produtos", label: "Catálogo", icon: Package },
    { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
    { to: "/admin/usuarios", label: "Equipe", icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border hidden md:flex flex-col">
        <div className="p-5 border-b border-sidebar-border">
          <Link to={mode === "admin" ? "/admin" : "/g/$token"} params={mode === "admin" ? undefined : { token: brideToken! }}>
            <Logo className="h-10" />
          </Link>
          <div className="mt-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            {mode === "admin" ? "administração" : "área da noiva"}
          </div>
          {mode === "bride-token" && brideName && (
            <div className="mt-2 text-sm font-display text-primary">{brideName}</div>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {mode === "admin" ? adminNav.map((it) => {
            const active = path === it.to || (it.to !== "/admin" && path.startsWith(it.to));
            return (
              <Link key={it.to} to={it.to} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${active ? "bg-sidebar-accent text-sidebar-primary font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"}`}>
                <it.icon className="w-4 h-4" />{it.label}
              </Link>
            );
          }) : (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Use as abas no topo para navegar entre as seções da sua página.
            </div>
          )}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          {mode === "admin" ? (
            <>
              <div className="text-xs text-muted-foreground px-2 pb-2 truncate">{user?.email}</div>
              <Button variant="ghost" size="sm" className="w-full justify-start" onClick={async () => { await signOut(); nav({ to: "/" }); }}>
                <LogOut className="w-4 h-4 mr-2" />Sair
              </Button>
            </>
          ) : (
            <div className="text-[10px] text-muted-foreground px-2">Plataforma Privê</div>
          )}
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
