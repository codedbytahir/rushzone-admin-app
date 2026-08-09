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
    const id = body.id ?? body.referral_id;
    const decision = body.decision;
    if (!id || !["approve","hold","reject"].includes(decision)) return withCors(req, jsonError("VALIDATION_ERROR" as any, "id and decision approve/hold/reject required", 400));
    const { data: ref } = await admin.schema("app").from("referrals").select("*").eq("id", id).maybeSingle();
    if (!ref) return withCors(req, jsonError("NOT_FOUND" as any, "Referral not found", 404));
    let newStatus = decision === "approve" ? "rewarded" : decision === "hold" ? "held" : "rejected";
    await admin.schema("app").from("referrals").update({ reward_status: newStatus }).eq("id", id);
    if (decision === "approve") {
      const { data: cfg } = await admin.schema("app").from("settings").select("value").eq("key", "referral_config").maybeSingle();
      const reward = cfg?.value ? (cfg.value as any).reward_referrer ?? 0 : 0;
      if (reward > 0) {
        const key = `referral:${id}:${ref.referrer_id}`;
        await admin.rpc("wallet_credit", { p_profile_id: ref.referrer_id, p_amount: reward, p_type: "referral_reward", p_reference_type: "referral", p_reference_id: id, p_idempotency_key: key } as any);
      }
    }
    await writeAuditLog({ actorId: userData.user.id, action: `referral.${decision}`, entityType: "referral", entityId: id });
    return withCors(req, new Response(JSON.stringify({ ok: true, status: newStatus }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
