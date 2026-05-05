import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setLoading(false);
    if (error) return toast.error("Credenciais inválidas");
    toast.success("Bem-vinda ✨");
    navigate({ to: "/admin" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Link to="/" className="flex justify-center mb-8"><Logo className="h-14" /></Link>
        <div className="glass rounded-3xl p-8 shadow-luxury">
          <div className="flex justify-center mb-3"><Lock className="w-6 h-6 text-primary" /></div>
          <h1 className="font-display text-3xl text-center mb-1">Acesso Privê</h1>
          <p className="text-center text-xs text-muted-foreground mb-6 uppercase tracking-[0.3em]">administração da boutique</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label>Senha</Label><Input type="password" required value={pass} onChange={(e) => setPass(e.target.value)} /></div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
              {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}Entrar
            </Button>
          </form>

          <div className="mt-6 text-center text-[11px] text-muted-foreground leading-relaxed">
            Esta é uma plataforma fechada. Noivas acessam o painel pelo link exclusivo enviado pela Privê.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
