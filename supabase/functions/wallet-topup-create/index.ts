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
    const method = body.method;
    const amount = parseInt(body.amount_coins ?? body.amount ?? 0);
    const reference = body.reference;
    if (!method || !amount || !reference) return withCors(req, jsonError("VALIDATION_ERROR" as any, "method, amount_coins, reference required", 400));
    if (amount <= 0) return withCors(req, jsonError("VALIDATION_ERROR" as any, "amount must be >0", 400));
    const idempotency = req.headers.get("idempotency-key") ?? req.headers.get("Idempotency-Key") ?? crypto.randomUUID();
    const { data: existing } = await admin.schema("app").from("topup_requests").select("id").eq("idempotency_key", idempotency).maybeSingle();
    if (existing) return withCors(req, new Response(JSON.stringify({ ok: true, id: existing.id, duplicate: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    const { data: inserted, error } = await admin.schema("app").from("topup_requests").insert({ profile_id: userData.user.id, method, amount_coins: amount, reference, status: "pending", idempotency_key: idempotency, risk_flags: [] }).select("id").single();
    if (error) return withCors(req, jsonError("INTERNAL" as any, error.message, 500));
    return withCors(req, new Response(JSON.stringify({ ok: true, id: inserted.id }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
