import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { ClipboardCheck, Check, X, Loader2, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/instructor/attendance")({
  component: AttendancePage,
});

function AttendancePage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const qc = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const { data: classes } = useQuery({
    queryKey: ["instructor-classes-for-att", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("classes")
        .select("id, title, date, time")
        .eq("instructor_id", userId)
        .order("date", { ascending: false })
        .order("time", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  const { data: attendance, isLoading } = useQuery({
    queryKey: ["class-attendance", selectedClassId],
    enabled: !!selectedClassId,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("id, student_id, booking_status, check_in_status, profiles:student_id(full_name, avatar_url)")
        .eq("class_id", selectedClassId!)
        .order("created_at");
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "present" | "absent" | "pending" }) => {
      const { error } = await supabase.from("attendance").update({ check_in_status: status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Asistencia actualizada");
      qc.invalidateQueries({ queryKey: ["class-attendance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmed = (attendance ?? []).filter((a) => a.booking_status === "confirmed");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Control</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">Asistencia</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pre-confirma reservas y registra la asistencia real.</p>
      </div>

      <div>
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Selecciona una clase</label>
        <select
          value={selectedClassId ?? ""}
          onChange={(e) => setSelectedClassId(e.target.value || null)}
          className="input-base"
        >
          <option value="">— Elegir —</option>
          {(classes ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {format(parseISO(c.date), "EEE d MMM", { locale: es })} · {c.time.slice(0, 5)} — {c.title}
            </option>
          ))}
        </select>
      </div>

      {!selectedClassId ? (
        <EmptyState icon={CalendarDays} title="Elige una clase" description="Selecciona arriba para ver los inscritos." />
      ) : isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : confirmed.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Sin reservas" description="Nadie reservó aún esta clase." />
      ) : (
        <ul className="space-y-2.5">
          {confirmed.map((a) => {
            const name = (a.profiles as { full_name?: string } | null)?.full_name ?? "Alumno";
            return (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-elevated">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{name}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Estado: <span className={a.check_in_status === "present" ? "text-success" : a.check_in_status === "absent" ? "text-destructive" : "text-muted-foreground"}>{a.check_in_status}</span>
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => updateStatus.mutate({ id: a.id, status: "present" })}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-liquid ${a.check_in_status === "present" ? "border-success bg-success/20 text-success" : "border-border text-muted-foreground hover:border-success/60 hover:text-success"}`}
                    aria-label="Presente"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => updateStatus.mutate({ id: a.id, status: "absent" })}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-liquid ${a.check_in_status === "absent" ? "border-destructive bg-destructive/20 text-destructive" : "border-border text-muted-foreground hover:border-destructive/60 hover:text-destructive"}`}
                    aria-label="Ausente"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
