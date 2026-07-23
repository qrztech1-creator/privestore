import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function CustomerAuthModal({ open, onOpenChange }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !pass) return toast.error("Preencha e-mail e senha");
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        toast.success("Bem-vinda de volta! ✨");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: { data: { full_name: name || "Cliente" } },
        });
        if (error) throw error;

        // Se a confirmação de e-mail estiver ativa no projeto, tentar logar direto
        if (!data.session) {
          const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password: pass });
          if (loginErr) {
            console.warn("Autologin pós cadastro:", loginErr);
          }
        }
        toast.success("Conta criada e conectada com sucesso! ✨");
      }
      onOpenChange(false);
      setPass("");
    } catch (err: any) {
      console.error("Erro na autenticação:", err);
      toast.error(err.message || "Falha na autenticação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {mode === "login" ? "Bem-vinda de volta ✨" : "Criar sua conta"}
          </DialogTitle>
          <DialogDescription>
            {mode === "login" 
              ? "Entre para salvar seus favoritos, ver o histórico de pedidos e ganhar descontos."
              : "Cadastre-se para aproveitar 10% OFF na 1ª compra e salvar suas peças favoritas."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAuth} className="space-y-4 pt-4">
          {mode === "register" && (
            <div>
              <Label>Nome (Opcional)</Label>
              <Input placeholder="Como gosta de ser chamada?" value={name} onChange={e => setName(e.target.value)} />
            </div>
          )}
          <div>
            <Label>E-mail</Label>
            <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Senha</Label>
            <Input type="password" required value={pass} onChange={e => setPass(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
          <div className="text-center pt-2">
            <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-[11px] text-muted-foreground hover:text-primary underline underline-offset-4">
              {mode === "login" ? "Ainda não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

