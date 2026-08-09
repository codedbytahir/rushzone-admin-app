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
    const status = url.searchParams.get("status");
    let q = admin.schema("app").from("referrals").select("id, referrer_id, referred_id, reward_status, risk_flags, created_at, qualified_at", { count: "exact" }).order("created_at", { ascending: false }).limit(50);
    if (status && status !== "all") q = q.eq("reward_status", status);
    const { data, error, count } = await q;
    if (error) return withCors(req, jsonError("INTERNAL" as any, error.message, 500));
    return withCors(req, new Response(JSON.stringify({ data, count }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
