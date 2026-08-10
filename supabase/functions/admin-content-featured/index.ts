import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
import { writeAuditLog } from "../_shared/audit.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const { user } = await requireAdmin(req, "content.manage");
    const admin = createAdminClient();
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
    await admin.schema("app").from("settings").upsert({ key: "featured_tournament_id", value: tid ? `"${tid}"` as any : null as any, updated_by: user.id } as any);
    if (tid) await admin.schema("app").from("settings").upsert({ key: "featured_tournament_id", value: JSON.parse(`"${tid}"`) as any, updated_by: user.id } as any);
    else await admin.schema("app").from("settings").upsert({ key: "featured_tournament_id", value: null as any, updated_by: user.id } as any);
    const realVal = tid ?? null;
    await admin.schema("app").from("settings").upsert({ key: "featured_tournament_id", value: realVal as any, updated_by: user.id } as any);
    await writeAuditLog({ actorId: user.id, action: "content.featured.update", entityType: "settings", entityId: "featured_tournament_id", after: { tournament_id: tid } });
    return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
