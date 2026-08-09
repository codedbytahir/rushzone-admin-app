import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
import { writeAuditLog } from "../_shared/audit.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== "POST" && req.method !== "PATCH") return withCors(req, jsonError("VALIDATION_ERROR" as any, "POST required", 405));
  try {
    const auth = req.headers.get("authorization") ?? "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return withCors(req, jsonError("UNAUTHORIZED" as any, "Missing token", 401));
    const jwt = m[1];
    const admin = createAdminClient();
    const { data: userData } = await admin.auth.getUser(jwt);
    if (!userData?.user) return withCors(req, jsonError("UNAUTHORIZED" as any, "Invalid token", 401));
    const body = await req.json();
    const id = body.id ?? body.tournament_id;
    if (!id) return withCors(req, jsonError("VALIDATION_ERROR" as any, "id required", 400));
    const { data: existing } = await admin.schema("app").from("tournaments").select("*").eq("id", id).maybeSingle();
    if (!existing) return withCors(req, jsonError("NOT_FOUND" as any, "Tournament not found", 404));
    const { data: regs } = await admin.schema("app").from("registrations").select("id").eq("tournament_id", id).eq("status", "confirmed").limit(1);
    const hasRegs = (regs ?? []).length > 0;
    if (hasRegs && body.entry_fee !== undefined && body.entry_fee !== existing.entry_fee) {
      if (!body.reason) return withCors(req, jsonError("VALIDATION_ERROR" as any, "reason required for fee change after registrations", 400));
    }
    const allowed = ["title","description","internal_notes","mode","map","rounds","capacity","entry_fee","prize_pool","prize_distribution","score_rules","rules_text","reg_open_at","reg_close_at","match_start_at","room_release_at","result_expected_at","free_slot_enabled","free_slot_trigger","status"];
    const update: any = {};
    for (const k of allowed) if (body[k] !== undefined) update[k] = body[k];
    if (Object.keys(update).length === 0) return withCors(req, jsonError("VALIDATION_ERROR" as any, "No fields to update", 400));
    const { error } = await admin.schema("app").from("tournaments").update(update).eq("id", id);
    if (error) return withCors(req, jsonError("INTERNAL" as any, error.message, 500));
    await writeAuditLog({ actorId: userData.user.id, action: "tournament.update", entityType: "tournament", entityId: id, before: existing, after: update, reason: body.reason ?? null });
    return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
