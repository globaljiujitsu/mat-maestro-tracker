import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { Sparkles, PlayCircle, Save, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { BeltBadge } from "@/components/BeltBadge";

type Belt = "white" | "blue" | "purple" | "brown" | "black";
const BELTS: Belt[] = ["white", "blue", "purple", "brown", "black"];

export const Route = createFileRoute("/_authenticated/instructor/techniques")({
  component: TechniquesLibrary,
});

/** Convert any Google Drive share URL into an embeddable preview URL. */
function toEmbedUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  // Google Drive: file/d/{id}/view  or  open?id={id}
  const driveFile = s.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveFile) return `https://drive.google.com/file/d/${driveFile[1]}/preview`;
  const driveOpen = s.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (driveOpen) return `https://drive.google.com/file/d/${driveOpen[1]}/preview`;
  // YouTube short / watch — keep working
  const ytWatch = s.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}`;
  const ytShort = s.match(/youtu\.be\/([^?]+)/);
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}`;
  return s;
}

function TechniquesLibrary() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const qc = useQueryClient();
  const [belt, setBelt] = useState<Belt>("white");

  const { data: me } = useQuery({
    queryKey: ["me-instructor", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("instructors")
        .select("branch_id, branches(name)")
        .eq("id", userId)
        .maybeSingle();
      return data;
    },
  });
  const myBranchId = me?.branch_id ?? null;

  const { data: techniques, isLoading } = useQuery({
    queryKey: ["techniques-library", myBranchId, belt],
    queryFn: async () => {
      let q = supabase
        .from("techniques")
        .select("id, title, category, belt_level, description, video_url, branch_id")
        .eq("belt_level", belt)
        .order("display_order");
      if (myBranchId) q = q.or(`branch_id.is.null,branch_id.eq.${myBranchId}`);
      else q = q.is("branch_id", null);
      const { data } = await q;
      return data ?? [];
    },
  });

  const list = useMemo(() => techniques ?? [], [techniques]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Técnicas</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">Biblioteca</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Cambia o sube el video de cada técnica desde tu Google Drive. La técnica se mantiene; solo se actualiza el video que verán los alumnos.
        </p>
        {me?.branches?.name && (
          <p className="mt-1 text-xs text-muted-foreground">
            Sucursal: <span className="font-bold text-primary">{me.branches.name}</span>
          </p>
        )}
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

      {isLoading ? null : list.length === 0 ? (
        <EmptyState icon={Sparkles} title="Sin técnicas" description="No hay técnicas para este cinturón." />
      ) : (
        <ul className="space-y-3">
          {list.map((t) => (
            <TechniqueRow
              key={t.id}
              technique={t}
              onSaved={() => qc.invalidateQueries({ queryKey: ["techniques-library"] })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TechniqueRow({
  technique,
  onSaved,
}: {
  technique: {
    id: string;
    title: string;
    category: string;
    belt_level: Belt;
    description: string | null;
    video_url: string | null;
    branch_id: string | null;
  };
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(technique.video_url ?? "");
  const [saving, setSaving] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      setSaving(true);
      const embed = url ? toEmbedUrl(url) : null;
      const { error } = await supabase
        .from("techniques")
        .update({ video_url: embed })
        .eq("id", technique.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Video actualizado");
      setEditing(false);
      setSaving(false);
      onSaved();
    },
    onError: (e: Error) => {
      setSaving(false);
      toast.error(e.message);
    },
  });

  const clear = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("techniques").update({ video_url: null }).eq("id", technique.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setUrl("");
      toast.success("Video eliminado");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <li className="rounded-2xl border border-border bg-surface p-4 shadow-elevated">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold text-foreground">{technique.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <BeltBadge belt={technique.belt_level} />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{technique.category}</span>
            {technique.video_url && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                <PlayCircle className="h-3 w-3" /> Con video
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setEditing((v) => !v)}
          className="rounded-lg border border-primary/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10"
        >
          {editing ? "Cerrar" : technique.video_url ? "Cambiar video" : "Subir video"}
        </button>
      </div>

      {editing && (
        <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            URL del video (Google Drive o YouTube)
          </label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://drive.google.com/file/d/…/view"
            className="input-base"
          />
          <p className="text-[10px] text-muted-foreground">
            Pega el enlace de Google Drive. Asegúrate de compartir el archivo como <strong>“Cualquiera con el enlace”</strong> para que los alumnos lo vean.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => save.mutate()}
              disabled={saving || !url.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-gold px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-gold disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" /> Guardar
            </button>
            {technique.video_url && (
              <button
                onClick={() => clear.mutate()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Quitar video
              </button>
            )}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="h-3 w-3" /> Abrir
              </a>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
