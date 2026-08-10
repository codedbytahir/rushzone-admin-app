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
    const { user } = await requireAdmin(req, "players.restrict");
    const admin = createAdminClient();
    const body = await req.json();
    const profileId = body.profile_id;
    const bodyText = body.body;
    if (!profileId || !bodyText) return withCors(req, jsonError("VALIDATION_ERROR" as any, "profile_id and body required", 400));
    if (bodyText.length < 1 || bodyText.length > 2000) return withCors(req, jsonError("VALIDATION_ERROR" as any, "body 1..2000 chars", 400));
    const { data: inserted } = await admin.schema("app").from("internal_notes").insert({ profile_id: profileId, author_id: user.id, body: bodyText }).select("id, created_at").single();
    await writeAuditLog({ actorId: user.id, action: "player.note.add", entityType: "profile", entityId: profileId, after: { note_id: inserted.id } });
    return withCors(req, new Response(JSON.stringify({ ok: true, id: inserted.id }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
