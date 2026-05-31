import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Loader2, Medal } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/admin/championships")({
  component: AdminChampionships,
});

const RESULT_COLORS: Record<string, string> = {
  gold: "text-primary border-primary/50 bg-primary/10",
  silver: "text-foreground border-border bg-surface-elevated",
  bronze: "text-orange-400 border-orange-500/40 bg-orange-500/10",
  participation: "text-muted-foreground border-border",
};

function AdminChampionships() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-championships"],
    queryFn: async () => {
      const { data } = await supabase
        .from("championships")
        .select("*, profiles:student_id(full_name)")
        .order("date", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Resultados</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">Campeonatos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Historial de podios y participaciones.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={Trophy} title="Sin registros" description="Aún no hay campeonatos registrados." />
      ) : (
        <ul className="space-y-2.5">
          {data!.map((c) => {
            const name = (c.profiles as { full_name?: string } | null)?.full_name ?? "—";
            return (
              <li key={c.id} className="rounded-2xl border border-border bg-surface p-4 shadow-elevated">
                <div className="flex items-start gap-3">
                  {c.photo_url && (
                    <img src={c.photo_url} alt="" className="h-16 w-16 rounded-xl object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-display font-semibold text-foreground">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{name}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${RESULT_COLORS[c.result] ?? ""}`}>
                        <Medal className="h-3 w-3" />{c.result}
                      </span>
                    </div>
                    <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {format(parseISO(c.date), "d 'de' MMM yyyy", { locale: es })}
                    </p>
                    {c.description && <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
