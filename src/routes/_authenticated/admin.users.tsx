import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { adminCreateUser } from "@/lib/admin-users.functions";
import { Loader2, Search, Shield, UserPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { BeltBadge } from "@/components/BeltBadge";

type AppRole = "admin" | "instructor" | "student";
type Belt = "white" | "blue" | "purple" | "brown" | "black";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const createUserFn = useServerFn(adminCreateUser);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: async () => {
      const [profiles, roles, students, branches] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, avatar_url").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("students").select("id, belt_rank, branch_id, is_active"),
        supabase.from("branches").select("id, name"),
      ]);
      const roleMap = new Map((roles.data ?? []).map((r) => [r.user_id, r.role as AppRole]));
      const studentMap = new Map((students.data ?? []).map((s) => [s.id, s]));
      const branchMap = new Map((branches.data ?? []).map((b) => [b.id, b.name]));
      return {
        users: (profiles.data ?? []).map((p) => ({
          ...p,
          role: roleMap.get(p.id) ?? "student",
          belt: studentMap.get(p.id)?.belt_rank ?? null,
          branchName: studentMap.get(p.id)?.branch_id ? branchMap.get(studentMap.get(p.id)!.branch_id!) : null,
        })),
        branches: branches.data ?? [],
      };
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
      if (role === "instructor") {
        await supabase.from("instructors").upsert({ id: userId, belt_rank: "black", is_active: true });
      }
    },
    onSuccess: () => {
      toast.success("Rol actualizado");
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateBelt = useMutation({
    mutationFn: async ({ userId, belt }: { userId: string; belt: Belt }) => {
      const { error } = await supabase.from("students").update({ belt_rank: belt }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Faixa actualizada");
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data?.users ?? [];
    return (data?.users ?? []).filter(
      (u) => u.full_name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term),
    );
  }, [data, q]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Gestión</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-foreground">Usuarios</h1>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-gradient-gold px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-gold"
        >
          <UserPlus className="h-4 w-4" /> Nuevo
        </button>
      </div>

      {showCreate && (
        <CreateUserForm
          branches={data?.branches ?? []}
          onCreated={() => {
            setShowCreate(false);
            qc.invalidateQueries({ queryKey: ["admin-all-users"] });
          }}
          createFn={createUserFn}
        />
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o email…"
          className="input-base pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((u) => (
            <li key={u.id} className="rounded-2xl border border-border bg-surface p-4 shadow-elevated">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{u.full_name ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {u.belt && <BeltBadge belt={u.belt} />}
                    {u.branchName && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{u.branchName}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    <select
                      value={u.role}
                      onChange={(e) => setRole.mutate({ userId: u.id, role: e.target.value as AppRole })}
                      className="rounded-lg border border-border bg-surface-elevated px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground"
                    >
                      <option value="student">Atleta</option>
                      <option value="instructor">Profesor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {u.role === "student" && (
                    <select
                      value={u.belt ?? "white"}
                      onChange={(e) => updateBelt.mutate({ userId: u.id, belt: e.target.value as Belt })}
                      className="rounded-lg border border-border bg-surface-elevated px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground"
                    >
                      <option value="white">Branca</option>
                      <option value="blue">Azul</option>
                      <option value="purple">Roxa</option>
                      <option value="brown">Marrom</option>
                      <option value="black">Preta</option>
                    </select>
                  )}
                </div>
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin resultados.</p>
          )}
        </ul>
      )}
    </div>
  );
}

function CreateUserForm({
  branches,
  onCreated,
  createFn,
}: {
  branches: { id: string; name: string }[];
  onCreated: () => void;
  createFn: typeof adminCreateUser;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole>("student");
  const [belt, setBelt] = useState<Belt>("white");
  const [branchId, setBranchId] = useState<string>("");
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      await createFn({
        data: {
          email,
          password,
          fullName,
          role,
          beltRank: role === "admin" ? undefined : belt,
          branchId: branchId || null,
        },
      });
      toast.success("Cuenta creada");
      setEmail(""); setPassword(""); setFullName(""); setRole("student"); setBelt("white"); setBranchId("");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-primary/30 bg-surface p-4 shadow-elevated">
      <p className="text-xs font-bold uppercase tracking-wider text-primary">Crear cuenta</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Nombre completo" className="input-base" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="Correo" className="input-base" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} type="password" placeholder="Contraseña (mín. 8)" className="input-base" />
        <select value={role} onChange={(e) => setRole(e.target.value as AppRole)} className="input-base">
          <option value="student">Atleta</option>
          <option value="instructor">Profesor</option>
          <option value="admin">Administrador</option>
        </select>
        {role !== "admin" && (
          <select value={belt} onChange={(e) => setBelt(e.target.value as Belt)} className="input-base">
            <option value="white">Faixa Branca</option>
            <option value="blue">Faixa Azul</option>
            <option value="purple">Faixa Roxa</option>
            <option value="brown">Faixa Marrom</option>
            <option value="black">Faixa Preta</option>
          </select>
        )}
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="input-base">
          <option value="">Sin sucursal</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-gold py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-gold disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Crear usuario
      </button>
    </form>
  );
}
