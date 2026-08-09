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
      const { data } = await admin.schema("app").from("settings").select("value").eq("key", "announcement").maybeSingle();
      return withCors(req, new Response(JSON.stringify({ announcement: data?.value ?? { text: "", link: "", active: false } }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    }
    const body = await req.json();
    const value = { text: body.text ?? "", link: body.link ?? "", active: body.active ?? false };
    await admin.schema("app").from("settings").upsert({ key: "announcement", value, updated_by: userData.user.id } as any);
    await writeAuditLog({ actorId: userData.user.id, action: "content.announcement.update", entityType: "settings", entityId: "announcement", after: value });
    return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
