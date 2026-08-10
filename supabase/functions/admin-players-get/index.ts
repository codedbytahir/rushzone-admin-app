import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const { user, admin: ctx } = await requireAdmin(req, "players.restrict");
    const admin = createAdminClient();
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
    const financePerms = ctx.isOwner || ctx.permissions.some((k: string) => ["withdrawal.pay", "topup.review", "reports.view"].includes(k));
    if (financePerms) {
      const { data: w } = await admin.schema("app").from("wallet_accounts").select("available_balance, held_balance").eq("profile_id", id).maybeSingle();
      const { data: ledger } = await admin.schema("app").from("wallet_ledger").select("id, direction, type, amount, balance_after, created_at").eq("profile_id", id).order("created_at", { ascending: false }).limit(20);
      wallet = { balances: w, ledger };
    }
    return withCors(req, new Response(JSON.stringify({ profile: { ...profile, whatsapp_phone_masked: masked }, stats, registrations: regs, results, notes, restrictions, risk_flags: flags, wallet }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
