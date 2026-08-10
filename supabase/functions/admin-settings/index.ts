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
      const url = new URL(req.url);
      const key = url.searchParams.get("key");
      if (key) {
        const { data } = await admin.schema("app").from("settings").select("key, value, updated_at").eq("key", key).maybeSingle();
        return withCors(req, new Response(JSON.stringify({ data }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
      }
      const { data } = await admin.schema("app").from("settings").select("key, value, updated_at").order("key");
      return withCors(req, new Response(JSON.stringify({ data }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    }
    const body = await req.json();
    const key = body.key;
    const value = body.value;
    if (!key) return withCors(req, jsonError("VALIDATION_ERROR" as any, "key required", 400));
    if (key === "cash_operations_enabled" || key === "maintenance_mode") {
      const { data: caller } = await admin.schema("admin").from("assignments").select("is_owner, status").eq("user_id", user.id).maybeSingle();
      if (!caller?.is_owner) return withCors(req, jsonError("FORBIDDEN" as any, "Owner only for this flag", 403));
    }
    await admin.schema("app").from("settings").upsert({ key, value, updated_by: user.id } as any);
    await writeAuditLog({ actorId: user.id, action: "settings.update", entityType: "settings", entityId: key, after: { value } });
    return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
