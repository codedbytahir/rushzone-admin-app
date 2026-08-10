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
    const { user } = await requireAdmin(req, "tournament.roster");
    const admin = createAdminClient();
    const body = await req.json();
    const registrationId = body.registration_id;
    const rosterId = body.roster_id;
    if (!registrationId) return withCors(req, jsonError("VALIDATION_ERROR" as any, "registration_id required", 400));
    const { data: reg } = await admin.schema("app").from("registrations").select("id, tournament_id, roster_id").eq("id", registrationId).maybeSingle();
    if (!reg) return withCors(req, jsonError("NOT_FOUND" as any, "Registration not found", 404));
    if (rosterId) {
      const { data: roster } = await admin.schema("app").from("rosters").select("id, capacity, tournament_id").eq("id", rosterId).maybeSingle();
      if (!roster || roster.tournament_id !== reg.tournament_id) return withCors(req, jsonError("VALIDATION_ERROR" as any, "Invalid roster", 400));
      const { data: members } = await admin.schema("app").from("registrations").select("id").eq("roster_id", rosterId).eq("status", "confirmed");
      if ((members ?? []).length >= roster.capacity) return withCors(req, jsonError("VALIDATION_ERROR" as any, "Roster full", 400));
    }
    await admin.schema("app").from("registrations").update({ roster_id: rosterId ?? null }).eq("id", registrationId);
    await writeAuditLog({ actorId: user.id, action: "roster.assign", entityType: "registration", entityId: registrationId, after: { roster_id: rosterId } });
    return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
