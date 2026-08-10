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
    const { user } = await requireAdmin(req, "notifications.send");
    const admin = createAdminClient();
    const body = await req.json();
    const title = body.title;
    const text = body.body ?? body.text ?? body.message;
    const type = body.type ?? "broadcast";
    const deepLink = body.deep_link ?? body.deepLink ?? null;
    if (!title || !text) return withCors(req, jsonError("VALIDATION_ERROR" as any, "title and body required", 400));
    if (text.includes("room_password") || text.includes("OTP") || text.toLowerCase().includes("super key")) return withCors(req, jsonError("VALIDATION_ERROR" as any, "Body contains blocked sensitive data", 400));
    const isBroadcast = body.broadcast ?? body.is_broadcast ?? false;
    if (isBroadcast) {
      const confirm = body.confirm ?? false;
      if (!confirm) return withCors(req, jsonError("VALIDATION_ERROR" as any, "Broadcast requires confirm true", 400));
      const { data: ids } = await admin.schema("app").from("profiles").select("id").limit(1000);
      for (const p of (ids ?? [])) await admin.schema("app").from("notifications").insert({ profile_id: p.id, type, title, body: text, data: body.data ?? {}, deep_link: deepLink } as any);
      await writeAuditLog({ actorId: user.id, action: "notification.broadcast", entityType: "notification", entityId: "broadcast", after: { title, type } });
      return withCors(req, new Response(JSON.stringify({ ok: true, sent: ids?.length ?? 0 }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    }
    const profileId = body.profile_id ?? body.profileId;
    const tournamentId = body.tournament_id;
    if (tournamentId) {
      const { data: regs } = await admin.schema("app").from("registrations").select("profile_id").eq("tournament_id", tournamentId).eq("status", "confirmed");
      for (const r of (regs ?? [])) await admin.schema("app").from("notifications").insert({ profile_id: r.profile_id, type, title, body: text, data: { tournament_id: tournamentId }, deep_link: deepLink } as any);
      await writeAuditLog({ actorId: user.id, action: "notification.tournament", entityType: "tournament", entityId: tournamentId, after: { title } });
      return withCors(req, new Response(JSON.stringify({ ok: true, sent: regs?.length ?? 0 }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    }
    if (!profileId) return withCors(req, jsonError("VALIDATION_ERROR" as any, "profile_id or tournament_id or broadcast required", 400));
    await admin.schema("app").from("notifications").insert({ profile_id: profileId, type, title, body: text, data: body.data ?? {}, deep_link: deepLink } as any);
    await writeAuditLog({ actorId: user.id, action: "notification.send", entityType: "profile", entityId: profileId, after: { title } });
    return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
