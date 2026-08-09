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
    const resultId = body.result_id ?? body.id;
    const reason = body.reason;
    if (!resultId || !reason) return withCors(req, jsonError("VALIDATION_ERROR" as any, "result_id and reason required", 400));
    const kills = body.kills !== undefined ? parseInt(body.kills) : undefined;
    const placement = body.placement !== undefined ? parseInt(body.placement) : undefined;
    const points = body.points !== undefined ? parseInt(body.points) : undefined;
    const prize = body.prize_coins !== undefined ? parseInt(body.prize_coins) : undefined;
    const { data: existing } = await admin.schema("app").from("match_results").select("*").eq("id", resultId).maybeSingle();
    if (!existing) return withCors(req, jsonError("NOT_FOUND" as any, "Result not found", 404));
    const newKills = kills ?? existing.kills;
    const newPlacement = placement ?? existing.placement;
    const newPoints = points ?? existing.points;
    const newPrize = prize ?? existing.prize_coins;
    const { data: newId, error } = await admin.rpc("correct_result", { p_result_id: resultId, p_new_kills: newKills, p_new_placement: newPlacement, p_new_points: newPoints, p_new_prize: newPrize, p_corrected_by: userData.user.id, p_reason: reason } as any);
    if (error) return withCors(req, jsonError("INTERNAL" as any, error.message, 500));
    await writeAuditLog({ actorId: userData.user.id, action: "result.correct", entityType: "match_result", entityId: resultId, reason, before: existing, after: { kills: newKills, placement: newPlacement, points: newPoints, prize_coins: newPrize } });
    return withCors(req, new Response(JSON.stringify({ ok: true, corrected_id: newId }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
