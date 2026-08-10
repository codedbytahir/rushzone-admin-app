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
    const { user } = await requireAdmin(req, "room.release");
    const admin = createAdminClient();
    const body = await req.json();
    const tournamentId = body.tournament_id;
    if (!tournamentId) return withCors(req, jsonError("VALIDATION_ERROR" as any, "tournament_id required", 400));
    const { data: room } = await admin.schema("app").from("rooms").select("*").eq("tournament_id", tournamentId).maybeSingle();
    if (!room) return withCors(req, jsonError("NOT_FOUND" as any, "Room not configured", 404));
    await admin.schema("app").from("rooms").update({ released_at: new Date().toISOString(), released_by: user.id }).eq("tournament_id", tournamentId);
    await admin.schema("app").from("tournaments").update({ status: "room_released" }).eq("id", tournamentId);
    const { data: regs } = await admin.schema("app").from("registrations").select("profile_id").eq("tournament_id", tournamentId).eq("status", "confirmed");
    for (const r of (regs ?? [])) {
      await admin.schema("app").from("notifications").insert({ profile_id: r.profile_id, type: "room_released", title: "Room Released", body: "Room credentials are now available.", data: { tournament_id: tournamentId }, deep_link: `rushzone://tournament/${tournamentId}/room` } as any);
    }
    await writeAuditLog({ actorId: user.id, action: "room.release", entityType: "tournament", entityId: tournamentId });
    return withCors(req, new Response(JSON.stringify({ ok: true, released_count: (regs ?? []).length }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
