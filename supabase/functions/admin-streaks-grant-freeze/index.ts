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
    const { user } = await requireAdmin(req, "streaks.manage");
    const admin = createAdminClient();
    const body = await req.json();
    const profileId = body.profile_id;
    if (!profileId) return withCors(req, jsonError("VALIDATION_ERROR" as any, "profile_id required", 400));
    await admin.schema("app").from("streak_freezes").insert({ profile_id: profileId, balance: 1 } as any);
    await writeAuditLog({ actorId: user.id, action: "streak.freeze.grant", entityType: "profile", entityId: profileId });
    return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
