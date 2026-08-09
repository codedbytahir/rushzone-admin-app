import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
import { writeAuditLog } from "../_shared/audit.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== "POST") return withCors(req, jsonError("VALIDATION_ERROR" as any, "POST required", 405));
  try {
    const auth = req.headers.get("authorization") ?? "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return withCors(req, jsonError("UNAUTHORIZED" as any, "Missing token", 401));
    const jwt = m[1];
    const admin = createAdminClient();
    const { data: userData } = await admin.auth.getUser(jwt);
    if (!userData?.user) return withCors(req, jsonError("UNAUTHORIZED" as any, "Invalid token", 401));
    const { data: caller } = await admin.schema("admin").from("assignments").select("id, status, is_owner").eq("user_id", userData.user.id).maybeSingle();
    if (!caller || caller.status !== "active") return withCors(req, jsonError("FORBIDDEN" as any, "Admin only", 403));
    if (!caller.is_owner) {
      const { data: perm } = await admin.schema("admin").from("assignment_roles").select("role_id").eq("assignment_id", caller.id);
      const rids = (perm ?? []).map((x: any)=> x.role_id);
      if (rids.length) {
        const { data: rp } = await admin.schema("admin").from("role_permissions").select("permission_id").in("role_id", rids);
        const pids = (rp ?? []).map((x: any)=> x.permission_id);
        const { data: perms } = await admin.schema("admin").from("permissions").select("key").in("id", pids);
        const keys = (perms ?? []).map((p: any)=> p.key);
        if (!keys.includes("tournament.create")) return withCors(req, jsonError("FORBIDDEN" as any, "Missing tournament.create", 403));
      } else return withCors(req, jsonError("FORBIDDEN" as any, "No roles", 403));
    }
    const body = await req.json();
    if (!body.title || !body.capacity) return withCors(req, jsonError("VALIDATION_ERROR" as any, "title and capacity required", 400));
    const row = {
      title: body.title,
      description: body.description ?? null,
      internal_notes: body.internal_notes ?? null,
      mode: body.mode ?? "squad",
      map: body.map ?? null,
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
      created_by: userData.user.id,
      published_at: body.publish ? new Date().toISOString() : null,
    };
    const { data: inserted, error } = await admin.schema("app").from("tournaments").insert(row).select("id").single();
    if (error) return withCors(req, jsonError("INTERNAL" as any, error.message, 500));
    await writeAuditLog({ actorId: userData.user.id, action: "tournament.create", entityType: "tournament", entityId: inserted.id, after: row });
    return withCors(req, new Response(JSON.stringify({ ok: true, id: inserted.id }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
