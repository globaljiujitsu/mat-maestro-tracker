import { createFileRoute } from "@tanstack/react-router";
import { RolePanel } from "@/components/RolePanel";
import { Trophy, Activity, Clock, Award } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student")({
  component: StudentPage,
});

function StudentPage() {
  return (
    <RolePanel
      allow={["student", "admin", "instructor"]}
      title="Mi Dashboard"
      subtitle="Tu progreso, clases, ranking y campeonatos."
    >
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={<Activity />} label="Asistencia" value="0%" />
        <Stat icon={<Clock />} label="Horas de Entrenamiento" value="0 h" />
        <Stat icon={<Trophy />} label="Ranking Sucursal" value="—" />
        <Stat icon={<Award />} label="Campeonatos" value="0" />
      </div>
      <div className="mt-8 rounded-3xl border border-border bg-surface p-6 shadow-elevated">
        <h2 className="text-lg font-semibold text-foreground">Próximamente</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Inscripción a clases, biblioteca de técnicas con animaciones Lottie, historial de campeonatos y certificados.
        </p>
      </div>
    </RolePanel>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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
