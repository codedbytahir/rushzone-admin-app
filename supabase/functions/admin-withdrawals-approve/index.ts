import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
import { writeAuditLog } from "../_shared/audit.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== "POST") return withCors(req, jsonError("VALIDATION_ERROR" as any, "POST required", 405));
  try {
    const { user } = await requireAdmin(req, "withdrawal.review");
    const admin = createAdminClient();
    const body = await req.json();
    const id = body.id ?? body.withdrawal_id;
    if (!id) return withCors(req, jsonError("VALIDATION_ERROR" as any, "id required", 400));
    const { data: wd } = await admin.schema("app").from("withdrawal_requests").select("*").eq("id", id).maybeSingle();
    if (!wd) return withCors(req, jsonError("NOT_FOUND" as any, "Not found", 404));
    if (wd.status !== "pending_review") return withCors(req, jsonError("CONFLICT" as any, "Not pending_review", 409));
    await admin.schema("app").from("withdrawal_requests").update({ status: "approved", reviewed_by: user.id, updated_at: new Date().toISOString() }).eq("id", id);
    await writeAuditLog({ actorId: user.id, action: "withdrawal.approve", entityType: "withdrawal", entityId: id });
    return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
