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
    const url = new URL(req.url);
    const id = url.searchParams.get("tournament_id") ?? (await req.json().catch(()=> ({})) as any).tournament_id;
    if (!id) return withCors(req, jsonError("VALIDATION_ERROR" as any, "tournament_id required", 400));
    const { data: regs } = await admin.schema("app").from("registrations").select("id, profile_id, slot_number, fee_snapshot, roster_id, status, created_at").eq("tournament_id", id).order("slot_number");
    const pids = (regs ?? []).map((r: any)=> r.profile_id);
    let profiles: Record<string, any> = {};
    if (pids.length) {
      const { data: profs } = await admin.schema("app").from("profiles").select("id, display_name, app_uid, in_game_name, ff_uid").in("id", pids);
      for (const p of (profs ?? [])) profiles[p.id] = p;
    }
    const { data: rosters } = await admin.schema("app").from("rosters").select("id, label, capacity").eq("tournament_id", id);
    const enriched = (regs ?? []).map((r: any)=> ({ ...r, profile: profiles[r.profile_id] ?? null }));
    const unassigned = (regs ?? []).filter((r: any)=> !r.roster_id).length;
    return withCors(req, new Response(JSON.stringify({ registrations: enriched, rosters: rosters ?? [], unassigned_count: unassigned }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
