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
    const { data: mismatches, error } = await admin.rpc("reconciliation_check" as any);
    if (error) return withCors(req, jsonError("INTERNAL" as any, error.message, 500));
    const list = (mismatches as any) ?? [];
    for (const row of list) {
      await admin.schema("app").from("risk_flags").insert({ profile_id: row.profile_id, context: "reconciliation_mismatch", severity: "critical", meta: { cached_available: row.cached_available, ledger_available: row.ledger_available } } as any);
    }
    return withCors(req, new Response(JSON.stringify({ mismatches: list, count: list.length, flagged: list.length > 0 }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
