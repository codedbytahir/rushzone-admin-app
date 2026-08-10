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
    const { user } = await requireAdmin(req, "tournament.cancel");
    const admin = createAdminClient();
    const body = await req.json();
    const id = body.id ?? body.tournament_id;
    const reason = body.reason;
    const outcome = body.outcome ?? "refund";
    if (!id || !reason) return withCors(req, jsonError("VALIDATION_ERROR" as any, "id and reason required", 400));
    const { data: tour } = await admin.schema("app").from("tournaments").select("id, status").eq("id", id).maybeSingle();
    if (!tour) return withCors(req, jsonError("NOT_FOUND" as any, "Tournament not found", 404));
    await admin.schema("app").from("tournaments").update({ status: "cancelled", cancelled_reason: reason }).eq("id", id);
    if (outcome === "refund") {
      const { data: regs } = await admin.schema("app").from("registrations").select("id, profile_id, fee_snapshot").eq("tournament_id", id).eq("status", "confirmed");
      for (const r of (regs ?? [])) {
        if (r.fee_snapshot > 0) {
          await admin.rpc("wallet_credit", { p_profile_id: r.profile_id, p_amount: r.fee_snapshot, p_type: "tournament_refund", p_reference_type: "tournament", p_reference_id: id, p_idempotency_key: `refund:${id}:${r.id}` } as any);
        }
        await admin.schema("app").from("registrations").update({ status: "refunded" }).eq("id", r.id);
      }
    }
    await writeAuditLog({ actorId: user.id, action: "tournament.cancel", entityType: "tournament", entityId: id, reason, after: { outcome } });
    return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
