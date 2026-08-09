import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const admin = createAdminClient();
    const keys = ["player_min_version","player_latest_version","admin_min_version","admin_latest_version","force_update","maintenance_mode","cash_operations_enabled"];
    const { data } = await admin.schema("app").from("settings").select("key, value").in("key", keys);
    const map: Record<string, any> = {};
    for (const r of (data ?? [])) map[r.key] = r.value;
    const getVal = (k: string, def: any) => map[k] ?? def;
    const maint = getVal("maintenance_mode", { enabled: false, message: "" });
    const maintEnabled = typeof maint === "object" ? maint.enabled : maint === true || maint === "true";
    const maintMsg = typeof maint === "object" ? maint.message : "";
    return withCors(req, new Response(JSON.stringify({ player_min_version: getVal("player_min_version", "1.0.0"), player_latest_version: getVal("player_latest_version", "1.0.0"), admin_min_version: getVal("admin_min_version", "1.0.0"), admin_latest_version: getVal("admin_latest_version", "1.0.0"), force_update: getVal("force_update", false), maintenance: maintEnabled, maintenance_message: maintMsg, cash_operations_enabled: getVal("cash_operations_enabled", false) }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, new Response(JSON.stringify({ error: { code: "INTERNAL", message: String(e) } }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  }
});
