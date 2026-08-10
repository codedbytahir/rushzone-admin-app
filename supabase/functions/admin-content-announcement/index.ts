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
      const { data } = await admin.schema("app").from("settings").select("value").eq("key", "announcement").maybeSingle();
      return withCors(req, new Response(JSON.stringify({ announcement: data?.value ?? { text: "", link: "", active: false } }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    }
    const body = await req.json();
    const value = { text: body.text ?? "", link: body.link ?? "", active: body.active ?? false };
    await admin.schema("app").from("settings").upsert({ key: "announcement", value, updated_by: user.id } as any);
    await writeAuditLog({ actorId: user.id, action: "content.announcement.update", entityType: "settings", entityId: "announcement", after: value });
    return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
