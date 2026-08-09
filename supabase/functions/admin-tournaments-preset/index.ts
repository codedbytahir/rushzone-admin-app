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
    const action = url.searchParams.get("action") ?? "list";
    if (req.method === "GET" && action === "list") {
      const { data } = await admin.schema("app").from("tournaments").select("id, title, mode, map, capacity, entry_fee, prize_pool, prize_distribution, score_rules, rules_text, rounds, is_preset, preset_key").eq("is_preset", true).order("created_at", { ascending: false });
      return withCors(req, new Response(JSON.stringify({ data }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    }
    const body = await req.json();
    if (action === "save" || body.preset_key || body.is_preset) {
      const srcId = body.source_tournament_id ?? body.id;
      let base: any = {};
      if (srcId) {
        const { data: src } = await admin.schema("app").from("tournaments").select("*").eq("id", srcId).maybeSingle();
        if (src) base = src;
      }
      const presetKey = body.preset_key ?? `preset-${Date.now()}`;
      const row = {
        title: body.title ?? base.title ?? "Preset",
        mode: body.mode ?? base.mode ?? "squad",
        map: body.map ?? base.map,
        capacity: body.capacity ?? base.capacity ?? 100,
        entry_fee: body.entry_fee ?? base.entry_fee ?? 0,
        prize_pool: body.prize_pool ?? base.prize_pool ?? 0,
        prize_distribution: body.prize_distribution ?? base.prize_distribution ?? [],
        score_rules: body.score_rules ?? base.score_rules ?? {},
        rules_text: body.rules_text ?? base.rules_text,
        rounds: body.rounds ?? base.rounds ?? 1,
        is_preset: true,
        preset_key: presetKey,
        status: "draft",
        created_by: userData.user.id,
      };
      const { data: inserted } = await admin.schema("app").from("tournaments").insert(row).select("id").single();
      return withCors(req, new Response(JSON.stringify({ ok: true, id: inserted.id }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    }
    if (action === "apply") {
      const presetId = body.preset_id;
      if (!presetId) return withCors(req, jsonError("VALIDATION_ERROR" as any, "preset_id required", 400));
      const { data: preset } = await admin.schema("app").from("tournaments").select("*").eq("id", presetId).eq("is_preset", true).maybeSingle();
      if (!preset) return withCors(req, jsonError("NOT_FOUND" as any, "Preset not found", 404));
      const row = {
        title: body.title ?? preset.title,
        description: body.description ?? null,
        mode: preset.mode,
        map: preset.map,
        capacity: preset.capacity,
        entry_fee: preset.entry_fee,
        prize_pool: preset.prize_pool,
        prize_distribution: preset.prize_distribution,
        score_rules: preset.score_rules,
        rules_text: preset.rules_text,
        rounds: preset.rounds,
        is_preset: false,
        status: "draft",
        reg_open_at: body.reg_open_at ?? null,
        reg_close_at: body.reg_close_at ?? null,
        match_start_at: body.match_start_at ?? null,
        room_release_at: body.room_release_at ?? null,
        created_by: userData.user.id,
      };
      const { data: inserted } = await admin.schema("app").from("tournaments").insert(row).select("id").single();
      return withCors(req, new Response(JSON.stringify({ ok: true, id: inserted.id }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    }
    return withCors(req, jsonError("VALIDATION_ERROR" as any, "Unknown action", 400));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
