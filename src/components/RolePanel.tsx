import { useAuth, type AppRole } from "@/hooks/use-auth";
import { Navigate } from "@tanstack/react-router";
import { BrandLogo } from "@/components/BrandLogo";
import { LogOut, Bell } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  allow: AppRole[];
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** Shared dashboard chrome for role-gated panels. */
export function RolePanel({ allow, title, subtitle, children }: Props) {
  const { role, signOut } = useAuth();

  if (role && !allow.includes(role)) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-gradient-midnight safe-top safe-bottom">
      <div className="bg-hero pointer-events-none fixed inset-x-0 top-0 -z-10 h-[40vh]" />

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <BrandLogo size="sm" />
          <div className="flex items-center gap-2">
            <button
              aria-label="Notificaciones"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-liquid hover:border-primary/50"
            >
              <Bell className="h-4 w-4" />
            </button>
            <button
              onClick={signOut}
              aria-label="Cerrar sesión"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-liquid hover:border-destructive/60 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20 pt-6">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            {role === "admin" ? "Administración" : role === "instructor" ? "Profesor" : "Atleta"}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
