import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const admin = createAdminClient();
    const keys = ["policy_links","policy_terms_url","policy_privacy_url","policy_tournament_rules_url","policy_wallet_url","policy_reward_terms_url","landing_page_url","home_page_url","about_app_url","whatsapp_support_url","support_email","announcement","featured_tournament_id","player_min_version","player_latest_version","admin_min_version","admin_latest_version","force_update","maintenance_mode","cash_operations_enabled","social_telegram","social_discord","social_instagram","social_youtube","app_store_url","play_store_url"];
    const { data } = await admin.schema("app").from("settings").select("key, value").in("key", keys);
    const map: Record<string, any> = {};
    for (const r of (data ?? [])) map[r.key] = r.value;
    const get = (k: string, def: any) => map[k] ?? def;
    const maint = get("maintenance_mode", { enabled: false, message: "" });
    const maintEnabled = typeof maint === "object" ? maint.enabled : maint === true;

    // Editable policy links list. Prefer the single 'policy_links' JSON array;
    // fall back to the legacy individual keys so existing installs keep working.
    const stored = get("policy_links", null);
    const defaultLinks = [
      { id: "terms", label: "Terms", url: get("policy_terms_url", "https://rushzone.example.com/terms") },
      { id: "privacy", label: "Privacy", url: get("policy_privacy_url", "https://rushzone.example.com/privacy") },
      { id: "tournament_rules", label: "Tournament Rules", url: get("policy_tournament_rules_url", "https://rushzone.example.com/rules") },
      { id: "wallet", label: "Wallet", url: get("policy_wallet_url", "https://rushzone.example.com/wallet") },
      { id: "rewards", label: "Rewards", url: get("policy_reward_terms_url", "https://rushzone.example.com/rewards") },
    ];
    const policyLinks = Array.isArray(stored) && stored.length > 0 ? stored : defaultLinks;
    const linkUrl = (id: string, fallback: string) => {
      const found = policyLinks.find((l: any) => l.id === id);
      return found?.url ?? fallback;
    };
    const policies = { terms: linkUrl("terms", get("policy_terms_url", "https://rushzone.example.com/terms")), privacy: linkUrl("privacy", get("policy_privacy_url", "https://rushzone.example.com/privacy")), tournament_rules: linkUrl("tournament_rules", get("policy_tournament_rules_url", "https://rushzone.example.com/rules")), wallet: linkUrl("wallet", get("policy_wallet_url", "https://rushzone.example.com/wallet")), rewards: linkUrl("rewards", get("policy_reward_terms_url", "https://rushzone.example.com/rewards")) };
    return withCors(req, new Response(JSON.stringify({ policy_links: policyLinks, policies, landing_page_url: get("landing_page_url", "https://rushzone.example.com"), home_page_url: get("home_page_url", get("landing_page_url", "https://rushzone.example.com")), about_app_url: get("about_app_url", "https://rushzone.example.com/about"), whatsapp_support_url: get("whatsapp_support_url", "https://wa.me/923000000000"), support_email: get("support_email", "support@rushzone.example.com"), announcement: get("announcement", { text: "", link: "", active: false }), featured_tournament_id: get("featured_tournament_id", null), versions: { player_min: get("player_min_version", "1.0.0"), player_latest: get("player_latest_version", "1.0.0"), admin_min: get("admin_min_version", "1.0.0"), admin_latest: get("admin_latest_version", "1.0.0"), force_update: get("force_update", false) }, maintenance: { enabled: maintEnabled, message: typeof maint === "object" ? maint.message ?? "" : "" }, cash_operations_enabled: get("cash_operations_enabled", false), social: { telegram: get("social_telegram", ""), discord: get("social_discord", ""), instagram: get("social_instagram", ""), youtube: get("social_youtube", "") }, stores: { app_store: get("app_store_url", ""), play_store: get("play_store_url", "") } }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, new Response(JSON.stringify({ error: { code: "INTERNAL", message: String(e) } }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  }
});
