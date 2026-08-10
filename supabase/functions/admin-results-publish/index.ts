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
    if (!tournamentId) return withCors(req, jsonError("VALIDATION_ERROR" as any, "tournament_id required", 400));
    const { data: drafts } = await admin.schema("app").from("match_results").select("id").eq("tournament_id", tournamentId).eq("status", "draft");
    if (!drafts || drafts.length === 0) return withCors(req, jsonError("VALIDATION_ERROR" as any, "No drafts to publish", 400));
    const { data: publishedCount, error } = await admin.rpc("publish_results", { p_tournament_id: tournamentId, p_published_by: user.id } as any);
    if (error) return withCors(req, jsonError("INTERNAL" as any, error.message, 500));
    const { data: results } = await admin.schema("app").from("match_results").select("profile_id, prize_coins").eq("tournament_id", tournamentId).eq("status", "published");
    for (const r of (results ?? [])) {
      if ((r.prize_coins ?? 0) > 0) await admin.schema("app").from("notifications").insert({ profile_id: r.profile_id, type: "prize_credited", title: "Prize Credited", body: `You won ${r.prize_coins} coins!`, data: { tournament_id: tournamentId }, deep_link: `rushzone://tournament/${tournamentId}/result` } as any);
      else await admin.schema("app").from("notifications").insert({ profile_id: r.profile_id, type: "result_published", title: "Results Published", body: "Tournament results are now official.", data: { tournament_id: tournamentId }, deep_link: `rushzone://tournament/${tournamentId}/result` } as any);
    }
    await writeAuditLog({ actorId: user.id, action: "result.publish", entityType: "tournament", entityId: tournamentId, after: { published: publishedCount } });
    return withCors(req, new Response(JSON.stringify({ ok: true, published: publishedCount }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
