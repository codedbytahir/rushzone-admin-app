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
    const payoutRef = body.payout_ref ?? body.payoutRef;
    const secondReviewer = body.second_reviewer ?? null;
    if (!id || !payoutRef) return withCors(req, jsonError("VALIDATION_ERROR" as any, "id and payout_ref required", 400));
    const { data: wd } = await admin.schema("app").from("withdrawal_requests").select("*").eq("id", id).maybeSingle();
    if (!wd) return withCors(req, jsonError("NOT_FOUND" as any, "Not found", 404));
    if (!["pending_review","approved"].includes(wd.status)) return withCors(req, jsonError("CONFLICT" as any, "Invalid status", 409));
    const { data: thresholdRow } = await admin.schema("app").from("settings").select("value").eq("key", "dual_approval_threshold").maybeSingle();
    const threshold = thresholdRow ? parseInt(JSON.stringify(thresholdRow.value).replace(/[^0-9]/g, "")) : 10000;
    if (wd.amount_coins >= threshold) {
      if (!secondReviewer && wd.reviewed_by !== userData.user.id) {
        if (!body.second_reviewer_confirmed) return withCors(req, jsonError("VALIDATION_ERROR" as any, "Second reviewer required above threshold", 400));
      }
      if (wd.reviewed_by === userData.user.id && !secondReviewer) return withCors(req, jsonError("FORBIDDEN" as any, "Creator cannot be payer above threshold", 403));
    }
    const key = `withdraw_paid:${id}`;
    const { error: finErr } = await admin.rpc("wallet_finalize_held", { p_profile_id: wd.profile_id, p_amount: wd.amount_coins, p_type: "withdrawal_paid", p_reference_type: "withdrawal", p_reference_id: id, p_idempotency_key: key, p_created_by: userData.user.id } as any);
    if (finErr) return withCors(req, jsonError("INTERNAL" as any, finErr.message, 500));
    await admin.schema("app").from("withdrawal_requests").update({ status: "paid", payout_ref: payoutRef, reviewed_by: wd.reviewed_by ?? userData.user.id, second_reviewer: secondReviewer ?? userData.user.id, updated_at: new Date().toISOString() }).eq("id", id);
    await admin.schema("app").from("notifications").insert({ profile_id: wd.profile_id, type: "withdrawal_update", title: "Withdrawal Paid", body: `${wd.amount_coins} coins paid. Ref: ${payoutRef}`, data: { withdrawal_id: id }, deep_link: `rushzone://wallet` } as any);
    await writeAuditLog({ actorId: userData.user.id, action: "withdrawal.paid", entityType: "withdrawal", entityId: id, after: { payout_ref: payoutRef, amount: wd.amount_coins } });
    return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
