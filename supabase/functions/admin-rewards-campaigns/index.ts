import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
import { writeAuditLog } from "../_shared/audit.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const { user } = await requireAdmin(req, "rewards.manage");
    const admin = createAdminClient();
    const { data: caller } = await admin.schema("admin").from("assignments").select("id, status").eq("user_id", user.id).maybeSingle();
    if (!caller || caller.status !== "active") return withCors(req, jsonError("FORBIDDEN" as any, "Admin only", 403));
    const url = new URL(req.url);
    if (req.method === "GET") {
      const id = url.searchParams.get("id");
      if (id) {
        const { data: camp } = await admin.schema("app").from("reward_campaigns").select("*").eq("id", id).maybeSingle();
        if (!camp) return withCors(req, jsonError("NOT_FOUND" as any, "Campaign not found", 404));
        const { data: items } = await admin.schema("app").from("reward_items").select("*").eq("campaign_id", id);
        return withCors(req, new Response(JSON.stringify({ campaign: camp, items }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
      }
      const { data: list } = await admin.schema("app").from("reward_campaigns").select("*").order("created_at", { ascending: false });
      return withCors(req, new Response(JSON.stringify({ data: list }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    }
    const body = await req.json();
    const action = body.action ?? (url.searchParams.get("action") ?? "create");
    if (action === "create") {
      const row = { name: body.name, status: body.status ?? "active", starts_at: body.starts_at ?? null, ends_at: body.ends_at ?? null, ad_enabled: body.ad_enabled ?? true, paid_enabled: body.paid_enabled ?? true, paid_cost: body.paid_cost ?? 5, daily_cap: body.daily_cap ?? null, cooldown_secs: body.cooldown_secs ?? 0, global_cap: body.global_cap ?? null, created_by: user.id };
      if (!row.name) return withCors(req, jsonError("VALIDATION_ERROR" as any, "name required", 400));
      const { data: camp, error } = await admin.schema("app").from("reward_campaigns").insert(row).select("id").single();
      if (error) return withCors(req, jsonError("INTERNAL" as any, error.message, 500));
      if (Array.isArray(body.items)) {
        for (const it of body.items) await admin.schema("app").from("reward_items").insert({ campaign_id: camp.id, coins: it.coins, weight: it.weight });
      }
      await writeAuditLog({ actorId: user.id, action: "reward.campaign.create", entityType: "campaign", entityId: camp.id });
      return withCors(req, new Response(JSON.stringify({ ok: true, id: camp.id }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    }
    if (action === "update") {
      const id = body.id ?? body.campaign_id;
      if (!id) return withCors(req, jsonError("VALIDATION_ERROR" as any, "id required", 400));
      const allowed = ["name","status","ad_enabled","paid_enabled","paid_cost","daily_cap","cooldown_secs","global_cap","starts_at","ends_at"];
      const upd: any = {};
      for (const k of allowed) if (body[k] !== undefined) upd[k] = body[k];
      await admin.schema("app").from("reward_campaigns").update(upd).eq("id", id);
      if (Array.isArray(body.items)) {
        await admin.schema("app").from("reward_items").delete().eq("campaign_id", id);
        for (const it of body.items) await admin.schema("app").from("reward_items").insert({ campaign_id: id, coins: it.coins, weight: it.weight });
      }
      await writeAuditLog({ actorId: user.id, action: "reward.campaign.update", entityType: "campaign", entityId: id, after: upd });
      return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    }
    if (action === "pause") {
      const id = body.id ?? body.campaign_id;
      await admin.schema("app").from("reward_campaigns").update({ status: "paused" }).eq("id", id);
      await writeAuditLog({ actorId: user.id, action: "reward.campaign.pause", entityType: "campaign", entityId: id });
      return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    }
    return withCors(req, jsonError("VALIDATION_ERROR" as any, "Unknown action", 400));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
