import { cn } from "@/lib/utils";

const MAP = {
  white: { bg: "oklch(0.98 0 0)", fg: "oklch(0.12 0 0)", label: "Blanco" },
  blue: { bg: "oklch(0.55 0.18 250)", fg: "oklch(0.98 0 0)", label: "Azul" },
  purple: { bg: "oklch(0.45 0.18 305)", fg: "oklch(0.98 0 0)", label: "Morado" },
  brown: { bg: "oklch(0.42 0.09 50)", fg: "oklch(0.98 0 0)", label: "Marrón" },
  black: { bg: "oklch(0.18 0 0)", fg: "oklch(0.98 0 0)", label: "Negro" },
} as const;

type Belt = keyof typeof MAP;

export function BeltBadge({ belt, className }: { belt: Belt | null | undefined; className?: string }) {
  const cfg = MAP[(belt ?? "white") as Belt];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
        className,
      )}
      style={{ backgroundColor: cfg.bg, color: cfg.fg }}
    >
      <span
        className="h-1.5 w-3 rounded-sm"
        style={{ background: belt === "black" ? "oklch(0.78 0.13 85)" : "oklch(0.12 0 0)" }}
        aria-hidden
      />
      {cfg.label}
    </span>
  );
}
