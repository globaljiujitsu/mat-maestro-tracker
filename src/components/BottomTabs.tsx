import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface TabItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface Props {
  items: TabItem[];
}

/** Mobile-first bottom navigation, glassmorphism over midnight. */
export function BottomTabs({ items }: Props) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-2xl">
      <ul className="mx-auto flex max-w-5xl items-stretch justify-around px-2 py-1.5">
        {items.map(({ to, label, icon: Icon }) => {
          const active =
            to === path ||
            (to !== "/" && path.startsWith(to) && (path[to.length] === "/" || path.length === to.length));
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 transition-liquid",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl transition-liquid",
                    active && "bg-primary/15 shadow-gold/30",
                  )}
                >
                  <Icon className="h-4.5 w-4.5" strokeWidth={active ? 2.5 : 2} size={18} />
                </div>
                <span className={cn("text-[10px] font-semibold tracking-wide", active && "text-primary")}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
