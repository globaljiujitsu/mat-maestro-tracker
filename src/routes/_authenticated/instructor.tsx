import { createFileRoute } from "@tanstack/react-router";
import { RolePanel } from "@/components/RolePanel";

export const Route = createFileRoute("/_authenticated/instructor")({
  component: InstructorPage,
});

function InstructorPage() {
  return (
    <RolePanel
      allow={["instructor", "admin"]}
      title="Panel del Profesor"
      subtitle="Administra tus clases, asistencia y evaluaciones técnicas."
    >
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-elevated">
        <h2 className="text-lg font-semibold text-foreground">Próximamente</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Crear y editar clases, registrar asistencia pre y post-clase, evaluar técnicas y subir videos.
        </p>
      </div>
    </RolePanel>
  );
}
