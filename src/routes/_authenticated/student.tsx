import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { BrandLogo } from "@/components/BrandLogo";
import { BottomTabs, type TabItem } from "@/components/BottomTabs";
import { LogOut, Home, CalendarDays, BookOpen, Trophy, User } from "lucide-react";
import { NotificationsBell } from "@/components/NotificationsBell";
import { TextSizeControl } from "@/components/TextSizeControl";

const TABS: TabItem[] = [
  { to: "/student", label: "Inicio", icon: Home },
  { to: "/student/classes", label: "Clases", icon: CalendarDays },
  { to: "/student/techniques", label: "Técnicas", icon: BookOpen },
  { to: "/student/championships", label: "Campeonatos", icon: Trophy },
  { to: "/student/profile", label: "Perfil", icon: User },
];

export const Route = createFileRoute("/_authenticated/student")({
  component: StudentLayout,
});

function StudentLayout() {
  const { role, signOut } = useAuth();
  if (role === "admin") return <Navigate to="/admin" />;
  if (role === "instructor") return <Navigate to="/instructor" />;

  return (
    <div className="min-h-screen bg-gradient-midnight safe-top">
      <div className="bg-hero pointer-events-none fixed inset-x-0 top-0 -z-10 h-[45vh]" />

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <BrandLogo size="sm" />
          <div className="flex items-center gap-2">
            <TextSizeControl />
            <NotificationsBell />
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

      <main className="mx-auto max-w-5xl px-5 pb-32 pt-5">
        <Outlet />
      </main>

      <BottomTabs items={TABS} />
    </div>
  );
}
