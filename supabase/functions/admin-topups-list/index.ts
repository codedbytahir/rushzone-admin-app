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
    const status = url.searchParams.get("status") ?? "pending";
    const method = url.searchParams.get("method");
    const risk = url.searchParams.get("risk");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 100);
    const offset = parseInt(url.searchParams.get("offset") ?? "0");
    let q = admin.schema("app").from("topup_requests").select("id, profile_id, method, amount_coins, reference, status, created_at, risk_flags", { count: "exact" }).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (status && status !== "all") q = q.eq("status", status);
    if (method) q = q.eq("method", method);
    const { data, error, count } = await q;
    if (error) return withCors(req, jsonError("INTERNAL" as any, error.message, 500));
    let filtered = data ?? [];
    if (risk === "flagged") filtered = filtered.filter((r: any)=> (r.risk_flags ?? []).length > 0);
    const pids = filtered.map((r: any)=> r.profile_id);
    let profiles: Record<string, any> = {};
    if (pids.length) {
      const { data: profs } = await admin.schema("app").from("profiles").select("id, display_name, app_uid, whatsapp_phone").in("id", pids);
      for (const p of (profs ?? [])) {
        const masked = p.whatsapp_phone ? p.whatsapp_phone.slice(0, 6) + "***" + p.whatsapp_phone.slice(-2) : null;
        profiles[p.id] = { id: p.id, display_name: p.display_name, app_uid: p.app_uid, phone_masked: masked };
      }
    }
    const enriched = filtered.map((r: any)=> ({ ...r, profile: profiles[r.profile_id] ?? null }));
    return withCors(req, new Response(JSON.stringify({ data: enriched, count }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
