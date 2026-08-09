import { handleCors, withCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider") ?? "admob";
    const body = await req.json().catch(async ()=> {
      const t = await req.text();
      try { return JSON.parse(t); } catch { return Object.fromEntries(new URLSearchParams(t)); }
    });
    const token = body.ad_token ?? body.token ?? body.custom_data ?? url.searchParams.get("custom_data") ?? url.searchParams.get("token");
    const sig = body.signature ?? body.sig ?? url.searchParams.get("signature") ?? req.headers.get("x-ad-signature") ?? "";
    const expectedKey = Deno.env.get(provider === "unity" ? "AD_SSV_KEY_UNITY" : "AD_SSV_KEY_ADMOB") ?? Deno.env.get("AD_SSV_KEY_ADMOB");
    if (expectedKey && sig) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey("raw", encoder.encode(expectedKey), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
      const data = encoder.encode(token ?? JSON.stringify(body));
      const sigBytes = Uint8Array.from(atob(sig), (c)=> c.charCodeAt(0));
      try {
        const ok = await crypto.subtle.verify("HMAC", key, sigBytes, data);
        if (!ok) return withCors(req, jsonError("FORBIDDEN" as any, "Invalid SSV signature", 403));
      } catch {}
    }
    const profileId = body.profile_id ?? body.user_id ?? body.custom_data;
    const campaignId = body.campaign_id ?? body.campaignId;
    const attemptId = body.attempt_id ?? body.id;
    if (!profileId || !campaignId) return withCors(req, jsonError("VALIDATION_ERROR" as any, "profile_id and campaign_id required", 400));
    const admin = createAdminClient();
    const { data: camp } = await admin.schema("app").from("reward_campaigns").select("id, status").eq("id", campaignId).maybeSingle();
    if (!camp || camp.status !== "active") return withCors(req, jsonError("FORBIDDEN" as any, "Campaign not active", 403));
    let itemId: any = null;
    let coins = 0;
    const { data: items } = await admin.schema("app").from("reward_items").select("id, coins, weight").eq("campaign_id", campaignId);
    if (items && items.length) {
      const total = items.reduce((s: number, x: any)=> s + x.weight, 0);
      let r = Math.floor(Math.random() * total) + 1;
      let run = 0;
      for (const it of items) { run += it.weight; if (r <= run) { itemId = it.id; coins = it.coins; break; } }
    }
    let ledgerId: any = null;
    if (coins > 0) {
      const { data: bal } = await admin.rpc("wallet_credit", { p_profile_id: profileId, p_amount: coins, p_type: "reward_award", p_reference_type: "reward_campaign", p_reference_id: campaignId, p_idempotency_key: `ssv:${attemptId ?? crypto.randomUUID()}` } as any);
      if (bal) {
        const { data: led } = await admin.schema("app").from("wallet_ledger").select("id").eq("idempotency_key", `ssv:${attemptId ?? ""}`).maybeSingle();
        ledgerId = led?.id ?? null;
      }
    }
    const { data: inserted } = await admin.schema("app").from("reward_attempts").insert({ campaign_id: campaignId, profile_id: profileId, source: "ad", ad_provider: provider, ad_token: token ?? null, item_id: itemId, coins_won: coins, ledger_id: ledgerId, idempotency_key: `ad:${attemptId ?? crypto.randomUUID()}` }).select("id").single();
    return withCors(req, new Response(JSON.stringify({ ok: true, attempt_id: inserted?.id, coins_won: coins }), { headers: { "Content-Type": "application/json", ...handleCors(req) ?? {} } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
