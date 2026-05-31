import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, Users, Trophy, TrendingUp, Loader2 } from "lucide-react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/instructor/")({
  component: InstructorDashboard,
});

function InstructorDashboard() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["instructor-dash", userId],
    enabled: !!userId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [classesRes, instructorRes] = await Promise.all([
        supabase
          .from("classes")
          .select("id, title, date, time, max_capacity, branches(name)")
          .eq("instructor_id", userId)
          .gte("date", today)
          .order("date")
          .order("time")
          .limit(10),
        supabase.from("instructors").select("total_classes_taught, belt_rank").eq("id", userId).maybeSingle(),
      ]);

      const classIds = (classesRes.data ?? []).map((c) => c.id);
      const { data: att } = classIds.length
        ? await supabase.from("attendance").select("class_id, booking_status").in("class_id", classIds)
        : { data: [] as { class_id: string; booking_status: string }[] };

      const bookedMap = new Map<string, number>();
      (att ?? []).forEach((a) => {
        if (a.booking_status === "confirmed")
          bookedMap.set(a.class_id, (bookedMap.get(a.class_id) ?? 0) + 1);
      });

      return {
        classes: classesRes.data ?? [],
        bookedMap,
        instructor: instructorRes.data,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const totalBooked = Array.from(data?.bookedMap.values() ?? []).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Profesor</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">Bienvenido</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tu panel de control de clases y atletas.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Kpi icon={<CalendarDays />} label="Próximas" value={String(data?.classes.length ?? 0)} />
        <Kpi icon={<Users />} label="Reservas" value={String(totalBooked)} />
        <Kpi icon={<Trophy />} label="Total dictadas" value={String(data?.instructor?.total_classes_taught ?? 0)} />
      </div>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Próximas clases</h2>
        {(data?.classes ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No tienes clases programadas.
          </div>
        ) : (
          <ul className="space-y-2.5">
            {data!.classes.map((c) => {
              const d = parseISO(c.date);
              const label = isToday(d) ? "Hoy" : isTomorrow(d) ? "Mañana" : format(d, "EEE d MMM", { locale: es });
              const booked = data!.bookedMap.get(c.id) ?? 0;
              return (
                <li key={c.id} className="rounded-2xl border border-border bg-surface p-4 shadow-elevated">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        {label} · {c.time.slice(0, 5)}
                      </p>
                      <p className="mt-1 font-display font-semibold text-foreground">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.branches?.name ?? "—"}</p>
                    </div>
                    <div className="rounded-xl bg-primary/10 px-3 py-1.5 text-center">
                      <p className="font-display text-lg font-bold text-primary">{booked}</p>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">/{c.max_capacity}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3 shadow-elevated">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-xl font-bold text-foreground flex items-center gap-1">
        {value}
        <TrendingUp className="h-3 w-3 text-success" />
      </p>
    </div>
  );
}
