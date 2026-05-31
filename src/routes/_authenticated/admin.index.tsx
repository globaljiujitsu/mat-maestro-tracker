import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, GraduationCap, CalendarDays, Building2, Loader2 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDash,
});

const BELT_COLORS: Record<string, string> = {
  white: "oklch(0.95 0 0)",
  blue: "oklch(0.55 0.18 250)",
  purple: "oklch(0.45 0.18 305)",
  brown: "oklch(0.42 0.09 50)",
  black: "oklch(0.30 0 0)",
};

function AdminDash() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: async () => {
      const [students, instructors, classes, branches, attendance] = await Promise.all([
        supabase.from("students").select("belt_rank, branch_id, is_active"),
        supabase.from("instructors").select("id, is_active"),
        supabase.from("classes").select("id, branch_id, date"),
        supabase.from("branches").select("id, name"),
        supabase.from("attendance").select("check_in_status, created_at"),
      ]);

      const allStudents = students.data ?? [];
      const allClasses = classes.data ?? [];
      const allBranches = branches.data ?? [];
      const allAtt = attendance.data ?? [];

      const beltCounts: Record<string, number> = {};
      allStudents.forEach((s) => {
        beltCounts[s.belt_rank] = (beltCounts[s.belt_rank] ?? 0) + 1;
      });

      const branchMap = new Map(allBranches.map((b) => [b.id, b.name]));
      const studentsPerBranch: Record<string, number> = {};
      allStudents.forEach((s) => {
        const name = (s.branch_id && branchMap.get(s.branch_id)) || "Sin sucursal";
        studentsPerBranch[name] = (studentsPerBranch[name] ?? 0) + 1;
      });

      const presentCount = allAtt.filter((a) => a.check_in_status === "present").length;
      const total = allAtt.length || 1;

      return {
        studentsCount: allStudents.filter((s) => s.is_active).length,
        instructorsCount: (instructors.data ?? []).filter((i) => i.is_active).length,
        classesCount: allClasses.length,
        branchesCount: allBranches.length,
        attendancePct: Math.round((presentCount / total) * 100),
        belts: Object.entries(beltCounts).map(([name, value]) => ({ name, value })),
        branchData: Object.entries(studentsPerBranch).map(([name, value]) => ({ name, value })),
      };
    },
  });

  if (isLoading || !data) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Administración</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">Panel Global</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Kpi icon={<Users />} label="Atletas" value={String(data.studentsCount)} />
        <Kpi icon={<GraduationCap />} label="Profesores" value={String(data.instructorsCount)} />
        <Kpi icon={<CalendarDays />} label="Clases" value={String(data.classesCount)} />
        <Kpi icon={<Building2 />} label="Sucursales" value={String(data.branchesCount)} />
        <Kpi icon={<Users />} label="Asistencia" value={`${data.attendancePct}%`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Distribución de cinturones">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.belts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {data.belts.map((b) => (
                  <Cell key={b.name} fill={BELT_COLORS[b.name] ?? "oklch(0.5 0 0)"} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Atletas por sucursal">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.branchData}>
              <CartesianGrid stroke="oklch(0.25 0 0 / 0.4)" strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fill: "oklch(0.65 0 0)", fontSize: 11 }} />
              <YAxis tick={{ fill: "oklch(0.65 0 0)", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.16 0.005 270)",
                  border: "1px solid oklch(0.25 0 0)",
                  borderRadius: 12,
                  color: "oklch(0.98 0 0)",
                }}
              />
              <Bar dataKey="value" fill="oklch(0.78 0.13 85)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-elevated">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}
