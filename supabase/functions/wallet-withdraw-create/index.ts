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
    const amount = parseInt(body.amount_coins ?? body.amount ?? 0);
    const method = body.method;
    const account = body.account ?? body.account_snapshot;
    if (!amount || !method || !account) return withCors(req, jsonError("VALIDATION_ERROR" as any, "amount, method, account required", 400));
    if (amount <= 0) return withCors(req, jsonError("VALIDATION_ERROR" as any, "amount must be >0", 400));
    const key = req.headers.get("idempotency-key") ?? req.headers.get("Idempotency-Key") ?? `wd:${userData.user.id}:${Date.now()}`;
    const { data: existing } = await admin.schema("app").from("withdrawal_requests").select("id").eq("idempotency_key", key).maybeSingle();
    if (existing) return withCors(req, new Response(JSON.stringify({ ok: true, id: existing.id, duplicate: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    const { data, error } = await admin.rpc("create_withdrawal_request", { p_profile_id: userData.user.id, p_method: method, p_account_snapshot: account, p_amount: amount, p_idempotency_key: key } as any);
    if (error) return withCors(req, jsonError("INTERNAL" as any, error.message, 400));
    return withCors(req, new Response(JSON.stringify({ ok: true, id: data }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
