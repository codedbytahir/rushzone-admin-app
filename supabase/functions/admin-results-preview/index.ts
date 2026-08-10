import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const { user } = await requireAdmin(req, "result.publish");
    const admin = createAdminClient();
    const url = new URL(req.url);
    const tournamentId = url.searchParams.get("tournament_id") ?? (await req.json().catch(()=>({}) as any)).tournament_id;
    if (!tournamentId) return withCors(req, jsonError("VALIDATION_ERROR" as any, "tournament_id required", 400));
    const { data: results } = await admin.schema("app").from("match_results").select("*").eq("tournament_id", tournamentId).order("points", { ascending: false });
    const sorted = (results ?? []).slice().sort((a: any, b: any)=> {
      if (b.points !== a.points) return b.points - a.points;
      if (b.kills !== a.kills) return b.kills - a.kills;
      if (a.placement && b.placement) return a.placement - b.placement;
      return 0;
    });
    let totalPrize = 0;
    for (const r of sorted) totalPrize += r.prize_coins ?? 0;
    const standings = sorted.map((r: any, idx: number)=> ({ rank: idx + 1, profile_id: r.profile_id, kills: r.kills, placement: r.placement, points: r.points, prize_coins: r.prize_coins, is_dq: r.is_dq }));
    return withCors(req, new Response(JSON.stringify({ standings, total_prize: totalPrize, count: sorted.length }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
