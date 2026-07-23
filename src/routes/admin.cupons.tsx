import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PanelShell } from "@/components/PanelShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash, Ticket } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin/cupons")({ component: AdminCoupons });

function AdminCoupons() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [code, setCode] = useState("");
  const [type, setType] = useState<"fixed" | "percentage">("percentage");
  const [value, setValue] = useState("");

  useEffect(() => {
    if (isAdmin) loadCoupons();
  }, [isAdmin]);

  async function loadCoupons() {
    setLoading(true);
    const { data, error } = await supabase.from("shop_coupons").select("*").order("created_at", { ascending: false });
    if (data) setCoupons(data);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code || !value) return toast.error("Preencha o código e o valor");
    
    setSubmitting(true);
    const upperCode = code.toUpperCase().trim();
    const numValue = parseFloat(value.replace(",", "."));
    
    if (isNaN(numValue) || numValue <= 0) {
      setSubmitting(false);
      return toast.error("Valor inválido");
    }
    
    const { error } = await supabase.from("shop_coupons").insert({
      code: upperCode,
      discount_type: type,
      discount_value: numValue,
      active: true
    });
    
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") return toast.error("Já existe um cupom com este código!");
      return toast.error("Erro ao criar cupom.");
    }
    
    toast.success("Cupom criado com sucesso!");
    setCode("");
    setValue("");
    loadCoupons();
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from("shop_coupons").update({ active: !current }).eq("id", id);
    loadCoupons();
  }

  async function deleteCoupon(id: string) {
    if (!confirm("Tem certeza que deseja excluir este cupom?")) return;
    await supabase.from("shop_coupons").delete().eq("id", id);
    loadCoupons();
  }

  if (!authLoading && !isAdmin) return <PanelShell mode="admin"><div className="p-10">Acesso restrito.</div></PanelShell>;

  return (
    <PanelShell mode="admin" title="Gerenciar Cupons">
      <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
        
        <div className="glass rounded-3xl p-6 border border-border/40">
          <h2 className="font-display text-xl mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-primary"/> Criar Novo Cupom</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <Label>Código (ex: QUERO10)</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CÓDIGO" maxLength={20} required />
            </div>
            <div>
              <Label>Tipo de Desconto</Label>
              <Select value={type} onValueChange={(v: "fixed" | "percentage") => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                  <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor</Label>
              <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ex: 10 ou 15.50" type="number" step="0.01" required />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ticket className="w-4 h-4 mr-2" />}
              Criar Cupom
            </Button>
          </form>
        </div>

        <div>
          <h2 className="font-display text-2xl mb-4">Cupons Cadastrados</h2>
          {loading ? (
            <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-2xl">Nenhum cupom cadastrado.</div>
          ) : (
            <div className="grid gap-4">
              {coupons.map((c) => (
                <div key={c.id} className={`glass p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border ${c.active ? "border-primary/20" : "border-border/30 opacity-60"}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Ticket className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{c.code}</h3>
                      <p className="text-sm text-muted-foreground">
                        {c.discount_type === "percentage" ? `${c.discount_value}% OFF` : `R$ ${c.discount_value.toFixed(2)} OFF`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => toggleActive(c.id, c.active)}>
                      {c.active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteCoupon(c.id)}>
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </PanelShell>
  );
}

