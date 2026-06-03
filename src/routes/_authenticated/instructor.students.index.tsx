import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { Users, Loader2, ChevronRight, Search } from "lucide-react";
import { BeltBadge } from "@/components/BeltBadge";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/_authenticated/instructor/students/")({
  component: InstructorStudents,
});

function InstructorStudents() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["instructor-students-list"],
    queryFn: async () => {
      const { data: students } = await supabase
        .from("students")
        .select("id, belt_rank, branch_id, total_classes_attended, attendance_percentage, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      const ids = (students ?? []).map((s) => s.id);
      const [profs, branches] = await Promise.all([
        ids.length ? supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", ids) : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string; avatar_url: string | null }[] }),
        supabase.from("branches").select("id, name"),
      ]);
      const pm = new Map((profs.data ?? []).map((p) => [p.id, p]));
      const bm = new Map((branches.data ?? []).map((b) => [b.id, b.name]));
      return (students ?? []).map((s) => ({
        ...s,
        profile: pm.get(s.id) ?? null,
        branchName: s.branch_id ? bm.get(s.branch_id) ?? null : null,
      }));
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter((s) =>
      s.profile?.full_name?.toLowerCase().includes(term) || s.profile?.email?.toLowerCase().includes(term),
    );
  }, [data, q]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Atletas</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">Alumnos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Frecuencia, faixa, técnicas y campeonatos de cada uno.</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="input-base pl-10" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="Sin atletas" description="Aún no hay alumnos activos." />
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((s) => (
            <li key={s.id}>
              <Link
                to="/instructor/students/$studentId"
                params={{ studentId: s.id }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-elevated transition-liquid hover:border-primary/50"
              >
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-elevated">
                  {s.profile?.avatar_url ? (
                    <img src={s.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-display text-sm font-bold text-primary">
                      {(s.profile?.full_name ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{s.profile?.full_name ?? "Sin nombre"}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <BeltBadge belt={s.belt_rank as "white"} />
                    {s.branchName && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.branchName}</span>}
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.total_classes_attended} clases</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
