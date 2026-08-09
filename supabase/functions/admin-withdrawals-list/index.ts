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
    const { data: caller } = await admin.schema("admin").from("assignments").select("id, status").eq("user_id", userData.user.id).maybeSingle();
    if (!caller || caller.status !== "active") return withCors(req, jsonError("FORBIDDEN" as any, "Admin only", 403));
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "pending_review";
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 100);
    const offset = parseInt(url.searchParams.get("offset") ?? "0");
    let q = admin.schema("app").from("withdrawal_requests").select("id, profile_id, method, account_snapshot, amount_coins, status, payout_ref, risk_flags, created_at", { count: "exact" }).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (status && status !== "all") q = q.eq("status", status);
    const { data, error, count } = await q;
    if (error) return withCors(req, jsonError("INTERNAL" as any, error.message, 500));
    const pids = (data ?? []).map((r: any)=> r.profile_id);
    let profiles: Record<string, any> = {};
    if (pids.length) {
      const { data: profs } = await admin.schema("app").from("profiles").select("id, display_name, app_uid").in("id", pids);
      for (const p of (profs ?? [])) profiles[p.id] = p;
    }
    const { data: thresholdRow } = await admin.schema("app").from("settings").select("value").eq("key", "dual_approval_threshold").maybeSingle();
    const threshold = thresholdRow ? parseInt(JSON.stringify(thresholdRow.value).replace(/[^0-9]/g, "")) : 10000;
    const enriched = (data ?? []).map((r: any)=> {
      const ageH = (Date.now() - new Date(r.created_at).getTime()) / 3600000;
      const nearSLA = ageH > 20;
      const masked = r.account_snapshot ? r.account_snapshot.slice(0, 4) + "****" + r.account_snapshot.slice(-4) : "";
      return { ...r, account_masked: masked, profile: profiles[r.profile_id] ?? null, near_sla: nearSLA, needs_dual: r.amount_coins >= threshold };
    });
    return withCors(req, new Response(JSON.stringify({ data: enriched, count, dual_threshold: threshold }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
