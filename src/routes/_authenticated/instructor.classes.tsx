import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { CalendarDays, Plus, Trash2, Loader2, MapPin, Users, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/instructor/classes")({
  component: InstructorClassesPage,
});

interface FormState {
  title: string;
  description: string;
  date: string;
  time: string;
  branch_id: string;
  max_capacity: number;
  duration_hours: number;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  date: new Date().toISOString().slice(0, 10),
  time: "19:00",
  branch_id: "",
  max_capacity: 20,
  duration_hours: 1.5,
};

function InstructorClassesPage() {
  const { user } = useAuth();
  const instructorName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "";
  const userId = user?.id ?? "";
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => (await supabase.from("branches").select("*").order("name")).data ?? [],
  });

  const { data: classes, isLoading } = useQuery({
    queryKey: ["my-classes", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("classes")
        .select("*, branches(name)")
        .eq("instructor_id", userId)
        .order("date", { ascending: false })
        .order("time", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.branch_id) throw new Error("Completa título y sucursal");
      const { error } = await supabase.from("classes").insert({
        instructor_id: userId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        date: form.date,
        time: form.time,
        branch_id: form.branch_id,
        max_capacity: form.max_capacity,
        duration_hours: form.duration_hours,
        status: "scheduled",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Clase creada · alumnos notificados");
      setOpen(false);
      setForm(EMPTY_FORM);
      qc.invalidateQueries({ queryKey: ["my-classes"] });
      qc.invalidateQueries({ queryKey: ["classes-range"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Clase eliminada");
      qc.invalidateQueries({ queryKey: ["my-classes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Gestión</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-foreground">Mis Clases</h1>
          {instructorName && (
            <p className="mt-1 text-xs text-muted-foreground">Profesor: <span className="font-semibold text-foreground">{instructorName}</span></p>
          )}
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-gold px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-gold"
        >
          <Plus className="h-4 w-4" /> Nueva
        </button>
      </div>

      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-elevated"
        >
          {instructorName && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
              Lanzada por: <span className="font-bold text-primary">{instructorName}</span>
            </div>
          )}
          <Field label="Título">
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-base" placeholder="Fundamentos · No-Gi" />
          </Field>
          <Field label="Descripción">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-base min-h-[64px] resize-none" placeholder="Opcional" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-base" />
            </Field>
            <Field label="Hora">
              <input type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="input-base" />
            </Field>
          </div>
          <Field label="Sucursal">
            <select required value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })} className="input-base">
              <option value="">Selecciona…</option>
              {(branches ?? []).map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duración (horas)">
              <input type="number" min={0.5} max={6} step={0.5} value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: Number(e.target.value) })} className="input-base" />
            </Field>
            <Field label="Capacidad máx.">
              <input type="number" min={1} max={100} value={form.max_capacity} onChange={(e) => setForm({ ...form, max_capacity: Number(e.target.value) })} className="input-base" />
            </Field>
          </div>
          <button type="submit" disabled={create.isPending} className="w-full rounded-xl bg-gradient-gold py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-gold disabled:opacity-60">
            {create.isPending ? "Creando…" : "Crear clase"}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (classes ?? []).length === 0 ? (
        <EmptyState icon={CalendarDays} title="Sin clases creadas" description="Crea tu primera clase con el botón Nueva." />
      ) : (
        <ul className="space-y-2.5">
          {classes!.map((c) => {
            const endTs = new Date(`${c.date}T${c.time}`).getTime() + (c.duration_hours ?? 1.5) * 3600 * 1000;
            const finished = c.status === "completed" || endTs < Date.now();
            return (
            <li key={c.id} className="rounded-2xl border border-border bg-surface p-4 shadow-elevated">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {format(parseISO(c.date), "EEE d MMM yyyy", { locale: es })} · {c.time.slice(0, 5)}
                    </p>
                    {finished && (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-success">Finalizada</span>
                    )}
                  </div>
                  <p className="mt-1 font-display font-semibold text-foreground">{c.title}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{c.branches?.name ?? "—"}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{c.duration_hours}h</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />Cap. {c.max_capacity}</span>
                  </div>
                </div>
                <button onClick={() => { if (confirm(`¿Eliminar "${c.title}"?`)) del.mutate(c.id); }} className="flex h-9 w-9 items-center justify-center rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10" aria-label="Eliminar">
                  <Trash2 className="h-4 w-4" />
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
