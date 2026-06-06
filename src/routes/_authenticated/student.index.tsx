import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { BeltBadge } from "@/components/BeltBadge";
import { EmptyState } from "@/components/EmptyState";
import { Activity, Clock, Trophy, Award, CalendarDays, Flame, ArrowRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/student/")({
  component: StudentHome,
});

function StudentHome() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const { data: student } = useQuery({
    queryKey: ["student", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("students").select("*, branches(name)").eq("id", userId).maybeSingle();
      return data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
      return data;
    },
  });

  const { data: upcoming } = useQuery({
    queryKey: ["upcoming-bookings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("attendance")
        .select("id, class_id, booking_status, classes!inner(id, title, date, time, branches(name))")
        .eq("student_id", userId)
        .eq("booking_status", "confirmed")
        .gte("classes.date", today)
        .order("class_id", { ascending: true })
        .limit(3);
      return (data ?? []).filter((r) => r.classes);
    },
  });

  const { data: champCount } = useQuery({
    queryKey: ["champ-count", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count } = await supabase
        .from("championships")
        .select("*", { count: "exact", head: true })
        .eq("student_id", userId);
      return count ?? 0;
    },
  });

  const { data: attendancePct } = useQuery({
    queryKey: ["attendance-pct", userId],
    enabled: !!userId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("attendance")
        .select("check_in_status, classes!inner(date)")
        .eq("student_id", userId)
        .eq("booking_status", "confirmed")
        .lte("classes.date", today);
      const rows = (data ?? []).filter((r) => r.classes);
      if (rows.length === 0) return 0;
      const present = rows.filter((r) => r.check_in_status === "present").length;
      return Math.round((present / rows.length) * 100);
    },
  });

  const monthStartIso = (() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); })();

  const { data: myRank } = useQuery({
    queryKey: ["my-rank", userId, monthStartIso, student?.branch_id ?? null],
    enabled: !!userId,
    queryFn: async () => {
      const args: { _month: string; _limit: number; _branch_id?: string } = { _month: monthStartIso, _limit: 999 };
      if (student?.branch_id) args._branch_id = student.branch_id;
      const { data } = await supabase.rpc("monthly_top_students", args);
      const rows = data ?? [];
      const idx = rows.findIndex((r: { student_id: string }) => r.student_id === userId);
      return idx >= 0 ? idx + 1 : null;
    },
  });

  const firstName = (profile?.full_name ?? "").split(" ")[0] || "Atleta";

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Bienvenido</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-bold text-foreground">Hola, {firstName}</h1>
          <BeltBadge belt={student?.belt_rank as "white"} />
        </div>
        {student?.branches?.name && (
          <p className="mt-1 text-sm text-muted-foreground">Sucursal {student.branches.name}</p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Stat icon={<Activity />} label="Asistencia" value={`${attendancePct ?? 0}%`} />
        <Stat icon={<Clock />} label="Horas" value={`${Number(student?.total_training_hours ?? 0).toFixed(0)} h`} />
        <Stat icon={<Trophy />} label="Ranking mes" value={myRank ? `#${myRank}` : "—"} />
        <Stat icon={<Award />} label="Campeonatos" value={String(champCount ?? 0)} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground">Próximas clases</h2>
          <Link to="/student/classes" className="flex items-center gap-1 text-xs font-semibold text-primary">
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {!upcoming || upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Sin clases reservadas"
            description="Reserva tu próxima clase desde la pestaña Clases."
          />
        ) : (
          <ul className="space-y-3">
            {upcoming.map((b) => {
              const c = b.classes!;
              return (
                <li key={b.id} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-elevated">
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground">
                    <span className="text-[10px] font-bold uppercase">
                      {format(parseISO(c.date), "MMM", { locale: es })}
                    </span>
                    <span className="font-display text-xl font-black leading-none">
                      {format(parseISO(c.date), "dd")}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.time.slice(0, 5)} · {c.branches?.name ?? "—"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <MonthlyTopFive userId={userId} branchId={student?.branch_id ?? null} />

      <section className="rounded-3xl border border-border bg-gradient-to-br from-surface to-surface-elevated p-6 shadow-elevated">
        <div className="mb-3 flex items-center gap-2 text-primary">
          <Flame className="h-4 w-4" />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Estudiante del mes</p>
        </div>
        <p className="font-display text-lg font-bold text-foreground">Compite por el primer puesto</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Asiste a más clases y sube en el ranking de tu sucursal. El estudiante #1 al cierre del mes recibe un certificado oficial automáticamente.
        </p>
      </section>
    </div>
  );
}

function MonthlyTopFive({ userId, branchId }: { userId: string; branchId: string | null }) {
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthIso = monthStart.toISOString().slice(0, 10);

  const { data: top } = useQuery({
    queryKey: ["monthly-top", monthIso, branchId],
    queryFn: async () => {
      const args: { _month: string; _limit: number; _branch_id?: string } = { _month: monthIso, _limit: 5 };
      if (branchId) args._branch_id = branchId;
      const { data } = await supabase.rpc("monthly_top_students", args);
      return data ?? [];
    },
  });

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">Top 5 del mes</h2>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(monthStart, "MMMM yyyy", { locale: es })}</span>
      </div>
      {!top || top.length === 0 ? (
        <EmptyState icon={Trophy} title="Sin datos aún" description="Marca presencia en clase para entrar al ranking." />
      ) : (
        <ol className="space-y-2">
          {top.map((r: any, i: number) => {
            const isMe = r.student_id === userId;
            return (
              <li key={r.student_id} className={`flex items-center gap-3 rounded-2xl border p-3 ${isMe ? "border-primary bg-primary/10" : "border-border bg-surface"}`}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold ${i === 0 ? "bg-gradient-gold text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{r.full_name ?? "Atleta"}{isMe ? " (tú)" : ""}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{Number(r.hours).toFixed(1)} h · {r.classes_count} clases</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-elevated">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
