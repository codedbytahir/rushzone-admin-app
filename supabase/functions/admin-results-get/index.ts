import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const auth = req.headers.get("authorization") ?? "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return withCors(req, jsonError("UNAUTHORIZED" as any, "Missing token", 401));
    const jwt = m[1];
    const admin = createAdminClient();
    const { data: userData } = await admin.auth.getUser(jwt);
    if (!userData?.user) return withCors(req, jsonError("UNAUTHORIZED" as any, "Invalid token", 401));
    const { data: caller } = await admin.schema("admin").from("assignments").select("id, status").eq("user_id", userData.user.id).maybeSingle();
    if (!caller || caller.status !== "active") return withCors(req, jsonError("FORBIDDEN" as any, "Admin only", 403));
    const url = new URL(req.url);
    const tournamentId = url.searchParams.get("tournament_id") ?? (await req.json().catch(()=>({}) as any)).tournament_id;
    if (!tournamentId) return withCors(req, jsonError("VALIDATION_ERROR" as any, "tournament_id required", 400));
    const { data: regs } = await admin.schema("app").from("registrations").select("profile_id, slot_number").eq("tournament_id", tournamentId).eq("status", "confirmed").order("slot_number");
    const { data: results } = await admin.schema("app").from("match_results").select("*").eq("tournament_id", tournamentId).order("placement", { ascending: true });
    const pids = (regs ?? []).map((r: any)=> r.profile_id);
    let profiles: Record<string, any> = {};
    if (pids.length) {
      const { data: profs } = await admin.schema("app").from("profiles").select("id, display_name, app_uid, in_game_name").in("id", pids);
      for (const p of (profs ?? [])) profiles[p.id] = p;
    }
    const merged = (regs ?? []).map((r: any)=> {
      const res = (results ?? []).find((x: any)=> x.profile_id === r.profile_id);
      return { profile_id: r.profile_id, slot_number: r.slot_number, profile: profiles[r.profile_id] ?? null, result: res ?? { tournament_id: tournamentId, profile_id: r.profile_id, kills: 0, placement: null, points: 0, is_dq: false, prize_coins: 0, status: "draft" } };
    });
    return withCors(req, new Response(JSON.stringify({ data: merged }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
