import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, User, Mail, Lock, Phone } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function CustomerAuthModal({ open, onOpenChange }: Props) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !pass) return toast.error("Preencha e-mail e senha");
    if (mode === "register" && !name) return toast.error("Por favor, informe seu nome completo");
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
          options: {
            data: {
              full_name: name,
              phone: phone || null,
            },
          },
        });
        if (error) throw error;

        // Tentar logar direto para criar a sessão imediatamente
        let session = data.session;
        if (!session) {
          const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({ email, password: pass });
          if (!loginErr) session = loginData.session;
        }

        if (session?.user) {
          // Atualizar tabela profiles
          await supabase.from("profiles").upsert({
            id: session.user.id,
            email,
            full_name: name,
            phone: phone || null,
            updated_at: new Date().toISOString(),
          }).catch((err) => console.warn("Erro ao atualizar profile pós cadastro:", err));
        }

        toast.success("Conta criada com sucesso! 10% OFF na 1ª compra ativado ✨");
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
      <DialogContent className="sm:max-w-md bg-card border border-border/60 rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="text-center space-y-1">
          <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <DialogTitle className="font-display text-2xl text-center">
            {mode === "login" ? "Acessar Conta Privê ✨" : "Criar sua Conta Privê ✨"}
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground">
            {mode === "login"
              ? "Entre para salvar seus favoritos e acompanhar seus pedidos."
              : "Cadastre-se para garantir 10% OFF na 1ª compra e frete facilitado."}
          </DialogDescription>
        </DialogHeader>

        {/* Seletor de Abas */}
        <div className="grid grid-cols-2 p-1 bg-secondary/60 rounded-xl text-xs font-medium mb-2">
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`py-2 rounded-lg transition ${
              mode === "register" ? "bg-card text-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Cadastrar (10% OFF)
          </button>
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`py-2 rounded-lg transition ${
              mode === "login" ? "bg-card text-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Já tenho conta
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-3.5">
          {mode === "register" && (
            <>
              <div>
                <Label className="text-xs">Nome Completo *</Label>
                <div className="relative mt-1">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    required
                    placeholder="Como prefere ser chamada?"
                    className="pl-9 h-11 text-xs rounded-xl"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">WhatsApp / Telefone (opcional)</Label>
                <div className="relative mt-1">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="(00) 90000-0000"
                    className="pl-9 h-11 text-xs rounded-xl"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <Label className="text-xs">E-mail *</Label>
            <div className="relative mt-1">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                required
                placeholder="seuemail@exemplo.com"
                className="pl-9 h-11 text-xs rounded-xl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Senha *</Label>
            <div className="relative mt-1">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                required
                minLength={6}
                placeholder="Sua senha de acesso"
                className="pl-9 h-11 text-xs rounded-xl"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-2 bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold uppercase tracking-wider text-xs shadow-md"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === "login" ? "Entrar na Conta" : "Criar Conta & Ativar 10% OFF"}
          </Button>

          <p className="text-[10px] text-center text-muted-foreground pt-1">
            🔒 Seus dados estão seguros e protegidos pela Privê.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

