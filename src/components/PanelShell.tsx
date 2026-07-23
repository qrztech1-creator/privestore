import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, type ReactNode, type ComponentType } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Package, LogOut, ShoppingBag, BarChart3, Tag, Users, Sparkles, Ticket } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  params?: Record<string, string>;
  exact?: boolean;
}

interface Props {
  children: ReactNode;
  mode?: "admin" | "bride-token" | "custom";
  brideName?: string;
  brideToken?: string;
  navItems?: NavItem[];
  title?: string;
  showAuth?: boolean;
}

const adminNav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: BarChart3, exact: true },
  { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { to: "/admin/cupons", label: "Cupons", icon: Ticket },
  { to: "/admin/produtos", label: "Produtos", icon: Package },
  { to: "/admin/categorias", label: "Categorias", icon: Tag },
  { to: "/admin/linhas", label: "Linhas", icon: Sparkles },
  { to: "/admin/eventos", label: "Eventos", icon: Users },
  { to: "/admin/usuarios", label: "Equipe", icon: LayoutDashboard },
];

export function PanelShell({ children, mode = "admin", brideName, brideToken, navItems, title }: Props) {
  const { user, isAdmin, signOut, loading } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (mode === "admin" && !loading && !user) nav({ to: "/login" });
  }, [loading, user, mode, nav]);

  if (mode === "admin" && loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando painel...</div>;
  }

  if (mode === "admin" && user && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h1 className="font-display text-2xl">Acesso Restrito</h1>
        <p className="text-sm text-muted-foreground max-w-sm">Sua conta ({user.email}) não possui privilégios de administração.</p>
        <Button onClick={() => nav({ to: "/painel" })}>Ir para o Meu Painel (Cliente)</Button>
      </div>
    );
  }

  const items: NavItem[] = navItems ?? (mode === "admin" ? adminNav : []);
  const headerTitle = title ?? (mode === "admin" ? "Administração" : mode === "bride-token" ? "Área da Noiva" : "");

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border hidden md:flex flex-col">
        <div className="p-5 flex items-center gap-3">
          <Logo className="h-9 w-9 rounded-full" />
          <div className="font-display text-lg leading-tight text-sidebar-foreground">{headerTitle}</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((it) => {
            const active = it.exact ? path === it.to : (path === it.to || path.startsWith(it.to + "/") || (it.to !== "/admin" && path.startsWith(it.to)));
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                params={it.params as never}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  active
                    ? "bg-primary text-primary-foreground font-medium shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                }`}
              >
                <Icon className="w-4 h-4" />
                {it.label}
              </Link>
            );
          })}
          {brideName && mode === "bride-token" && (
            <div className="mt-6 px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{brideName}</div>
          )}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          {mode === "admin" ? (
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={async () => { await signOut(); nav({ to: "/" }); }}>
              <LogOut className="w-4 h-4 mr-2" />Sair
            </Button>
          ) : brideToken ? (
            <Link to="/g/$token" params={{ token: brideToken }} className="text-[11px] text-muted-foreground hover:text-primary px-2">Plataforma Privê</Link>
          ) : (
            <div className="text-[10px] text-muted-foreground px-2">Plataforma Privê</div>
          )}
        </div>
      </aside>
      <main key={path} className="flex-1 min-w-0 animate-fade-in">{children}</main>
    </div>
  );
}
