import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
import { writeAuditLog } from "../_shared/audit.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const { user } = await requireAdmin(req, "settings.manage");
    const admin = createAdminClient();
    if (req.method === "GET") {
      const { data } = await admin.schema("app").from("settings").select("value").eq("key", "referral_config").maybeSingle();
      return withCors(req, new Response(JSON.stringify({ config: data?.value ?? null }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    }
    const body = await req.json();
    const config = body.config ?? body;
    await admin.schema("app").from("settings").upsert({ key: "referral_config", value: config, updated_by: user.id } as any);
    await writeAuditLog({ actorId: user.id, action: "referral.config.update", entityType: "settings", entityId: "referral_config", after: config });
    return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
