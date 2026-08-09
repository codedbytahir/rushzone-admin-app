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
    const tournamentId = url.searchParams.get("tournament_id") ?? (await req.json().catch(()=>({}) as any)).tournament_id;
    if (!tournamentId) return withCors(req, jsonError("VALIDATION_ERROR" as any, "tournament_id required", 400));
    const { data: reg } = await admin.schema("app").from("registrations").select("id").eq("tournament_id", tournamentId).eq("profile_id", userData.user.id).eq("status", "confirmed").maybeSingle();
    if (!reg) return withCors(req, jsonError("FORBIDDEN" as any, "Not registered or not confirmed", 403));
    const { data: room } = await admin.schema("app").from("rooms").select("room_id, room_password, server_region, instructions, released_at").eq("tournament_id", tournamentId).maybeSingle();
    if (!room || !room.released_at) return withCors(req, jsonError("FORBIDDEN" as any, "Room not released yet", 403));
    return withCors(req, new Response(JSON.stringify({ room_id: room.room_id, room_password: room.room_password, server_region: room.server_region, instructions: room.instructions, released_at: room.released_at }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
