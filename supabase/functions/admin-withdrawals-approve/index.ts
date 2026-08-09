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
    const body = await req.json();
    const id = body.id ?? body.withdrawal_id;
    if (!id) return withCors(req, jsonError("VALIDATION_ERROR" as any, "id required", 400));
    const { data: wd } = await admin.schema("app").from("withdrawal_requests").select("*").eq("id", id).maybeSingle();
    if (!wd) return withCors(req, jsonError("NOT_FOUND" as any, "Not found", 404));
    if (wd.status !== "pending_review") return withCors(req, jsonError("CONFLICT" as any, "Not pending_review", 409));
    await admin.schema("app").from("withdrawal_requests").update({ status: "approved", reviewed_by: userData.user.id, updated_at: new Date().toISOString() }).eq("id", id);
    await writeAuditLog({ actorId: userData.user.id, action: "withdrawal.approve", entityType: "withdrawal", entityId: id });
    return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
