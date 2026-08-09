import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
import { writeAuditLog } from "../_shared/audit.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const body = await req.json().catch(() => ({}) as any);
    const secret = req.headers.get("x-bootstrap-secret") ?? body.bootstrap_secret;
    const expected = Deno.env.get("OWNER_BOOTSTRAP_SECRET");
    if (!expected || secret !== expected) return withCors(req, jsonError("FORBIDDEN" as any, "Invalid bootstrap secret", 403));
    const auth = req.headers.get("authorization") ?? "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return withCors(req, jsonError("UNAUTHORIZED" as any, "Missing token", 401));
    const jwt = m[1];
    const admin = createAdminClient();
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return withCors(req, jsonError("UNAUTHORIZED" as any, "Invalid token", 401));
    const userId = userData.user.id;
    const { data: existing } = await admin.schema("admin").from("assignments").select("id, is_owner").eq("user_id", userId).maybeSingle();
    if (existing?.is_owner) return withCors(req, new Response(JSON.stringify({ ok: true, message: "Already owner" }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    const { data: ownerExists } = await admin.schema("admin").from("assignments").select("id").eq("is_owner", true).limit(1);
    if (ownerExists && ownerExists.length > 0) {
      const { data: caller } = await admin.schema("admin").from("assignments").select("is_owner, status").eq("user_id", userId).maybeSingle();
      if (!caller?.is_owner) return withCors(req, jsonError("FORBIDDEN" as any, "Owner already exists", 403));
    }
    let assignmentId = existing?.id;
    if (!assignmentId) {
      const { data: inserted, error: insErr } = await admin.schema("admin").from("assignments").insert({ user_id: userId, status: "active", is_owner: true }).select("id").single();
      if (insErr) return withCors(req, jsonError("INTERNAL" as any, insErr.message, 500));
      assignmentId = inserted.id;
    } else {
      await admin.schema("admin").from("assignments").update({ status: "active", is_owner: true }).eq("id", assignmentId);
    }
    const { data: cred } = await admin.schema("admin").from("security_credentials").select("assignment_id").eq("assignment_id", assignmentId).maybeSingle();
    if (!cred) {
      const placeholder = "$2a$10$bootstrapplaceholderhash000000000000000000000000000000";
      await admin.schema("admin").from("security_credentials").insert({ assignment_id: assignmentId, key_hash: placeholder, status: "pending", key_version: 1, issued_by: userId, failed_attempts: 0 } as any);
    }
    await writeAuditLog({ actorId: userId, action: "owner_bootstrap", entityType: "assignment", entityId: assignmentId, before: null, after: { is_owner: true } });
    return withCors(req, new Response(JSON.stringify({ ok: true, assignment_id: assignmentId, message: "Owner bootstrap complete. Generate Super Key next." }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
