import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Plus, Trash2, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/branches")({
  component: AdminBranches,
});

function AdminBranches() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-branches"],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("*").order("name");
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !slug.trim()) throw new Error("Completa nombre y slug");
      const { error } = await supabase.from("branches").insert({ name: name.trim(), slug: slug.trim().toLowerCase() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sucursal creada");
      setName("");
      setSlug("");
      qc.invalidateQueries({ queryKey: ["admin-branches"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("branches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sucursal eliminada");
      qc.invalidateQueries({ queryKey: ["admin-branches"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Red</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">Sucursales</h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
        className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-elevated"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nombre</span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
              }}
              className="input-base"
              placeholder="Global Jiu-Jitsu Las Condes"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Slug</span>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} className="input-base" placeholder="las-condes" />
          </label>
        </div>
        <button
          type="submit"
          disabled={create.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-gold py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-gold disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> Crear sucursal
        </button>
      </form>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={Building2} title="Sin sucursales" description="Crea la primera con el formulario." />
      ) : (
        <ul className="space-y-2.5">
          {data!.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-elevated">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{b.name}</p>
                  <p className="text-xs text-muted-foreground">/{b.slug}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm(`¿Eliminar "${b.name}"?`)) del.mutate(b.id);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10"
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
