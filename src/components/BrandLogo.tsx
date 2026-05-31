import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Placeholder for the academy logo. Slot is reserved across all surfaces
 * (login wrapper, nav bar, dashboard header) so a future SVG can drop in.
 */
export function BrandLogo({ className, size = "md" }: Props) {
  const dim =
    size === "sm" ? "h-9 w-9 text-base" : size === "lg" ? "h-16 w-16 text-2xl" : "h-12 w-12 text-lg";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-gradient-gold font-display font-black text-primary-foreground shadow-gold ring-gold",
          dim,
        )}
        aria-label="Global Jiu-Jitsu"
      >
        GJJ
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
          Global
        </span>
        <span className="font-display text-base font-bold text-foreground">
          Jiu-Jitsu
        </span>
      </div>
    </div>
  );
}
