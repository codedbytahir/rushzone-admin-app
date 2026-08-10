import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
import { writeAuditLog } from "../_shared/audit.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const { user } = await requireAdmin(req, "content.manage");
    const admin = createAdminClient();
    const url = new URL(req.url);
    if (req.method === "GET") {
      const { data } = await admin.schema("app").from("banners").select("*").order("sort_order", { ascending: true });
      return withCors(req, new Response(JSON.stringify({ data }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    }
    const body = await req.json();
    const action = body.action ?? url.searchParams.get("action") ?? "create";
    if (action === "create") {
      if (!body.image_path) return withCors(req, jsonError("VALIDATION_ERROR" as any, "image_path required", 400));
      const row = { image_path: body.image_path, link_url: body.link_url ?? null, sort_order: body.sort_order ?? 0, active: body.active ?? true, starts_at: body.starts_at ?? null, ends_at: body.ends_at ?? null };
      const { data, error } = await admin.schema("app").from("banners").insert(row).select("id").single();
      if (error) return withCors(req, jsonError("INTERNAL" as any, error.message, 500));
      await writeAuditLog({ actorId: user.id, action: "content.banner.create", entityType: "banner", entityId: data.id });
      return withCors(req, new Response(JSON.stringify({ ok: true, id: data.id }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    }
    if (action === "update") {
      const id = body.id;
      if (!id) return withCors(req, jsonError("VALIDATION_ERROR" as any, "id required", 400));
      const allowed = ["image_path","link_url","sort_order","active","starts_at","ends_at"];
      const upd: any = {};
      for (const k of allowed) if (body[k] !== undefined) upd[k] = body[k];
      await admin.schema("app").from("banners").update(upd).eq("id", id);
      await writeAuditLog({ actorId: user.id, action: "content.banner.update", entityType: "banner", entityId: id, after: upd });
      return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    }
    if (action === "delete") {
      const id = body.id;
      await admin.schema("app").from("banners").delete().eq("id", id);
      await writeAuditLog({ actorId: user.id, action: "content.banner.delete", entityType: "banner", entityId: id });
      return withCors(req, new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    }
    return withCors(req, jsonError("VALIDATION_ERROR" as any, "Unknown action", 400));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
