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
    const { data: caller } = await admin.schema("admin").from("assignments").select("id, is_owner, status").eq("user_id", user.id).maybeSingle();
    if (!caller?.is_owner || caller.status !== "active") return withCors(req, jsonError("FORBIDDEN" as any, "Owner only", 403));
    const body = await req.json();
    const sessionId = body.session_id;
    const assignmentId = body.assignment_id;
    if (sessionId) {
      await admin.schema("admin").from("sessions").update({ revoked_at: new Date().toISOString() }).eq("id", sessionId);
      await writeAuditLog({ actorId: user.id, action: "admin_session_revoked", entityType: "session", entityId: sessionId });
    } else if (assignmentId) {
      await admin.schema("admin").from("sessions").update({ revoked_at: new Date().toISOString() }).eq("assignment_id", assignmentId);
      await writeAuditLog({ actorId: user.id, action: "admin_session_revoked", entityType: "assignment", entityId: assignmentId });
    } else return withCors(req, jsonError("VALIDATION_ERROR" as any, "session_id or assignment_id required", 400));
    return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
