import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { Sparkles, Loader2, Users, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { BeltBadge } from "@/components/BeltBadge";

type TechStatus = "not_evaluated" | "in_progress" | "mastered";
type Belt = "white" | "blue" | "purple" | "brown" | "black";

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
  const userId = user?.id ?? "";
  const qc = useQueryClient();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [tab, setTab] = useState<"eval" | "library">("eval");

  const { data: me } = useQuery({
    queryKey: ["me-instructor", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("instructors").select("branch_id, branches(name)").eq("id", userId).maybeSingle();
      return data;
    },
  });
  const myBranchId = me?.branch_id ?? null;

  const { data: students } = useQuery({
    queryKey: ["all-students", myBranchId],
    queryFn: async () => {
      let q = supabase.from("students").select("id, belt_rank, branch_id, profiles:id(full_name)").eq("is_active", true);
      if (myBranchId) q = q.eq("branch_id", myBranchId);
      const { data } = await q.order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  const { data: techniques } = useQuery({
    queryKey: ["techniques-instructor", myBranchId],
    queryFn: async () => {
      // Show global (branch_id IS NULL) + own branch techniques
      let q = supabase.from("techniques").select("*").order("belt_level").order("display_order");
      if (myBranchId) q = q.or(`branch_id.is.null,branch_id.eq.${myBranchId}`);
      else q = q.is("branch_id", null);
      const { data } = await q;
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
          .update({ status, evaluated_by: userId })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("technique_progress").insert({
          student_id: studentId!,
          technique_id: techId,
          status,
          evaluated_by: userId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student-progress", studentId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Técnicas</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">
          {tab === "eval" ? "Evaluación" : "Biblioteca"}
        </h1>
        {me?.branches?.name && (
          <p className="mt-1 text-xs text-muted-foreground">Sucursal: <span className="font-bold text-primary">{me.branches.name}</span></p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface p-1">
        {(["eval", "library"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl py-2 text-xs font-bold uppercase tracking-wider transition-liquid ${
              tab === t ? "bg-gradient-gold text-primary-foreground shadow-gold" : "text-muted-foreground"
            }`}
          >
            {t === "eval" ? "Evaluar atletas" : "Mi biblioteca"}
          </button>
        ))}
      </div>

      {tab === "library" ? (
        <LibraryEditor
          myBranchId={myBranchId}
          myUserId={userId}
          techniques={techniques ?? []}
          onChanged={() => qc.invalidateQueries({ queryKey: ["techniques-instructor"] })}
        />
      ) : (
        <>
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
            <EmptyState icon={Sparkles} title="Sin técnicas" description="Crea técnicas en la pestaña Biblioteca." />
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
        </>
      )}
    </div>
  );
}

function LibraryEditor({
  myBranchId,
  myUserId,
  techniques,
  onChanged,
}: {
  myBranchId: string | null;
  myUserId: string;
  techniques: { id: string; title: string; belt_level: Belt; category: string; video_url: string | null; branch_id: string | null; uploaded_by: string | null }[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [belt, setBelt] = useState<Belt>("white");
  const [category, setCategory] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myBranchId) {
      toast.error("Necesitas estar asignado a una sucursal.");
      return;
    }
    setPending(true);
    const { error } = await supabase.from("techniques").insert({
      title: title.trim(),
      belt_level: belt,
      category: category.trim() || "General",
      video_url: videoUrl.trim() || null,
      description: description.trim() || null,
      branch_id: myBranchId,
      uploaded_by: myUserId,
    });
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Técnica creada");
    setTitle(""); setCategory(""); setVideoUrl(""); setDescription("");
    setOpen(false);
    onChanged();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta técnica?")) return;
    const { error } = await supabase.from("techniques").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Eliminada");
    onChanged();
  };

  const mine = techniques.filter((t) => t.uploaded_by === myUserId);
  const shared = techniques.filter((t) => t.uploaded_by !== myUserId);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-gold py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-gold"
      >
        <Plus className="h-4 w-4" /> Nueva técnica
      </button>

      {open && (
        <form onSubmit={create} className="space-y-3 rounded-2xl border border-primary/30 bg-surface p-4 shadow-elevated">
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (Armbar desde la guardia)" className="input-base" />
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={belt} onChange={(e) => setBelt(e.target.value as Belt)} className="input-base">
              <option value="white">Faixa Branca</option>
              <option value="blue">Faixa Azul</option>
              <option value="purple">Faixa Roxa</option>
              <option value="brown">Faixa Marrom</option>
              <option value="black">Faixa Preta</option>
            </select>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Categoría (Sumisión, Guardia…)" className="input-base" />
          </div>
          <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="YouTube embed URL (https://www.youtube.com/embed/…)" className="input-base" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción / objetivos" className="input-base min-h-[64px] resize-none" />
          <button disabled={pending} className="w-full rounded-xl bg-gradient-gold py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-gold disabled:opacity-60">
            {pending ? "Guardando…" : "Crear técnica"}
          </button>
        </form>
      )}

      <section>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-primary">Mis técnicas ({mine.length})</p>
        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no has creado técnicas para tu sucursal.</p>
        ) : (
          <ul className="space-y-2">
            {mine.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3 shadow-elevated">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{t.title}</p>
                  <div className="mt-1 flex items-center gap-2"><BeltBadge belt={t.belt_level} /><span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.category}</span></div>
                </div>
                <button onClick={() => remove(t.id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10" aria-label="Eliminar">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Globales / compartidas ({shared.length})</p>
        <p className="text-xs text-muted-foreground">Estas técnicas se ven en todas las sucursales.</p>
      </section>
    </div>
  );
}
