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
    const { data: camps } = await admin.schema("app").from("reward_campaigns").select("id, name, status");
    const { data: attempts } = await admin.schema("app").from("reward_attempts").select("campaign_id, source, coins_won, risk_flags, created_at");
    const totalAttempts = attempts?.length ?? 0;
    const adCount = (attempts ?? []).filter((a: any)=> a.source === "ad").length;
    const paidCount = (attempts ?? []).filter((a: any)=> a.source === "paid").length;
    let coinsAwarded = 0, paidSpent = 0;
    for (const a of (attempts ?? [])) coinsAwarded += a.coins_won ?? 0;
    const { data: paidCosts } = await admin.schema("app").from("reward_attempts").select("campaign_id").eq("source", "paid");
    paidSpent = (paidCosts ?? []).length * 5;
    const riskFlags = (attempts ?? []).filter((a: any)=> (a.risk_flags ?? []).length > 0).length;
    const byCampaign = (camps ?? []).map((c: any)=> {
      const list = (attempts ?? []).filter((a: any)=> a.campaign_id === c.id);
      return { campaign_id: c.id, name: c.name, status: c.status, attempts: list.length, coins_awarded: list.reduce((s: number, x: any)=> s + (x.coins_won ?? 0), 0) };
    });
    return withCors(req, new Response(JSON.stringify({ total_attempts: totalAttempts, ad_validated: adCount, paid_attempts: paidCount, coins_awarded: coinsAwarded, paid_spent: paidSpent, risk_flags: riskFlags, by_campaign: byCampaign }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
