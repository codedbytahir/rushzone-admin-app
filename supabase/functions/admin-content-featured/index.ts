import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
import { writeAuditLog } from "../_shared/audit.ts";
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
    if (req.method === "GET") {
      const { data } = await admin.schema("app").from("settings").select("value").eq("key", "featured_tournament_id").maybeSingle();
      return withCors(req, new Response(JSON.stringify({ featured_tournament_id: data?.value ?? null }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    }
    const body = await req.json();
    const tid = body.tournament_id ?? body.featured_tournament_id ?? null;
    if (tid) {
      const { data: tour } = await admin.schema("app").from("tournaments").select("id").eq("id", tid).maybeSingle();
      if (!tour) return withCors(req, jsonError("NOT_FOUND" as any, "Tournament not found", 404));
    }
    await admin.schema("app").from("settings").upsert({ key: "featured_tournament_id", value: tid ? `"${tid}"` as any : null as any, updated_by: userData.user.id } as any);
    if (tid) await admin.schema("app").from("settings").upsert({ key: "featured_tournament_id", value: JSON.parse(`"${tid}"`) as any, updated_by: userData.user.id } as any);
    else await admin.schema("app").from("settings").upsert({ key: "featured_tournament_id", value: null as any, updated_by: userData.user.id } as any);
    const realVal = tid ?? null;
    await admin.schema("app").from("settings").upsert({ key: "featured_tournament_id", value: realVal as any, updated_by: userData.user.id } as any);
    await writeAuditLog({ actorId: userData.user.id, action: "content.featured.update", entityType: "settings", entityId: "featured_tournament_id", after: { tournament_id: tid } });
    return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
