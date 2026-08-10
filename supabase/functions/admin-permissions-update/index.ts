import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { requireOwner } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
import { writeAuditLog } from "../_shared/audit.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== "POST") return withCors(req, jsonError("VALIDATION_ERROR" as any, "POST required", 405));
  try {
    const { user } = await requireOwner(req);
    const admin = createAdminClient();
    const body = await req.json().catch(() => ({}));
    const assignmentId = body.assignment_id ?? body.id;
    if (!assignmentId) return withCors(req, jsonError("VALIDATION_ERROR" as any, "assignment_id required", 400));
    const { data: target } = await admin.schema("admin").from("assignments").select("id, is_owner, status").eq("id", assignmentId).maybeSingle();
    if (!target) return withCors(req, jsonError("NOT_FOUND" as any, "Assignment not found", 404));
    if (target.is_owner) return withCors(req, jsonError("FORBIDDEN" as any, "Owner permissions cannot be edited", 403));

    const keys: string[] = Array.isArray(body.permission_keys) ? body.permission_keys.map(String) : [];
    const { data: perms } = await admin.schema("admin").from("permissions").select("id, key").in("key", keys);
    const effectiveIds: string[] = (perms ?? []).map((p: any) => p.id);

    // Per-assignment custom role: each admin gets its own role key so toggling
    // one admin's permissions NEVER affects another admin's set.
    const roleKey = "custom_permissions_" + assignmentId;
    const { data: existingRole } = await admin.schema("admin").from("roles").select("id").eq("key", roleKey).maybeSingle();
    let roleId = existingRole?.id ?? null;
    if (!roleId) {
      const { data: inserted, error: roleErr } = await admin.schema("admin").from("roles").insert({ key: roleKey, name: "Custom Permissions", is_owner: false }).select("id").single();
      if (roleErr) return withCors(req, jsonError("INTERNAL" as any, roleErr.message, 500));
      roleId = inserted.id;
    }
    // Rewrite only THIS assignment's role permissions.
    await admin.schema("admin").from("role_permissions").delete().eq("role_id", roleId);
    if (effectiveIds.length) {
      const rows = effectiveIds.map((permissionId: string) => ({ role_id: roleId, permission_id: permissionId }));
      const { error: rpErr } = await admin.schema("admin").from("role_permissions").insert(rows);
      if (rpErr) return withCors(req, jsonError("INTERNAL" as any, rpErr.message, 500));
    }
    // Attach the custom role (keep named roles too).
    await admin.schema("admin").from("assignment_roles").upsert({ assignment_id: assignmentId, role_id: roleId }, { onConflict: "assignment_id,role_id" });

    await writeAuditLog({ actorId: user.id, action: "role_permission_changed", entityType: "assignment", entityId: assignmentId, before: null, after: { mode: "custom", permission_keys: keys } });
    return withCors(req, new Response(JSON.stringify({ ok: true, permission_keys: keys }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
