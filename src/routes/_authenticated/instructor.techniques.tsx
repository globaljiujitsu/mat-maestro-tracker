import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { Sparkles, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { BeltBadge } from "@/components/BeltBadge";

type TechStatus = "not_evaluated" | "in_progress" | "mastered";
const STATUSES: { v: TechStatus; label: string; cls: string }[] = [
  { v: "not_evaluated", label: "Pendiente", cls: "border-border text-muted-foreground" },
  { v: "in_progress", label: "Aprendiendo", cls: "border-primary/40 text-primary bg-primary/10" },
  { v: "mastered", label: "Dominado", cls: "border-success/40 text-success bg-success/10" },
];

export const Route = createFileRoute("/_authenticated/instructor/techniques")({
  component: TechniquesEval,
});

function TechniquesEval() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [studentId, setStudentId] = useState<string | null>(null);

  const { data: students } = useQuery({
    queryKey: ["all-students"],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("id, belt_rank, profiles:id(full_name)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const { data: techniques } = useQuery({
    queryKey: ["techniques-all"],
    queryFn: async () => {
      const { data } = await supabase.from("techniques").select("*").order("belt_level").order("display_order");
      return data ?? [];
    },
  });

  const { data: progress, isLoading } = useQuery({
    queryKey: ["student-progress", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data } = await supabase
        .from("technique_progress")
        .select("id, technique_id, status")
        .eq("student_id", studentId!);
      return data ?? [];
    },
  });

  const progressMap = new Map(progress?.map((p) => [p.technique_id, p]));

  const setStatus = useMutation({
    mutationFn: async ({ techId, status }: { techId: string; status: TechStatus }) => {
      const existing = progressMap.get(techId);
      if (existing) {
        const { error } = await supabase
          .from("technique_progress")
          .update({ status, evaluated_by: user!.id })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("technique_progress").insert({
          student_id: studentId!,
          technique_id: techId,
          status,
          evaluated_by: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-progress", studentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Evaluación</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">Técnicas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Evalúa el progreso técnico de cada atleta.</p>
      </div>

      <div>
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Selecciona atleta</label>
        <select
          value={studentId ?? ""}
          onChange={(e) => setStudentId(e.target.value || null)}
          className="input-base"
        >
          <option value="">— Elegir —</option>
          {(students ?? []).map((s) => {
            const name = (s.profiles as { full_name?: string } | null)?.full_name ?? "—";
            return <option key={s.id} value={s.id}>{name} · {s.belt_rank}</option>;
          })}
        </select>
      </div>

      {!studentId ? (
        <EmptyState icon={Users} title="Elige un atleta" description="Selecciona arriba para evaluar." />
      ) : isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (techniques ?? []).length === 0 ? (
        <EmptyState icon={Sparkles} title="Sin técnicas" description="Aún no hay técnicas registradas." />
      ) : (
        <ul className="space-y-2.5">
          {techniques!.map((t) => {
            const current = progressMap.get(t.id)?.status ?? "not_evaluated";
            return (
              <li key={t.id} className="rounded-2xl border border-border bg-surface p-4 shadow-elevated">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-semibold text-foreground">{t.title}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <BeltBadge belt={t.belt_level} />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.category}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {STATUSES.map((s) => (
                    <button
                      key={s.v}
                      onClick={() => setStatus.mutate({ techId: t.id, status: s.v })}
                      className={`rounded-lg border px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-liquid ${current === s.v ? s.cls : "border-border text-muted-foreground hover:border-primary/40"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
