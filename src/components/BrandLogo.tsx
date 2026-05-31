import { cn } from "@/lib/utils";
import logoUrl from "@/assets/logo-global-jiujitsu.png";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
}

/**
 * Official Global Jiu-Jitsu academy logo. White artwork — designed to sit on
 * the midnight surfaces of the app. Use `size="xl"` for splash/login screens.
 */
export function BrandLogo({ className, size = "md", showWordmark = false }: Props) {
  const h =
    size === "sm" ? "h-7" : size === "md" ? "h-10" : size === "lg" ? "h-16" : "h-24";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={logoUrl}
        alt="Global Jiu-Jitsu"
        className={cn(h, "w-auto select-none drop-shadow-[0_4px_20px_oklch(0.78_0.13_85_/_0.25)]")}
        draggable={false}
      />
      {showWordmark && (
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
            Global
          </span>
          <span className="font-display text-base font-bold text-foreground">
            Jiu-Jitsu
          </span>
        </div>
      )}
    </div>
  );
}
