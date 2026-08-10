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
    const body = await req.json();
    const assignmentId = body.assignment_id ?? body.id;
    if (!assignmentId) return withCors(req, jsonError("VALIDATION_ERROR" as any, "assignment_id required", 400));
    const { data: target } = await admin.schema("admin").from("assignments").select("id, status, is_owner").eq("id", assignmentId).maybeSingle();
    if (!target) return withCors(req, jsonError("NOT_FOUND" as any, "Assignment not found", 404));
    if (target.is_owner) return withCors(req, jsonError("FORBIDDEN" as any, "Cannot reject the Owner", 403));
    if (target.status !== "pending") return withCors(req, jsonError("VALIDATION_ERROR" as any, "Only pending assignments can be rejected", 400));
    await admin.schema("admin").from("assignments").update({ status: "rejected" }).eq("id", assignmentId);
    await writeAuditLog({ actorId: user.id, action: "admin_rejected", entityType: "assignment", entityId: assignmentId, before: target, after: { status: "rejected" } });
    return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
