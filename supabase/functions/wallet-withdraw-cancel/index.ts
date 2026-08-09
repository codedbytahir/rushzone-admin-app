import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
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
    if (!wd) return withCors(req, jsonError("NOT_FOUND" as any, "Withdrawal not found", 404));
    if (wd.profile_id !== userData.user.id) return withCors(req, jsonError("FORBIDDEN" as any, "Not yours", 403));
    if (!["pending_review","approved"].includes(wd.status)) return withCors(req, jsonError("CONFLICT" as any, "Cannot cancel current status", 409));
    const key = `withdraw_cancel:${id}`;
    await admin.rpc("wallet_release", { p_profile_id: wd.profile_id, p_amount: wd.amount_coins, p_type: "withdrawal_returned", p_reference_type: "withdrawal", p_reference_id: id, p_idempotency_key: key } as any);
    await admin.schema("app").from("withdrawal_requests").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id);
    return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
