import { createFileRoute } from "@tanstack/react-router";
import { RolePanel } from "@/components/RolePanel";
import { Users, GraduationCap, Calendar, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  return (
    <RolePanel
      allow={["admin"]}
      title="Panel de Administración"
      subtitle="Gestiona la academia, sucursales, instructores y estudiantes."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi icon={<Users />} label="Estudiantes" value="—" />
        <Kpi icon={<GraduationCap />} label="Instructores" value="—" />
        <Kpi icon={<Calendar />} label="Clases" value="—" />
        <Kpi icon={<TrendingUp />} label="Asistencia" value="—%" />
      </div>
      <div className="mt-8 rounded-3xl border border-border bg-surface p-6 shadow-elevated">
        <h2 className="text-lg font-semibold text-foreground">Próximamente</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Módulos de gestión de instructores, estudiantes, sucursales, rankings, certificados y promoción de cinturones.
        </p>
      </div>
    </RolePanel>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-elevated">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
