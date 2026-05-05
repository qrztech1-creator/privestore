import { useEffect, useState } from "react";

export function Countdown({ target }: { target: string | Date | null }) {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = +new Date(target) - Date.now();
      if (diff <= 0) return setT({ d: 0, h: 0, m: 0, s: 0 });
      setT({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff / 3600000) % 24),
        m: Math.floor((diff / 60000) % 60),
        s: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return null;
  const items = [
    { v: t.d, l: "dias" }, { v: t.h, l: "horas" }, { v: t.m, l: "min" }, { v: t.s, l: "seg" },
  ];
  return (
    <div className="flex gap-3 sm:gap-5 justify-center">
      {items.map((it) => (
        <div key={it.l} className="glass rounded-2xl px-4 py-3 sm:px-6 sm:py-4 min-w-[72px] sm:min-w-[96px] text-center">
          <div className="font-display text-3xl sm:text-5xl text-gradient-gold tabular-nums leading-none">
            {String(it.v).padStart(2, "0")}
          </div>
          <div className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground mt-1">{it.l}</div>
        </div>
      ))}
    </div>
  );
}
