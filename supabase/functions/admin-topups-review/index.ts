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
    const id = body.id ?? body.topup_id;
    const decision = body.decision ?? body.action;
    const reason = body.reason ?? body.reject_reason;
    if (!id || !decision) return withCors(req, jsonError("VALIDATION_ERROR" as any, "id and decision required", 400));
    if (!["approve","reject"].includes(decision)) return withCors(req, jsonError("VALIDATION_ERROR" as any, "decision must be approve or reject", 400));
    if (decision === "reject" && !reason) return withCors(req, jsonError("VALIDATION_ERROR" as any, "reason required for reject", 400));
    const { data: topup } = await admin.schema("app").from("topup_requests").select("*").eq("id", id).maybeSingle();
    if (!topup) return withCors(req, jsonError("NOT_FOUND" as any, "Topup not found", 404));
    if (topup.status !== "pending") return withCors(req, jsonError("CONFLICT" as any, "Not pending", 409));
    if (topup.profile_id === userData.user.id) return withCors(req, jsonError("FORBIDDEN" as any, "Cannot review own request", 403));
    const { data: dup } = await admin.schema("app").from("topup_requests").select("id").eq("reference", topup.reference).eq("status", "approved").limit(1);
    if (dup && dup.length > 0) {
      const override = body.override ?? false;
      if (!override) return withCors(req, jsonError("CONFLICT" as any, "Reference already approved, override required", 409));
    }
    if (decision === "approve") {
      const key = `topup_approved:${id}`;
      const { error: creditErr } = await admin.rpc("wallet_credit", { p_profile_id: topup.profile_id, p_amount: topup.amount_coins, p_type: "topup_approved", p_reference_type: "topup", p_reference_id: id, p_idempotency_key: key, p_created_by: userData.user.id } as any);
      if (creditErr) return withCors(req, jsonError("INTERNAL" as any, creditErr.message, 500));
      await admin.schema("app").from("topup_requests").update({ status: "approved", reviewed_by: userData.user.id, reviewed_at: new Date().toISOString() }).eq("id", id);
      await admin.schema("app").from("notifications").insert({ profile_id: topup.profile_id, type: "topup_update", title: "Top-up Approved", body: `${topup.amount_coins} coins credited.`, data: { topup_id: id }, deep_link: `rushzone://wallet` } as any);
      await writeAuditLog({ actorId: userData.user.id, action: "topup.approve", entityType: "topup", entityId: id, after: { amount: topup.amount_coins } });
    } else {
      await admin.schema("app").from("topup_requests").update({ status: "rejected", reviewed_by: userData.user.id, reviewed_at: new Date().toISOString(), reject_reason: reason }).eq("id", id);
      await admin.schema("app").from("notifications").insert({ profile_id: topup.profile_id, type: "topup_update", title: "Top-up Rejected", body: reason, data: { topup_id: id }, deep_link: `rushzone://wallet` } as any);
      await writeAuditLog({ actorId: userData.user.id, action: "topup.reject", entityType: "topup", entityId: id, reason });
    }
    return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
