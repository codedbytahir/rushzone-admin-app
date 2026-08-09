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
    const campaignId = body.campaign_id;
    if (!campaignId) return withCors(req, jsonError("VALIDATION_ERROR" as any, "campaign_id required", 400));
    const key = req.headers.get("idempotency-key") ?? req.headers.get("Idempotency-Key") ?? crypto.randomUUID();
    const { data, error } = await admin.rpc("reward_paid_attempt", { p_campaign_id: campaignId, p_profile_id: userData.user.id, p_idempotency_key: key } as any);
    if (error) return withCors(req, jsonError("CONFLICT" as any, error.message, 400));
    const { data: attempt } = await admin.schema("app").from("reward_attempts").select("id, coins_won, item_id").eq("id", data).maybeSingle();
    return withCors(req, new Response(JSON.stringify({ ok: true, attempt }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
