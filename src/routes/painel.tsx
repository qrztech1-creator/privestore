import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useFavorites } from "@/lib/favorites";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Heart, Package, LogOut, ArrowLeft, Loader2, Shield, Trash2 } from "lucide-react";
import { ProductModal } from "@/components/ProductModal";
import { toast } from "sonner";

export const Route = createFileRoute("/painel")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as string) || "pedidos",
    };
  },
  component: PainelCliente,
});

export function PainelCliente() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/painel" });
  
  const [activeTab, setActiveTab] = useState<"pedidos" | "favoritos">(
    searchParams.tab === "favoritos" || searchParams.tab === "favorites" ? "favoritos" : "pedidos"
  );

  const [orders, setOrders] = useState<any[]>([]);
  const [favProducts, setFavProducts] = useState<any[]>([]);
  const [fetchingOrders, setFetchingOrders] = useState(true);
  const [fetchingFavs, setFetchingFavs] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const favorites = useFavorites((s) => s.favorites);
  const initFavorites = useFavorites((s) => s.init);
  const toggleFavorite = useFavorites((s) => s.toggle);

  useEffect(() => {
    if (searchParams.tab === "favoritos" || searchParams.tab === "favorites") {
      setActiveTab("favoritos");
    }
  }, [searchParams.tab]);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user?.id) {
      initFavorites(user.id);
    }
  }, [user, initFavorites]);

  // Carregar pedidos do cliente
  useEffect(() => {
    if (!user) return;
    setFetchingOrders(true);

    const queryFilter = user.email
      ? `customer_id.eq.${user.id},guest_email.eq.${user.email}`
      : `customer_id.eq.${user.id}`;

    supabase
      .from("shop_orders")
      .select("*, items:shop_order_items(*)")
      .or(queryFilter)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao buscar pedidos:", error);
        } else if (data) {
          setOrders(data);
        }
        setFetchingOrders(false);
      });
  }, [user]);

  // Carregar produtos favoritados
  useEffect(() => {
    if (activeTab !== "favoritos") return;
    setFetchingFavs(true);

    (async () => {
      try {
        let catalog: any[] = [];
        const { data: rpcData, error: rpcErr } = await supabase.rpc("get_shop_catalog");
        if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
          catalog = rpcData;
        } else {
          const { data: rawProds } = await supabase
            .from("products")
            .select("*, variants:product_variants(*), images:product_images(*)")
            .eq("active", true);
          if (rawProds) catalog = rawProds;
        }

        const favsList = catalog.filter((p) => favorites.has(p.id));
        setFavProducts(favsList);
      } catch (err) {
        console.error("Erro ao buscar favoritos no painel:", err);
      } finally {
        setFetchingFavs(false);
      }
    })();
  }, [activeTab, favorites]);

  async function handleRemoveFav(productId: string, e: React.MouseEvent) {
    e.stopPropagation();
    await toggleFavorite(productId, user?.id);
    toast.info("Item removido dos favoritos");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 glass border-b border-border/30 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/loja">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />Voltar à loja
            </Button>
          </Link>
          {isAdmin && (
            <Link to="/admin" className="hidden sm:inline-flex">
              <Button variant="outline" size="sm" className="border-primary/40 text-primary">
                <Shield className="w-3.5 h-3.5 mr-1.5" />Painel Admin
              </Button>
            </Link>
          )}
          <Logo className="h-10 md:h-12 ml-auto" />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <aside className="w-full md:w-64 shrink-0 space-y-2">
            <div className="p-4 glass rounded-2xl border border-primary/20 mb-4">
              <h2 className="font-display text-xl mb-1 truncate">
                Olá, {user.user_metadata?.full_name?.split(" ")[0] || "Cliente"}
              </h2>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>

            <Button
              variant="ghost"
              onClick={() => setActiveTab("pedidos")}
              className={`w-full justify-start ${
                activeTab === "pedidos"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Package className="w-4 h-4 mr-2" /> Meus Pedidos
            </Button>

            <Button
              variant="ghost"
              onClick={() => setActiveTab("favoritos")}
              className={`w-full justify-start ${
                activeTab === "favoritos"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Heart className="w-4 h-4 mr-2" /> Meus Favoritos ({favorites.size})
            </Button>

            {isAdmin && (
              <Link to="/admin" className="block sm:hidden">
                <Button variant="outline" className="w-full justify-start border-primary/40 text-primary">
                  <Shield className="w-4 h-4 mr-2" /> Painel Admin
                </Button>
              </Link>
            )}

            <Button
              variant="ghost"
              className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10"
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
            >
              <LogOut className="w-4 h-4 mr-2" /> Sair da conta
            </Button>
          </aside>

          <main className="flex-1 min-w-0 w-full">
            {activeTab === "pedidos" && (
              <div>
                <h1 className="font-display text-3xl mb-6">Meus Pedidos</h1>
                {fetchingOrders ? (
                  <div className="p-10 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="p-10 glass rounded-3xl text-center border border-border/30">
                    <Package className="w-10 h-10 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h3 className="font-display text-xl mb-2">Nenhum pedido ainda</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Você ainda não realizou nenhuma compra na Privê.
                    </p>
                    <Link to="/loja">
                      <Button>Explorar a Boutique</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((o) => (
                      <div
                        key={o.id}
                        className="p-5 glass rounded-2xl border border-border/40 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between border-b border-border/20 pb-3">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-sm font-medium">
                                Pedido #{o.id.substring(0, 8).toUpperCase()}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase font-bold tracking-wider">
                                {o.status === "pending"
                                  ? "Aguardando"
                                  : o.status === "paid"
                                  ? "Aprovado"
                                  : o.status === "shipped"
                                  ? "Enviado"
                                  : o.status === "delivered"
                                  ? "Entregue"
                                  : o.status}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(o.created_at).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-display text-xl">
                              R$ {Number(o.total).toFixed(2).replace(".", ",")}
                            </p>
                          </div>
                        </div>

                        {o.items && o.items.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {o.items.map((item: any) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-xs text-muted-foreground"
                              >
                                <span>
                                  {item.qty}x {item.product_name}{" "}
                                  {item.variant_label ? `(${item.variant_label})` : ""}
                                </span>
                                <span className="font-medium text-foreground">
                                  R$ {Number(item.unit_price * item.qty).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "favoritos" && (
              <div>
                <h1 className="font-display text-3xl mb-6">Meus Favoritos</h1>
                {fetchingFavs ? (
                  <div className="p-10 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </div>
                ) : favProducts.length === 0 ? (
                  <div className="p-10 glass rounded-3xl text-center border border-border/30">
                    <Heart className="w-10 h-10 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h3 className="font-display text-xl mb-2">Sua lista de desejos está vazia</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Explore as coleções e toque no coração para guardar suas lingeries favoritas.
                    </p>
                    <Link to="/loja">
                      <Button>Explorar a Boutique</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {favProducts.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => setSelectedProduct(product)}
                        className="bg-card rounded-2xl overflow-hidden border border-border/40 hover:border-primary/40 transition group cursor-pointer relative"
                      >
                        <div className="aspect-[4/5] bg-secondary overflow-hidden relative">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                          )}
                          <button
                            onClick={(e) => handleRemoveFav(product.id, e)}
                            title="Remover dos Favoritos"
                            className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur rounded-full p-2 hover:scale-110 transition text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-3 space-y-1">
                          <div className="text-[10px] uppercase tracking-widest text-primary/70">
                            {product.line_name || product.category_name || "Peça Privê"}
                          </div>
                          <h3 className="font-medium text-sm truncate">{product.name}</h3>
                          <div className="text-primary font-display text-base">
                            R$ {Number(product.price).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      <ProductModal
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        isFavorite={selectedProduct ? favorites.has(selectedProduct.id) : false}
        onToggleFav={() => selectedProduct && toggleFavorite(selectedProduct.id, user?.id)}
        user={user}
      />
    </div>
  );
}

export default PainelCliente;
