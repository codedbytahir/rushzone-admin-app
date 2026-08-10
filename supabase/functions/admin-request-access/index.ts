import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
import { writeAuditLog } from "../_shared/audit.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== "POST") return withCors(req, jsonError("VALIDATION_ERROR" as any, "POST required", 405));
  try {
    const user = await requireUser(req);
    const admin = createAdminClient();
    const body = await req.json().catch(() => ({}));
    const requestedRole: string = typeof body.requested_role === "string" ? body.requested_role.slice(0, 80) : "";
    const { data: existing } = await admin.schema("admin").from("assignments").select("id, status, is_owner, updated_at").eq("user_id", user.id).maybeSingle();
    if (existing) {
      if (existing.is_owner) {
        return withCors(req, new Response(JSON.stringify({ ok: true, already: "owner" }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
      }
      if (existing.status === "pending") {
        return withCors(req, new Response(JSON.stringify({ ok: true, already: "pending" }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
      }
      // Throttle re-requests (e.g. after a rejection): allow at most one per 10 minutes.
      if (existing.updated_at) {
        const last = new Date(existing.updated_at).getTime();
        const tenMin = 10 * 60 * 1000;
        if (!isNaN(last) && Date.now() - last < tenMin) {
          return withCors(req, new Response(JSON.stringify({ ok: false, already: "throttled", message: "Request already submitted recently. Try again in a few minutes." }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
        }
      }
      if (existing.status === "active") {
        return withCors(req, new Response(JSON.stringify({ ok: true, already: "active" }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
      }
      // rejected/suspended/revoked -> allow re-request
      await admin.schema("admin").from("assignments").update({ status: "pending", requested_role: requestedRole || null }).eq("id", existing.id);
      await writeAuditLog({ actorId: user.id, action: "admin_access_requested", entityType: "assignment", entityId: existing.id, after: { status: "pending", requested_role: requestedRole } });
      return withCors(req, new Response(JSON.stringify({ ok: true, assignment_id: existing.id }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    }
    const { data: inserted, error: insErr } = await admin.schema("admin").from("assignments").insert({ user_id: user.id, status: "pending", is_owner: false, requested_role: requestedRole || null }).select("id").single();
    if (insErr) return withCors(req, jsonError("INTERNAL" as any, insErr.message, 500));
    await writeAuditLog({ actorId: user.id, action: "admin_access_requested", entityType: "assignment", entityId: inserted.id, after: { requested_role: requestedRole } });
    return withCors(req, new Response(JSON.stringify({ ok: true, assignment_id: inserted.id }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
