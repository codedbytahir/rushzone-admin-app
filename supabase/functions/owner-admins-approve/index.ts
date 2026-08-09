import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
import { writeAuditLog } from "../_shared/audit.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== "POST") return withCors(req, jsonError("VALIDATION_ERROR" as any, "POST required", 405));
  try {
    const auth = req.headers.get("authorization") ?? "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return withCors(req, jsonError("UNAUTHORIZED" as any, "Missing token", 401));
    const jwt = m[1];
    const admin = createAdminClient();
    const { data: userData } = await admin.auth.getUser(jwt);
    if (!userData?.user) return withCors(req, jsonError("UNAUTHORIZED" as any, "Invalid token", 401));
    const { data: caller } = await admin.schema("admin").from("assignments").select("id, is_owner, status").eq("user_id", userData.user.id).maybeSingle();
    if (!caller?.is_owner || caller.status !== "active") return withCors(req, jsonError("FORBIDDEN" as any, "Owner only", 403));
    const body = await req.json();
    const assignmentId = body.assignment_id;
    const roleKeys: string[] = body.role_keys ?? body.roles ?? [];
    if (!assignmentId) return withCors(req, jsonError("VALIDATION_ERROR" as any, "assignment_id required", 400));
    const { data: target } = await admin.schema("admin").from("assignments").select("id, status").eq("id", assignmentId).maybeSingle();
    if (!target) return withCors(req, jsonError("NOT_FOUND" as any, "Assignment not found", 404));
    await admin.schema("admin").from("assignments").update({ status: "active" }).eq("id", assignmentId);
    if (roleKeys.length) {
      const { data: roles } = await admin.schema("admin").from("roles").select("id, key").in("key", roleKeys);
      if (roles?.length) {
        await admin.schema("admin").from("assignment_roles").delete().eq("assignment_id", assignmentId);
        const rows = roles.map((r: any)=> ({ assignment_id: assignmentId, role_id: r.id }));
        await admin.schema("admin").from("assignment_roles").insert(rows);
      }
    }
    await writeAuditLog({ actorId: userData.user.id, action: "admin_approved", entityType: "assignment", entityId: assignmentId, before: target, after: { status: "active", roles: roleKeys } });
    return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
