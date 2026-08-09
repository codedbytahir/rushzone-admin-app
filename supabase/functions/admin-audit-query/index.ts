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
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? url.searchParams.get("filter") ?? "";
    const actor = url.searchParams.get("actor_id") ?? url.searchParams.get("actor");
    const entityType = url.searchParams.get("entity_type");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") ?? "0");
    const since = url.searchParams.get("since");
    let q = admin.schema("audit").from("logs").select("id, actor_id, action, entity_type, entity_id, reason, created_at", { count: "exact" }).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (action) q = q.eq("action", action);
    if (actor) q = q.eq("actor_id", actor);
    if (entityType) q = q.eq("entity_type", entityType);
    if (since) q = q.gte("created_at", since);
    const { data, error, count } = await q;
    if (error) return withCors(req, jsonError("INTERNAL" as any, error.message, 500));
    return withCors(req, new Response(JSON.stringify({ data, count }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
