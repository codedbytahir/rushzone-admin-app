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
    const tournamentId = body.tournament_id;
    if (!tournamentId) return withCors(req, jsonError("VALIDATION_ERROR" as any, "tournament_id required", 400));
    const { data: room } = await admin.schema("app").from("rooms").select("*").eq("tournament_id", tournamentId).maybeSingle();
    if (!room) return withCors(req, jsonError("NOT_FOUND" as any, "Room not configured", 404));
    await admin.schema("app").from("rooms").update({ released_at: new Date().toISOString(), released_by: userData.user.id }).eq("tournament_id", tournamentId);
    await admin.schema("app").from("tournaments").update({ status: "room_released" }).eq("id", tournamentId);
    const { data: regs } = await admin.schema("app").from("registrations").select("profile_id").eq("tournament_id", tournamentId).eq("status", "confirmed");
    for (const r of (regs ?? [])) {
      await admin.schema("app").from("notifications").insert({ profile_id: r.profile_id, type: "room_released", title: "Room Released", body: "Room credentials are now available.", data: { tournament_id: tournamentId }, deep_link: `rushzone://tournament/${tournamentId}/room` } as any);
    }
    await writeAuditLog({ actorId: userData.user.id, action: "room.release", entityType: "tournament", entityId: tournamentId });
    return withCors(req, new Response(JSON.stringify({ ok: true, released_count: (regs ?? []).length }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
