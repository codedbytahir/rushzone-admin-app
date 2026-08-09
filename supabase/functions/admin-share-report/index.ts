import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
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
    const { data: events } = await admin.schema("app").from("card_share_events").select("card_type, channel, created_at").limit(1000);
    const byType: Record<string, number> = {};
    const byChannel: Record<string, number> = {};
    for (const e of (events ?? [])) { byType[e.card_type] = (byType[e.card_type] ?? 0) + 1; if (e.channel) byChannel[e.channel] = (byChannel[e.channel] ?? 0) + 1; }
    return withCors(req, new Response(JSON.stringify({ total: events?.length ?? 0, by_type: byType, by_channel: byChannel }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
