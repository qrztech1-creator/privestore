import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ParticlesBackground } from "@/components/ParticlesBackground";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Heart, Sparkles, Gift, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { user, isAdmin } = useAuth();
  return (
    <div className="min-h-screen overflow-hidden">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 px-6 py-5 flex items-center justify-between">
        <Logo className="h-12" />
        <nav className="flex items-center gap-3">
          <Button asChild variant="ghost"><Link to="/loja">Loja</Link></Button>
          {user ? (
            <Button asChild variant="ghost"><Link to={isAdmin ? "/admin" : "/painel"}>Meu painel</Link></Button>
          ) : (
            <Button asChild variant="ghost"><Link to="/login">Entrar</Link></Button>
          )}
        </nav>

      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        <ParticlesBackground />
        <div className="max-w-4xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-primary/80 mb-6">
              <Sparkles className="w-3 h-3" /> boutique experience
            </span>
            <h1 className="font-display text-5xl sm:text-7xl md:text-8xl leading-[1.05] mb-6">
              Cada noiva merece uma <em className="text-gradient-gold">experiência única</em>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Páginas premium personalizadas para casamento, chá de lingerie e despedida de solteira. Lista de presentes, catálogo curado, contagem regressiva e a sua história contada com elegância.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 shadow-glow">
                <Link to={user ? (isAdmin ? "/admin" : "/painel") : "/login"}>
                  Criar página da noiva <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="gold-divider w-24 mx-auto mb-6" />
          <h2 className="font-display text-4xl sm:text-5xl mb-4">Três momentos. Uma marca.</h2>
          <p className="text-muted-foreground">Eventos curados com a sofisticação Privê.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Heart, title: "Casamento", desc: "Lista, mensagem da noiva e contagem até o grande dia." },
            { icon: Sparkles, title: "Chá de Lingerie", desc: "Curadoria sensual e elegante para um chá inesquecível." },
            { icon: Gift, title: "Despedida de Solteira", desc: "Experiências, kits e a vibe perfeita da última festa." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-3xl p-8 hover-lift"
            >
              <f.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-display text-2xl mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/30 py-10 px-6 text-center text-xs text-muted-foreground">
        <Logo className="h-8 mx-auto mb-3 opacity-70" />
        © {new Date().getFullYear()} Privê — boutique experience.
      </footer>
    </div>
  );
}
