import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const belts = ["white", "blue", "purple", "brown", "black"] as const;
const roles = ["admin", "instructor", "student"] as const;

const Input = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  fullName: z.string().min(1).max(120),
  role: z.enum(roles),
  beltRank: z.enum(belts).optional(),
  branchId: z.string().uuid().nullable().optional(),
});

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    // Verify caller is admin
    const { data: roleRow, error: rErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!roleRow) throw new Error("Solo administradores pueden crear cuentas.");

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
    return { id: created.user?.id };
  });
