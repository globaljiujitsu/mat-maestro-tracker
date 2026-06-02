import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { BeltBadge } from "@/components/BeltBadge";
import { EmptyState } from "@/components/EmptyState";
import { Award, Download, Upload, LogOut, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/student/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut } = useAuth();
  const userId = user?.id ?? "";
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile-full", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      return data;
    },
  });

  const { data: student } = useQuery({
    queryKey: ["student-full", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("students").select("*, branches(name)").eq("id", userId).maybeSingle();
      return data;
    },
  });

  const { data: certs } = useQuery({
    queryKey: ["my-certs", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("certificates").select("*").eq("student_id", userId).order("issue_date", { ascending: false });
      return data ?? [];
    },
  });

  const [name, setName] = useState("");
  useEffect(() => { if (profile?.full_name) setName(profile.full_name); }, [profile?.full_name]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Perfil actualizado"); qc.invalidateQueries({ queryKey: ["profile"] }); qc.invalidateQueries({ queryKey: ["profile-full"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const { compressImage } = await import("@/lib/image-compress");
      const compressed = await compressImage(file, 512, 0.7);
      const path = `${userId}/avatar-${Date.now()}.jpg`;
      const up = await supabase.storage.from("avatars").upload(path, compressed, { upsert: true, contentType: "image/jpeg" });
      if (up.error) throw up.error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Avatar actualizado"); qc.invalidateQueries({ queryKey: ["profile-full"] }); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Cuenta</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">Mi perfil</h1>
      </div>

      <section className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-5 shadow-elevated">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-primary/40 bg-surface-elevated">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-2xl font-bold text-primary">{(profile?.full_name ?? "?").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-gradient-gold text-primary-foreground shadow-gold">
            <Upload className="h-3 w-3" />
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadAvatar.mutate(e.target.files[0])} />
          </label>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold text-foreground">{profile?.full_name ?? "—"}</p>
          <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
          <div className="mt-2"><BeltBadge belt={student?.belt_rank as "white"} /></div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5 shadow-elevated">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Datos personales</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre completo</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          {student?.branches?.name && (
            <p className="text-sm text-muted-foreground">
              Sucursal: <span className="font-semibold text-foreground">{student.branches.name}</span>
            </p>
          )}
          {student?.join_date && (
            <p className="text-sm text-muted-foreground">
              Miembro desde: <span className="font-semibold text-foreground">{format(parseISO(student.join_date), "MMM yyyy", { locale: es })}</span>
            </p>
          )}
          <button onClick={() => save.mutate()} disabled={save.isPending || name === profile?.full_name}
            className="w-full rounded-xl bg-gradient-gold py-2.5 text-sm font-bold text-primary-foreground shadow-gold disabled:opacity-50">
            Guardar cambios
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Certificados</h2>
        {!certs || certs.length === 0 ? (
          <EmptyState icon={Award} title="Sin certificados aún" description="Tus certificados aparecerán aquí." />
        ) : (
          <ul className="space-y-3">
            {certs.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-elevated">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground"><FileText className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {c.type === "student_of_month" ? "Estudiante del mes" : "Promoción de cinturón"}
                  </p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(c.issue_date), "d 'de' MMMM, yyyy", { locale: es })}</p>
                </div>
                {c.pdf_url && (
                  <a href={c.pdf_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-bold text-primary">
                    <Download className="h-3 w-3" /> PDF
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <button onClick={signOut}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 py-3 text-sm font-bold text-destructive">
        <LogOut className="h-4 w-4" /> Cerrar sesión
      </button>
    </div>
  );
}
