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
    const type = body.type;
    const reason = body.reason;
    const expiresAt = body.expires_at ?? null;
    const lift = body.lift ?? body.unrestrict ?? false;
    if (!profileId || !type) return withCors(req, jsonError("VALIDATION_ERROR" as any, "profile_id and type required", 400));
    if (!["entry","rewards","wallet","suspend","ban"].includes(type)) return withCors(req, jsonError("VALIDATION_ERROR" as any, "Invalid type", 400));
    if (!lift && (!reason || reason.length < 5)) return withCors(req, jsonError("VALIDATION_ERROR" as any, "reason required", 400));
    if (lift) {
      await admin.schema("app").from("restrictions").update({ lifted_at: new Date().toISOString() }).eq("profile_id", profileId).eq("type", type).is("lifted_at", null);
      await writeAuditLog({ actorId: user.id, action: "player.restrict.lift", entityType: "profile", entityId: profileId, after: { type } });
      if (type === "suspend" || type === "ban") await admin.schema("app").from("profiles").update({ status: "active" }).eq("id", profileId);
    } else {
      await admin.schema("app").from("restrictions").insert({ profile_id: profileId, type, reason, applied_by: user.id, expires_at: expiresAt } as any);
      await writeAuditLog({ actorId: user.id, action: "player.restrict." + type, entityType: "profile", entityId: profileId, reason, after: { type, expires_at: expiresAt } });
      if (type === "ban") await admin.schema("app").from("profiles").update({ status: "banned" }).eq("id", profileId);
      else if (type === "suspend") await admin.schema("app").from("profiles").update({ status: "suspended" }).eq("id", profileId);
      else if (type === "wallet") await admin.schema("app").from("profiles").update({ status: "restricted" }).eq("id", profileId);
    }
    return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
