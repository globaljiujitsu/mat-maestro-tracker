import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { BeltBadge } from "@/components/BeltBadge";
import { EmptyState } from "@/components/EmptyState";
import { BookOpen, X, CheckCircle2, Circle, Clock } from "lucide-react";
import Lottie from "lottie-react";

export const Route = createFileRoute("/_authenticated/student/techniques")({
  component: TechniquesPage,
});

const BELTS = ["white", "blue", "purple", "brown", "black"] as const;
type Belt = (typeof BELTS)[number];

function TechniquesPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [belt, setBelt] = useState<Belt>("white");
  const [selected, setSelected] = useState<string | null>(null);

  const { data: techniques } = useQuery({
    queryKey: ["techniques", belt],
    queryFn: async () => {
      const { data } = await supabase
        .from("techniques")
        .select("*")
        .eq("belt_level", belt)
        .order("display_order");
      return data ?? [];
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["technique-progress", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("technique_progress")
        .select("technique_id, status")
        .eq("student_id", userId);
      return new Map((data ?? []).map((p) => [p.technique_id, p.status]));
    },
  });

  const active = useMemo(
    () => techniques?.find((t) => t.id === selected) ?? null,
    [techniques, selected],
  );

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Biblioteca</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">Técnicas</h1>
      </div>

      <div className="-mx-5 overflow-x-auto px-5">
        <div className="flex gap-2">
          {BELTS.map((b) => (
            <button
              key={b}
              onClick={() => setBelt(b)}
              className={`shrink-0 rounded-full border px-3 py-1.5 transition-liquid ${
                belt === b ? "border-primary bg-primary/10" : "border-border bg-surface"
              }`}
            >
              <BeltBadge belt={b} />
            </button>
          ))}
        </div>
      </div>

      {!techniques || techniques.length === 0 ? (
        <EmptyState icon={BookOpen} title="Sin técnicas" description="Aún no hay técnicas para este cinturón." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {techniques.map((t) => {
            const st = progress?.get(t.id) ?? "not_evaluated";
            return (
              <li key={t.id}>
                <button
                  onClick={() => setSelected(t.id)}
                  className="w-full rounded-2xl border border-border bg-surface p-4 text-left shadow-elevated transition-liquid hover:border-primary/50"
                >
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                    {t.category}
                  </div>
                  <p className="font-display text-base font-semibold text-foreground">{t.title}</p>
                  {t.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>}
                  <div className="mt-3"><StatusPill status={st} /></div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {active && <TechniqueDrawer technique={active} status={progress?.get(active.id) ?? "not_evaluated"} onClose={() => setSelected(null)} />}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "mastered")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
        <CheckCircle2 className="h-3 w-3" /> Dominada
      </span>
    );
  if (status === "in_progress")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
        <Clock className="h-3 w-3" /> En progreso
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      <Circle className="h-3 w-3" /> Sin evaluar
    </span>
  );
}

function TechniqueDrawer({
  technique,
  status,
  onClose,
}: {
  technique: { id: string; title: string; description: string | null; category: string; lottie_url: string | null; learning_objectives: string[] | null };
  status: string;
  onClose: () => void;
}) {
  const { data: lottieData } = useQuery({
    queryKey: ["lottie", technique.lottie_url],
    enabled: !!technique.lottie_url,
    queryFn: async () => {
      const res = await fetch(technique.lottie_url!);
      if (!res.ok) throw new Error("Lottie fetch failed");
      return res.json();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="safe-bottom max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border-t border-border bg-surface p-6 shadow-elevated animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{technique.category}</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-foreground">{technique.title}</h2>
          </div>
          <button onClick={onClose} className="rounded-full border border-border bg-background p-2 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <StatusPill status={status} />

        {lottieData ? (
          <div className="my-5 overflow-hidden rounded-2xl border border-border bg-background">
            <Lottie animationData={lottieData} loop />
          </div>
        ) : technique.lottie_url ? (
          <div className="my-5 flex h-48 items-center justify-center rounded-2xl border border-dashed border-border bg-background text-sm text-muted-foreground">
            Cargando animación…
          </div>
        ) : (
          <div className="my-5 flex h-48 items-center justify-center rounded-2xl border border-dashed border-border bg-background text-sm text-muted-foreground">
            Animación próximamente
          </div>
        )}

        {technique.description && <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{technique.description}</p>}

        {technique.learning_objectives && technique.learning_objectives.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Objetivos</p>
            <ul className="space-y-2">
              {technique.learning_objectives.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {o}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
