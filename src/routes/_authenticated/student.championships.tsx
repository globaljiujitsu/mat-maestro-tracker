import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { Trophy, Plus, Medal, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/student/championships")({
  component: ChampionshipsPage,
});

const RESULTS = [
  { value: "oro", label: "Oro", color: "oklch(0.78 0.13 85)" },
  { value: "plata", label: "Plata", color: "oklch(0.78 0.005 270)" },
  { value: "bronce", label: "Bronce", color: "oklch(0.55 0.13 50)" },
  { value: "participacion", label: "Participación", color: "oklch(0.55 0.005 270)" },
] as const;

function ChampionshipsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: champs } = useQuery({
    queryKey: ["championships", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("championships")
        .select("*")
        .eq("student_id", userId)
        .order("date", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Logros</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-foreground">Campeonatos</h1>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-gold px-3 py-2 text-xs font-bold text-primary-foreground shadow-gold"
        >
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </div>

      {!champs || champs.length === 0 ? (
        <EmptyState icon={Trophy} title="Sin campeonatos aún" description="Registra tu primer campeonato para empezar tu historial." />
      ) : (
        <ul className="space-y-3">
          {champs.map((c) => {
            const r = RESULTS.find((x) => x.value === c.result)!;
            return (
              <li key={c.id} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated">
                {c.photo_url && <img src={c.photo_url} alt={c.name} className="h-40 w-full object-cover" />}
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <Medal className="h-4 w-4" style={{ color: r.color }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: r.color }}>
                      {r.label}
                    </span>
                  </div>
                  <p className="mt-1 font-display text-lg font-semibold text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(c.date), "d 'de' MMMM, yyyy", { locale: es })}</p>
                  {c.description && <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <AddChampionshipDialog
          userId={userId}
          onClose={() => setOpen(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["championships"] });
            qc.invalidateQueries({ queryKey: ["champ-count"] });
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function AddChampionshipDialog({ userId, onClose, onSaved }: { userId: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<(typeof RESULTS)[number]["value"]>("oro");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      let photo_url: string | null = null;
      if (photoFile) {
        const { compressImage } = await import("@/lib/image-compress");
        const compressed = await compressImage(photoFile, 1024, 0.72);
        const path = `${userId}/${Date.now()}.jpg`;
        const up = await supabase.storage.from("championships").upload(path, compressed, { contentType: "image/jpeg" });
        if (up.error) throw up.error;
        const { data } = supabase.storage.from("championships").getPublicUrl(path);
        photo_url = data.publicUrl;
      }
      const { error } = await supabase.from("championships").insert({
        student_id: userId, name, date, result, description: description || null, photo_url,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Campeonato agregado"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="safe-bottom w-full max-w-md rounded-t-3xl border-t border-border bg-surface p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-foreground">Nuevo campeonato</h2>
          <button onClick={onClose} className="rounded-full border border-border bg-background p-2 text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); submit.mutate(); }} className="space-y-3">
          <Input label="Nombre" value={name} onChange={setName} required />
          <Input label="Fecha" type="date" value={date} onChange={setDate} required />
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resultado</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {RESULTS.map((r) => (
                <button key={r.value} type="button" onClick={() => setResult(r.value)}
                  className={`rounded-xl border py-2 text-sm font-semibold transition-liquid ${
                    result === r.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"
                  }`}>{r.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              className="mt-1 h-20 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Foto (opcional)</label>
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-primary" />
          </div>
          <button type="submit" disabled={submit.isPending}
            className="mt-2 w-full rounded-xl bg-gradient-gold py-3 text-sm font-bold text-primary-foreground shadow-gold disabled:opacity-60">
            {submit.isPending ? "Guardando…" : "Guardar campeonato"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" />
    </div>
  );
}
