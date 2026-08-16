import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  full_name: z.string().trim().min(1).max(100),
  role: z.enum(["admin", "user"]),
});

const passwordSchema = z.object({
  user_id: z.string().uuid(),
  password: z.string().min(6).max(72),
});

const updateSchema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().trim().min(1).max(100),
  role: z.enum(["admin", "user"]),
  email: z.string().trim().email().max(255).optional(),
  password: z.string().min(6).max(72).optional().or(z.literal("")),
});

const deleteSchema = z.object({ user_id: z.string().uuid() });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", data.user_id)
      .maybeSingle();
    const { data: prevRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id);

    const profileUpdate: { full_name: string; email?: string } = { full_name: data.full_name };
    if (data.email) profileUpdate.email = data.email;

    const { error } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.role });

    const authUpdate: { user_metadata: { full_name: string }; email?: string; password?: string } = {
      user_metadata: { full_name: data.full_name },
    };
    if (data.email) authUpdate.email = data.email;
    if (data.password) authUpdate.password = data.password;
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, authUpdate);
    if (authError) throw new Error(authError.message);

    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "user_updated",
      entity_type: "profile",
      entity_id: data.user_id,
      old_data: {
        full_name: before?.full_name ?? null,
        email: before?.email ?? null,
        role: prevRoles?.[0]?.role ?? "user",
      },
      new_data: {
        full_name: data.full_name,
        email: data.email ?? before?.email ?? null,
        role: data.role,
        password_changed: !!data.password,
      },
    });

    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deleteSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");
    if (data.user_id === context.userId) throw new Error("لا يمكنك حذف حسابك الحالي");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count } = await supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", data.user_id);

    if ((count ?? 0) > 0) {
      const { error: purgeError } = await supabaseAdmin
        .from("orders")
        .delete()
        .eq("user_id", data.user_id);
      if (purgeError) throw new Error(purgeError.message);
    }

    const { data: before } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", data.user_id)
      .maybeSingle();

    // clear every remaining reference so the auth deletion is not blocked
    await supabaseAdmin.from("orders").update({ deleted_by: null }).eq("deleted_by", data.user_id);
    await supabaseAdmin
      .from("accounting_periods")
      .update({ archived_by: null })
      .eq("archived_by", data.user_id);
    await supabaseAdmin
      .from("commission_settlements")
      .update({ paid_by: null })
      .eq("paid_by", data.user_id);
    await supabaseAdmin.from("audit_logs").update({ user_id: null }).eq("user_id", data.user_id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    await supabaseAdmin.from("profiles").delete().eq("id", data.user_id);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) {
      const message =
        error.message || (error as { code?: string }).code || "تعذّر حذف الحساب من نظام الدخول";
      throw new Error(message);
    }

    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "user_deleted",
      entity_type: "profile",
      entity_id: data.user_id,
      old_data: { full_name: before?.full_name ?? null, email: before?.email ?? null },
    });

    return { ok: true };
  });

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "create failed");

    await supabaseAdmin.from("profiles").update({ full_name: data.full_name }).eq("id", created.user.id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "user_created",
      entity_type: "profile",
      entity_id: created.user.id,
      new_data: { email: data.email, role: data.role },
    });

    return { id: created.user.id };
  });

export const adminSetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => passwordSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "password_changed",
      entity_type: "profile",
      entity_id: data.user_id,
    });

    return { ok: true };
  });
