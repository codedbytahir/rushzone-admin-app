import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
import { writeAuditLog } from "../_shared/audit.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== "POST") return withCors(req, jsonError("VALIDATION_ERROR" as any, "POST required", 405));
  try {
    const { user } = await requireAdmin(req, "tournament.create");
    const admin = createAdminClient();
    const body = await req.json();
    if (!body.title || !body.capacity) return withCors(req, jsonError("VALIDATION_ERROR" as any, "title and capacity required", 400));
    const row = {
      title: body.title,
      description: body.description ?? null,
      internal_notes: body.internal_notes ?? null,
      mode: body.mode ?? "squad",
      map: body.map ?? null,
      cover_path: body.cover_path ?? null,
      rounds: body.rounds ?? 1,
      capacity: body.capacity,
      entry_fee: body.entry_fee ?? 0,
      prize_pool: body.prize_pool ?? 0,
      prize_distribution: body.prize_distribution ?? [],
      score_rules: body.score_rules ?? {},
      rules_text: body.rules_text ?? null,
      status: body.publish ? "scheduled" : "draft",
      reg_open_at: body.reg_open_at ?? null,
      reg_close_at: body.reg_close_at ?? null,
      match_start_at: body.match_start_at ?? null,
      room_release_at: body.room_release_at ?? null,
      result_expected_at: body.result_expected_at ?? null,
      is_preset: body.is_preset ?? false,
      preset_key: body.preset_key ?? null,
      free_slot_enabled: body.free_slot_enabled ?? false,
      free_slot_trigger: body.free_slot_trigger ?? "slots_full",
      created_by: user.id,
      published_at: body.publish ? new Date().toISOString() : null,
    };
    const { data: inserted, error } = await admin.schema("app").from("tournaments").insert(row).select("id").single();
    if (error) return withCors(req, jsonError("INTERNAL" as any, error.message, 500));
    await writeAuditLog({ actorId: user.id, action: "tournament.create", entityType: "tournament", entityId: inserted.id, after: row });
    return withCors(req, new Response(JSON.stringify({ ok: true, id: inserted.id }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
