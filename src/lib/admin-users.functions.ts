import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const belts = ["white", "blue", "purple", "brown", "black"] as const;
const roles = ["admin", "instructor", "student"] as const;

const CreateInput = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  fullName: z.string().min(1).max(120),
  role: z.enum(roles),
  beltRank: z.enum(belts).optional(),
  branchId: z.string().uuid().nullable().optional(),
  // Student-specific historical data
  joinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  initialClassesAttended: z.number().int().min(0).max(100000).optional(),
  initialTrainingHours: z.number().min(0).max(1000000).optional(),
  // Optional history when creating instructor accounts
  totalClassesTaught: z.number().int().min(0).max(100000).optional(),
  totalHoursTaught: z.number().min(0).max(1000000).optional(),
  yearsOfExperience: z.number().int().min(0).max(100).optional(),
  championshipsWon: z.array(z.string().min(1).max(160)).max(50).optional(),
  biography: z.string().max(2000).optional(),
});

async function assertCallerIsAdmin(supabase: { from: typeof supabaseAdmin.from }, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Solo administradores pueden ejecutar esta acción.");
}

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CreateInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertCallerIsAdmin(context.supabase, context.userId);

    const meta: Record<string, string> = {
      full_name: data.fullName,
      role: data.role,
    };
    if (data.role === "student") meta.belt_rank = data.beltRank ?? "white";
    if (data.role === "instructor") meta.belt_rank = data.beltRank ?? "black";
    if (data.branchId) meta.branch_id = data.branchId;

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: meta,
    });
    if (error) throw new Error(error.message);
    const newId = created.user?.id;
    if (!newId) throw new Error("No se pudo crear la cuenta.");

    // Patch instructor history if provided (handle_new_user already inserted the row).
    if (data.role === "instructor") {
      const patch: {
        total_classes_taught?: number;
        total_hours_taught?: number;
        years_of_experience?: number;
        championships_won?: string[];
        biography?: string;
      } = {};
      if (data.totalClassesTaught !== undefined) patch.total_classes_taught = data.totalClassesTaught;
      if (data.totalHoursTaught !== undefined) patch.total_hours_taught = data.totalHoursTaught;
      if (data.yearsOfExperience !== undefined) patch.years_of_experience = data.yearsOfExperience;
      if (data.championshipsWon && data.championshipsWon.length > 0) patch.championships_won = data.championshipsWon;
      if (data.biography) patch.biography = data.biography;
      if (Object.keys(patch).length > 0) {
        const { error: uErr } = await supabaseAdmin.from("instructors").update(patch).eq("id", newId);
        if (uErr) throw new Error(uErr.message);
      }
    }

    // Patch student initial history if provided
    if (data.role === "student") {
      const patch: { join_date?: string; total_classes_attended?: number; total_training_hours?: number } = {};
      if (data.joinDate) patch.join_date = data.joinDate;
      if (data.initialClassesAttended !== undefined) patch.total_classes_attended = data.initialClassesAttended;
      if (data.initialTrainingHours !== undefined) patch.total_training_hours = data.initialTrainingHours;
      if (Object.keys(patch).length > 0) {
        const { error: sErr } = await supabaseAdmin.from("students").update(patch).eq("id", newId);
        if (sErr) throw new Error(sErr.message);
      }
    }

    return { id: newId };
  });

const DeleteInput = z.object({ userId: z.string().uuid() });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => DeleteInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertCallerIsAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) {
      throw new Error("No puedes eliminar tu propia cuenta.");
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
