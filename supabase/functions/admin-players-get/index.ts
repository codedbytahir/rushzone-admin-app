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
    const id = url.searchParams.get("profile_id") ?? url.searchParams.get("id") ?? (await req.json().catch(()=>({}) as any)).profile_id;
    if (!id) return withCors(req, jsonError("VALIDATION_ERROR" as any, "profile_id required", 400));
    const { data: profile } = await admin.schema("app").from("profiles").select("*").eq("id", id).maybeSingle();
    if (!profile) return withCors(req, jsonError("NOT_FOUND" as any, "Profile not found", 404));
    const masked = profile.whatsapp_phone ? profile.whatsapp_phone.slice(0, 6) + "***" + profile.whatsapp_phone.slice(-2) : null;
    const { data: stats } = await admin.schema("app").from("profile_stats").select("*").eq("profile_id", id).maybeSingle();
    const { data: regs } = await admin.schema("app").from("registrations").select("id, tournament_id, status, slot_number, created_at").eq("profile_id", id).order("created_at", { ascending: false }).limit(20);
    const { data: results } = await admin.schema("app").from("match_results").select("tournament_id, kills, placement, points, prize_coins, status").eq("profile_id", id).order("created_at", { ascending: false }).limit(20);
    const { data: notes } = await admin.schema("app").from("internal_notes").select("id, body, author_id, created_at").eq("profile_id", id).order("created_at", { ascending: false }).limit(20);
    const { data: restrictions } = await admin.schema("app").from("restrictions").select("*").eq("profile_id", id).order("created_at", { ascending: false }).limit(20);
    const { data: flags } = await admin.schema("app").from("risk_flags").select("*").eq("profile_id", id).order("created_at", { ascending: false }).limit(20);
    let wallet: any = null;
    const { data: caller } = await admin.schema("admin").from("assignments").select("id").eq("user_id", userData.user.id).maybeSingle();
    if (caller) {
      const { data: roles } = await admin.schema("admin").from("assignment_roles").select("role_id").eq("assignment_id", caller.id);
      const rids = (roles ?? []).map((r: any)=> r.role_id);
      if (rids.length) {
        const { data: rp } = await admin.schema("admin").from("role_permissions").select("permission_id").in("role_id", rids);
        const pids = (rp ?? []).map((x: any)=> x.permission_id);
        const { data: perms } = await admin.schema("admin").from("permissions").select("key").in("id", pids);
        const keys = (perms ?? []).map((p: any)=> p.key);
        if (keys.includes("withdrawal.pay") || keys.includes("topup.review") || keys.includes("reports.view")) {
          const { data: w } = await admin.schema("app").from("wallet_accounts").select("available_balance, held_balance").eq("profile_id", id).maybeSingle();
          const { data: ledger } = await admin.schema("app").from("wallet_ledger").select("id, direction, type, amount, balance_after, created_at").eq("profile_id", id).order("created_at", { ascending: false }).limit(20);
          wallet = { balances: w, ledger };
        }
      }
    }
    return withCors(req, new Response(JSON.stringify({ profile: { ...profile, whatsapp_phone_masked: masked }, stats, registrations: regs, results, notes, restrictions, risk_flags: flags, wallet }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
