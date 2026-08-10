import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const { user } = await requireAdmin(req, "players.restrict");
    const admin = createAdminClient();
    const { data: caller } = await admin.schema("admin").from("assignments").select("id, status").eq("user_id", user.id).maybeSingle();
    if (!caller || caller.status !== "active") return withCors(req, jsonError("FORBIDDEN" as any, "Admin only", 403));
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? (await req.json().catch(()=>({}) as any)).q ?? url.searchParams.get("query");
    if (!q || q.trim().length < 2) return withCors(req, jsonError("VALIDATION_ERROR" as any, "q min 2 chars required", 400));
    let profiles: any[] = [];
    const { data: byName } = await admin.schema("app").from("profiles").select("id, display_name, app_uid, ff_uid, whatsapp_phone, status").ilike("display_name", `%${q}%`).limit(20);
    profiles = byName ?? [];
    if (profiles.length === 0) {
      const { data: byUid } = await admin.schema("app").from("profiles").select("id, display_name, app_uid, ff_uid, whatsapp_phone, status").or(`app_uid.eq.${q},ff_uid.eq.${q}`).limit(20);
      if (byUid && byUid.length) profiles = byUid;
    }
    if (profiles.length === 0 && q.startsWith("+")) {
      const { data: byPhone } = await admin.schema("app").from("profiles").select("id, display_name, app_uid, ff_uid, whatsapp_phone, status").eq("whatsapp_phone", q).limit(20);
      if (byPhone) profiles = byPhone;
    }
    if (profiles.length === 0) {
      const { data: regs } = await admin.schema("app").from("registrations").select("profile_id").eq("tournament_id", q).limit(20);
      if (regs && regs.length) {
        const pids = regs.map((r: any)=> r.profile_id);
        const { data: p } = await admin.schema("app").from("profiles").select("id, display_name, app_uid, ff_uid, whatsapp_phone, status").in("id", pids);
        profiles = p ?? [];
      }
    }
    const out = profiles.map((p: any)=> ({ ...p, whatsapp_phone: p.whatsapp_phone ? p.whatsapp_phone.slice(0, 6) + "***" + p.whatsapp_phone.slice(-2) : null }));
    return withCors(req, new Response(JSON.stringify({ data: out }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
