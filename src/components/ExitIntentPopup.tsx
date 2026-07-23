import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Gift, ArrowRight, Copy, Check, X } from "lucide-react";
import { toast } from "sonner";

const SESSION_KEY = "prive_exit_intent_dismissed_v2";
const COUPON_CODE = "VOLTE10";

interface Props {
  onApplyCoupon?: (code: string) => void;
}

export function ExitIntentPopup({ onApplyCoupon }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const shown = sessionStorage.getItem(SESSION_KEY);
    if (shown) return;

    let mouseLeaveTriggered = false;

    // 1. Desktop: Mouse leaves top of viewport
    function handleMouseLeave(e: MouseEvent) {
      if (e.clientY <= 15 && !mouseLeaveTriggered) {
        mouseLeaveTriggered = true;
        triggerPopup();
      }
    }

    // 2. Mobile / Tablet fallback: User scrolls up quickly after staying on page for >12s
    let lastScrollY = window.scrollY;
    let timer: NodeJS.Timeout;
    const pageTimeTimer = setTimeout(() => {
      function handleScroll() {
        const currentScroll = window.scrollY;
        if (lastScrollY - currentScroll > 60 && currentScroll < 300 && !mouseLeaveTriggered) {
          mouseLeaveTriggered = true;
          triggerPopup();
        }
        lastScrollY = currentScroll;
      }
      window.addEventListener("scroll", handleScroll, { passive: true });
      timer = pageTimeTimer;
    }, 12000);

    document.addEventListener("mouseleave", handleMouseLeave);

    function triggerPopup() {
      sessionStorage.setItem(SESSION_KEY, "true");
      setOpen(true);
    }

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      clearTimeout(timer);
    };
  }, []);

  function handleClaim() {
    navigator.clipboard.writeText(COUPON_CODE).catch(() => {});
    setCopied(true);
    toast.success(`Cupom ${COUPON_CODE} copiado e ativado! ✨`);
    if (onApplyCoupon) onApplyCoupon(COUPON_CODE);
    setTimeout(() => {
      setOpen(false);
    }, 800);
  }

  function handleClose() {
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-primary/30 bg-card rounded-3xl shadow-2xl">
        <div className="relative p-6 sm:p-8 text-center bg-gradient-to-b from-secondary/80 via-card to-card">
          {/* Background Decorative Glow */}
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 0%, oklch(0.78 0.075 35 / 0.4), transparent 70%)",
            }}
          />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-background/60 hover:bg-background flex items-center justify-center text-muted-foreground hover:text-foreground transition"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon Badge */}
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
            <Gift className="w-8 h-8 animate-bounce" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-[11px] uppercase tracking-[0.2em] text-primary mb-3 font-semibold">
            <Sparkles className="w-3 h-3" /> Presente Exclusivo Privê
          </div>

          <h2 className="font-display text-3xl sm:text-4xl leading-tight mb-2">
            Espere! Não vá embora <br />
            <em className="text-gradient-gold not-italic">de mãos vazias...</em>
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto mb-6">
            Garantimos 10% OFF EXTRA na sua compra para você experimentar nossas lingerie autorais em renda e seda.
          </p>

          {/* Coupon Display Box */}
          <div className="p-4 rounded-2xl bg-secondary/80 border border-dashed border-primary/40 mb-6 flex items-center justify-between gap-3 max-w-xs mx-auto">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Seu cupom especial</div>
              <div className="font-mono text-xl font-bold tracking-wider text-primary">{COUPON_CODE}</div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClaim}
              className="border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>

          <div className="space-y-2">
            <Button
              size="lg"
              onClick={handleClaim}
              className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium h-12 text-sm tracking-wider uppercase shadow-xl hover:scale-[1.02] transition"
            >
              Garantir meus 10% OFF agora
            </Button>
            <button
              onClick={handleClose}
              className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-4 pt-1"
            >
              Continuar navegando sem desconto
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
