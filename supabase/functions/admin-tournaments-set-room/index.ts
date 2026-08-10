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
    const { user } = await requireAdmin(req, "room.manage");
    const admin = createAdminClient();
    const body = await req.json();
    const tournamentId = body.tournament_id;
    const roomId = body.room_id;
    const password = body.room_password;
    if (!tournamentId || !roomId || !password) return withCors(req, jsonError("VALIDATION_ERROR" as any, "tournament_id, room_id, room_password required", 400));
    const row = { tournament_id: tournamentId, room_id: roomId, room_password: password, server_region: body.server_region ?? null, instructions: body.instructions ?? null, release_at: body.release_at ?? new Date().toISOString() };
    const { error } = await admin.schema("app").from("rooms").upsert(row as any);
    if (error) return withCors(req, jsonError("INTERNAL" as any, error.message, 500));
    await writeAuditLog({ actorId: user.id, action: "room.save", entityType: "tournament", entityId: tournamentId });
    return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
