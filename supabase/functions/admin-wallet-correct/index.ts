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
    const { data: caller } = await admin.schema("admin").from("assignments").select("is_owner, status").eq("user_id", userData.user.id).maybeSingle();
    if (!caller?.is_owner) return withCors(req, jsonError("FORBIDDEN" as any, "Owner only", 403));
    const body = await req.json();
    const profileId = body.profile_id;
    const amount = parseInt(body.amount ?? 0);
    const direction = body.direction;
    const reason = body.reason;
    if (!profileId || !amount || !direction || !reason) return withCors(req, jsonError("VALIDATION_ERROR" as any, "profile_id, amount, direction, reason required", 400));
    if (!["credit","debit"].includes(direction)) return withCors(req, jsonError("VALIDATION_ERROR" as any, "direction must be credit or debit", 400));
    const key = `correction:${profileId}:${Date.now()}:${crypto.randomUUID()}`;
    let newBal: any = null;
    if (direction === "credit") {
      const { data, error } = await admin.rpc("wallet_credit", { p_profile_id: profileId, p_amount: amount, p_type: "admin_correction", p_reference_type: "correction", p_reference_id: null, p_idempotency_key: key, p_created_by: userData.user.id, p_note: reason } as any);
      if (error) return withCors(req, jsonError("INTERNAL" as any, error.message, 500));
      newBal = data;
    } else {
      const { data, error } = await admin.rpc("wallet_debit", { p_profile_id: profileId, p_amount: amount, p_type: "admin_correction", p_reference_type: "correction", p_reference_id: null, p_idempotency_key: key, p_created_by: userData.user.id, p_note: reason } as any);
      if (error) return withCors(req, jsonError("INTERNAL" as any, error.message, 500));
      newBal = data;
    }
    await writeAuditLog({ actorId: userData.user.id, action: "wallet.correct", entityType: "profile", entityId: profileId, reason, after: { direction, amount, balance_after: newBal } });
    return withCors(req, new Response(JSON.stringify({ ok: true, balance_after: newBal }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
