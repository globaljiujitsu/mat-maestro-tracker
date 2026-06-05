import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, Trophy, BookOpen, Activity, CalendarDays, Medal, CheckCircle2, Clock, Circle, Award } from "lucide-react";
import { BeltBadge } from "@/components/BeltBadge";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/instructor/students/$studentId")({
  component: InstructorStudentDetail,
});

function InstructorStudentDetail() {
  const { studentId } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["instructor-student-detail", studentId],
    queryFn: async () => {
      const [profile, student, attendance, progress, champs] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, avatar_url").eq("id", studentId).maybeSingle(),
        supabase.from("students").select("*, branches(name)").eq("id", studentId).maybeSingle(),
        supabase
          .from("attendance")
          .select("id, check_in_status, booking_status, created_at, class_id")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("technique_progress")
          .select("status, technique_id, techniques(title, belt_level, category)")
          .eq("student_id", studentId),
        supabase
          .from("championships")
          .select("*")
          .eq("student_id", studentId)
          .order("date", { ascending: false }),
      ]);
      return {
        profile: profile.data,
        student: student.data,
        attendance: attendance.data ?? [],
        progress: progress.data ?? [],
        champs: champs.data ?? [],
      };
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!data?.profile) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Atleta no encontrado.</p>;
  }

  const { profile, student, attendance, progress, champs } = data;
  const presentCount = attendance.filter((a) => a.check_in_status === "present").length;
  const masteredCount = progress.filter((p) => p.status === "mastered").length;
  const inProgressCount = progress.filter((p) => p.status === "in_progress").length;

  return (
    <div className="space-y-5">
      <Link to="/instructor/students" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
        <ArrowLeft className="h-3.5 w-3.5" /> Atletas
      </Link>

      <section className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-5 shadow-elevated">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-primary/40 bg-surface-elevated">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-2xl font-bold text-primary">
              {(profile.full_name ?? "?").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold text-foreground">{profile.full_name ?? "Sin nombre"}</p>
          <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <BeltBadge belt={(student?.belt_rank as "white") ?? "white"} />
            {student?.branches?.name && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{student.branches.name}</span>}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2.5">
        <Stat icon={Activity} label="Horas" value={Number(student?.total_training_hours ?? 0).toFixed(1)} />
        <Stat icon={CalendarDays} label="Clases" value={student?.total_classes_attended ?? 0} />
        <Stat icon={Trophy} label="Podios" value={champs.length} />
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5 shadow-elevated">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Técnicas</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Tile label="Dominadas" value={masteredCount} tone="success" />
          <Tile label="En progreso" value={inProgressCount} tone="primary" />
          <Tile label="Total eval." value={progress.length} tone="muted" />
        </div>
      </section>

      <BeltPromotion studentId={studentId} currentBelt={(student?.belt_rank as Belt) ?? "white"} />

      <TechniqueEvaluator studentId={studentId} branchId={student?.branch_id ?? null} beltRank={(student?.belt_rank as string) ?? "white"} />




      <section className="rounded-3xl border border-border bg-surface p-5 shadow-elevated">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Últimas asistencias</p>
        </div>
        {attendance.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin registros.</p>
        ) : (
          <ul className="space-y-2">
            {attendance.slice(0, 10).map((a) => (
              <li key={a.id} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{format(parseISO(a.created_at), "d MMM yyyy", { locale: es })}</span>
                <span className={`font-bold uppercase tracking-wider ${a.check_in_status === "present" ? "text-success" : a.check_in_status === "absent" ? "text-destructive" : "text-muted-foreground"}`}>
                  {a.check_in_status}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">{presentCount} presencias confirmadas</p>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Campeonatos</p>
        </div>
        {champs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin campeonatos registrados.</p>
        ) : (
          <ul className="space-y-3">
            {champs.map((c) => (
              <li key={c.id} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated">
                {c.photo_url && <img src={c.photo_url} alt={c.name} loading="lazy" className="h-40 w-full object-cover" />}
                <div className="p-4">
                  <div className="flex items-center gap-1.5">
                    <Medal className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{c.result}</span>
                  </div>
                  <p className="mt-1 font-display font-semibold text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(c.date), "d 'de' MMMM, yyyy", { locale: es })}</p>
                  {c.description && <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3 text-center shadow-elevated">
      <Icon className="mx-auto mb-1 h-4 w-4 text-primary" />
      <p className="font-display text-xl font-bold text-foreground">{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone: "success" | "primary" | "muted" }) {
  const cls = tone === "success" ? "text-success" : tone === "primary" ? "text-primary" : "text-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <p className={`font-display text-2xl font-bold ${cls}`}>{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

const BELT_ORDER = ["white", "blue", "purple", "brown", "black"] as const;
type TStatus = "not_evaluated" | "in_progress" | "mastered";
const NEXT: Record<TStatus, TStatus> = { not_evaluated: "in_progress", in_progress: "mastered", mastered: "not_evaluated" };

function TechniqueEvaluator({ studentId, branchId, beltRank }: { studentId: string; branchId: string | null; beltRank: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const allowed = BELT_ORDER.slice(0, BELT_ORDER.indexOf(beltRank as "white") + 1);

  const { data: techniques } = useQuery({
    queryKey: ["eval-techniques", branchId, allowed.join(",")],
    queryFn: async () => {
      let q = supabase.from("techniques").select("id, title, category, belt_level").in("belt_level", allowed as unknown as ("white"|"blue"|"purple"|"brown"|"black")[]).order("belt_level").order("display_order");
      if (branchId) q = q.or(`branch_id.is.null,branch_id.eq.${branchId}`);
      else q = q.is("branch_id", null);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["eval-progress", studentId],
    queryFn: async () => {
      const { data } = await supabase.from("technique_progress").select("technique_id, status").eq("student_id", studentId);
      return new Map<string, TStatus>((data ?? []).map((p) => [p.technique_id, p.status as TStatus]));
    },
  });

  const cycle = async (techniqueId: string, current: TStatus) => {
    const next = NEXT[current];
    const { error } = await supabase
      .from("technique_progress")
      .upsert({ student_id: studentId, technique_id: techniqueId, status: next, evaluated_by: user?.id }, { onConflict: "student_id,technique_id" });
    if (error) {
      // Fallback: insert/update without upsert constraint
      const existing = progress?.get(techniqueId);
      if (existing !== undefined) {
        await supabase.from("technique_progress").update({ status: next, evaluated_by: user?.id }).eq("student_id", studentId).eq("technique_id", techniqueId);
      } else {
        await supabase.from("technique_progress").insert({ student_id: studentId, technique_id: techniqueId, status: next, evaluated_by: user?.id });
      }
    }
    qc.invalidateQueries({ queryKey: ["eval-progress", studentId] });
    qc.invalidateQueries({ queryKey: ["instructor-student-detail", studentId] });
    toast.success(`Técnica marcada como ${next.replace("_", " ")}`);
  };

  if (!techniques || techniques.length === 0) {
    return (
      <section className="rounded-3xl border border-border bg-surface p-5 shadow-elevated">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Evaluar técnicas</p>
        <p className="mt-2 text-sm text-muted-foreground">No hay técnicas disponibles para este cinturón.</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-border bg-surface p-5 shadow-elevated">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Evaluar técnicas · toca para cambiar</p>
      <ul className="space-y-2">
        {techniques.map((t) => {
          const st: TStatus = progress?.get(t.id) ?? "not_evaluated";
          const Icon = st === "mastered" ? CheckCircle2 : st === "in_progress" ? Clock : Circle;
          const tone = st === "mastered" ? "text-success" : st === "in_progress" ? "text-primary" : "text-muted-foreground";
          return (
            <li key={t.id}>
              <button onClick={() => cycle(t.id, st)} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background/40 p-3 text-left transition-liquid hover:border-primary/50">
                <Icon className={`h-5 w-5 shrink-0 ${tone}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{t.title}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.belt_level} · {t.category}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${tone}`}>{st.replace("_", " ")}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
