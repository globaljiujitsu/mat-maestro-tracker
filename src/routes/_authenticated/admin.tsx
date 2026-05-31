import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { BrandLogo } from "@/components/BrandLogo";
import { BottomTabs, type TabItem } from "@/components/BottomTabs";
import { LogOut, LayoutDashboard, Users, Building2, Trophy } from "lucide-react";

const TABS: TabItem[] = [
  { to: "/admin", label: "Panel", icon: LayoutDashboard },
  { to: "/admin/users", label: "Usuarios", icon: Users },
  { to: "/admin/branches", label: "Sucursales", icon: Building2 },
  { to: "/admin/championships", label: "Eventos", icon: Trophy },
];

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { role, signOut } = useAuth();
  if (role === "instructor") return <Navigate to="/instructor" />;
  if (role === "student") return <Navigate to="/student" />;

  return (
    <div className="min-h-screen bg-gradient-midnight safe-top">
      <div className="bg-hero pointer-events-none fixed inset-x-0 top-0 -z-10 h-[45vh]" />
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <BrandLogo size="sm" />
          <button
            onClick={signOut}
            aria-label="Cerrar sesión"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-liquid hover:border-destructive/60 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-32 pt-5">
        <Outlet />
      </main>
      <BottomTabs items={TABS} />
    </div>
  );
}
