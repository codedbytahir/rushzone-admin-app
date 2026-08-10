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
    const { user } = await requireAdmin(req, "result.publish");
    const admin = createAdminClient();
    const { data: caller } = await admin.schema("admin").from("assignments").select("id, status").eq("user_id", user.id).maybeSingle();
    if (!caller || caller.status !== "active") return withCors(req, jsonError("FORBIDDEN" as any, "Admin only", 403));
    const body = await req.json();
    const tournamentId = body.tournament_id;
    const rows: any[] = body.results ?? body.rows ?? [];
    if (!tournamentId || !Array.isArray(rows)) return withCors(req, jsonError("VALIDATION_ERROR" as any, "tournament_id and results array required", 400));
    for (const r of rows) {
      if (!r.profile_id) continue;
      const kills = Math.max(0, parseInt(r.kills ?? 0));
      const placement = r.placement ? parseInt(r.placement) : null;
      const points = parseInt(r.points ?? 0);
      const prize = parseInt(r.prize_coins ?? 0);
      const payload: any = { tournament_id: tournamentId, profile_id: r.profile_id, kills, placement, points, is_dq: !!r.is_dq, prize_coins: prize, status: "draft", notes: r.notes ?? null };
      const { data: existing } = await admin.schema("app").from("match_results").select("id").eq("tournament_id", tournamentId).eq("profile_id", r.profile_id).maybeSingle();
      if (existing) await admin.schema("app").from("match_results").update(payload).eq("id", existing.id);
      else await admin.schema("app").from("match_results").insert(payload);
    }
    await writeAuditLog({ actorId: user.id, action: "result.save_draft", entityType: "tournament", entityId: tournamentId, after: { count: rows.length } });
    return withCors(req, new Response(JSON.stringify({ ok: true, saved: rows.length }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
