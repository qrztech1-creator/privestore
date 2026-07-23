import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Heart, Package, LogOut, ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/painel")({ component: PainelCliente });

function PainelCliente() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("shop_orders")
      .select("*")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setOrders(data);
        setFetching(false);
      });
  }, [user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 glass border-b border-border/30 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/loja"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Voltar à loja</Button></Link>
          <Logo className="h-10 md:h-12 ml-auto" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <aside className="w-full md:w-64 shrink-0 space-y-2">
            <div className="p-4 glass rounded-2xl border border-primary/20 mb-6">
              <h2 className="font-display text-xl mb-1">Olá, {user.user_metadata?.full_name?.split(" ")[0] || "Cliente"}</h2>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Button variant="ghost" className="w-full justify-start bg-primary/10 text-primary">
              <Package className="w-4 h-4 mr-2" /> Meus Pedidos
            </Button>
            {/* <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
              <Heart className="w-4 h-4 mr-2" /> Favoritos
            </Button> */}
            <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
              <LogOut className="w-4 h-4 mr-2" /> Sair da conta
            </Button>
          </aside>
          
          <main className="flex-1 min-w-0 w-full">
            <h1 className="font-display text-3xl mb-6">Meus Pedidos</h1>
            {fetching ? (
              <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
            ) : orders.length === 0 ? (
              <div className="p-10 glass rounded-3xl text-center border border-border/30">
                <Package className="w-10 h-10 mx-auto text-muted-foreground mb-4 opacity-50" />
                <h3 className="font-display text-xl mb-2">Nenhum pedido ainda</h3>
                <p className="text-sm text-muted-foreground mb-6">Você ainda não realizou nenhuma compra na Privê.</p>
                <Link to="/loja"><Button>Explorar a Boutique</Button></Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((o) => (
                  <div key={o.id} className="p-5 glass rounded-2xl border border-border/40 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-medium">Pedido #{o.id.substring(0,8).toUpperCase()}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase font-bold tracking-wider">{o.status === "pending" ? "Aguardando" : o.status === "paid" ? "Aprovado" : o.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-xl">R$ {o.total.toFixed(2).replace(".", ",")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

