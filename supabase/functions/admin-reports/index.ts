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
    const { data: tCount } = await admin.schema("app").from("tournaments").select("id", { count: "exact", head: true });
    const { data: regs } = await admin.schema("app").from("registrations").select("id, status");
    const confirmed = (regs ?? []).filter((r: any)=> r.status === "confirmed").length;
    const cancelled = (regs ?? []).filter((r: any)=> r.status === "cancelled").length;
    const refunded = (regs ?? []).filter((r: any)=> r.status === "refunded").length;
    const { data: topups } = await admin.schema("app").from("topup_requests").select("status, amount_coins");
    const topupPending = (topups ?? []).filter((t: any)=> t.status === "pending").length;
    const topupApproved = (topups ?? []).filter((t: any)=> t.status === "approved").reduce((s: number, x: any)=> s + (x.amount_coins ?? 0), 0);
    const { data: wds } = await admin.schema("app").from("withdrawal_requests").select("status, amount_coins");
    const wdPending = (wds ?? []).filter((w: any)=> w.status === "pending_review").length;
    const wdPaid = (wds ?? []).filter((w: any)=> w.status === "paid").reduce((s: number, x: any)=> s + (x.amount_coins ?? 0), 0);
    const wdHeld = (wds ?? []).filter((w: any)=> ["pending_review","approved"].includes(w.status)).reduce((s: number, x: any)=> s + (x.amount_coins ?? 0), 0);
    const { data: wallets } = await admin.schema("app").from("wallet_accounts").select("available_balance, held_balance");
    let liability = 0, heldTotal = 0;
    for (const w of (wallets ?? [])) { liability += (w.available_balance ?? 0) + (w.held_balance ?? 0); heldTotal += w.held_balance ?? 0; }
    const { data: prizes } = await admin.schema("app").from("prize_awards").select("amount");
    const prizeTotal = (prizes ?? []).reduce((s: number, x: any)=> s + (x.amount ?? 0), 0);
    const { data: rewards } = await admin.schema("app").from("reward_attempts").select("coins_won");
    const rewardPaid = (rewards ?? []).reduce((s: number, x: any)=> s + (x.coins_won ?? 0), 0);
    const { data: ledgers } = await admin.schema("app").from("wallet_ledger").select("id", { count: "exact", head: true });
    return withCors(req, new Response(JSON.stringify({ tournaments: { total: tCount as any ?? 0 }, registrations: { confirmed, cancelled, refunded }, topups: { pending: topupPending, approved_amount: topupApproved }, withdrawals: { pending_review: wdPending, paid_amount: wdPaid, held_amount: wdHeld }, wallet: { liability, held: heldTotal, ledger_entries: ledgers as any ?? 0 }, prizes: { total_awarded: prizeTotal }, rewards: { total_coins: rewardPaid } }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
