import { useEffect, useState } from "react";
import { Type } from "lucide-react";

const KEY = "gjj.textScale";
const MIN = 0.85;
const MAX = 1.35;
const STEP = 0.05;

function apply(scale: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.fontSize = `${Math.round(scale * 100)}%`;
}

export function TextSizeControl() {
  const [scale, setScale] = useState(1);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    const v = raw ? Number(raw) : 1;
    const clamped = Math.min(MAX, Math.max(MIN, isFinite(v) ? v : 1));
    setScale(clamped);
    apply(clamped);
  }, []);

  const update = (v: number) => {
    const clamped = Math.min(MAX, Math.max(MIN, Number(v.toFixed(2))));
    setScale(clamped);
    apply(clamped);
    try { localStorage.setItem(KEY, String(clamped)); } catch { /* ignore */ }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Tamaño del texto"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-liquid hover:border-primary/60 hover:text-primary"
      >
        <Type className="h-4 w-4" />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 top-12 z-50 w-60 rounded-2xl border border-border bg-surface p-4 shadow-elevated">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-primary">
              Tamaño del texto
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => update(scale - STEP)}
                className="h-8 w-8 shrink-0 rounded-lg border border-border bg-background text-sm font-bold text-foreground hover:border-primary"
                aria-label="Disminuir"
              >
                A−
              </button>
              <input
                type="range"
                min={MIN}
                max={MAX}
                step={STEP}
                value={scale}
                onChange={(e) => update(Number(e.target.value))}
                className="flex-1 accent-primary"
                aria-label="Escala"
              />
              <button
                type="button"
                onClick={() => update(scale + STEP)}
                className="h-8 w-8 shrink-0 rounded-lg border border-border bg-background text-base font-bold text-foreground hover:border-primary"
                aria-label="Aumentar"
              >
                A+
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>{Math.round(scale * 100)}%</span>
              <button
                type="button"
                onClick={() => update(1)}
                className="font-bold text-primary hover:underline"
              >
                Restablecer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
