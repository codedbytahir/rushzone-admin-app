import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
import { writeAuditLog } from "../_shared/audit.ts";

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== "POST") return withCors(req, jsonError("VALIDATION_ERROR" as any, "POST required", 405));
  try {
    const body = await req.json().catch(()=> ({}));
    const superKey = body.super_key ?? body.superKey ?? "";
    if (!superKey || typeof superKey !== "string") return withCors(req, jsonError("VALIDATION_ERROR" as any, "super_key required", 400));
    const auth = req.headers.get("authorization") ?? "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return withCors(req, jsonError("UNAUTHORIZED" as any, "Missing token", 401));
    const jwt = m[1];
    const admin = createAdminClient();
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return withCors(req, jsonError("UNAUTHORIZED" as any, "Invalid token", 401));
    const userId = userData.user.id;
    const { data: assignment } = await admin.schema("admin").from("assignments").select("id, status, is_owner").eq("user_id", userId).maybeSingle();
    if (!assignment || assignment.status !== "active") return withCors(req, new Response(JSON.stringify({ error: { code: "FORBIDDEN", message: "Unable to verify admin access.", retryable: false } }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    const { data: cred } = await admin.schema("admin").from("security_credentials").select("assignment_id, key_hash, status, failed_attempts, locked_until, key_version").eq("assignment_id", assignment.id).maybeSingle();
    if (!cred) return withCors(req, new Response(JSON.stringify({ error: { code: "FORBIDDEN", message: "Unable to verify admin access.", retryable: false } }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    if (cred.status === "revoked") return withCors(req, new Response(JSON.stringify({ error: { code: "FORBIDDEN", message: "Unable to verify admin access.", retryable: false } }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    if (cred.status === "locked" && cred.locked_until && new Date(cred.locked_until) > new Date()) return withCors(req, new Response(JSON.stringify({ error: { code: "SUPER_KEY_LOCKED", message: "Admin access temporarily locked. Contact the Owner.", retryable: false } }), { status: 423, headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    const { data: ok, error: verErr } = await admin.rpc("verify_super_key", { p_assignment_id: assignment.id, p_plaintext: superKey } as any);
    let verified = ok === true;
    if (verErr) {
      const { data: hashRow } = await admin.schema("admin").from("security_credentials").select("key_hash").eq("assignment_id", assignment.id).maybeSingle();
      verified = false;
      if (hashRow?.key_hash) {
        try {
          const bcrypt = await import("https://esm.sh/bcryptjs@2.4.3");
          verified = bcrypt.compareSync(superKey, hashRow.key_hash);
        } catch { verified = false; }
      }
    }
    if (!verified) {
      const attempts = (cred.failed_attempts ?? 0) + 1;
      let update: any = { failed_attempts: attempts };
      if (attempts >= 5) {
        update.status = "locked";
        update.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await writeAuditLog({ actorId: userId, action: "admin_login_locked", entityType: "assignment", entityId: assignment.id });
      }
      await admin.schema("admin").from("security_credentials").update(update).eq("assignment_id", assignment.id);
      await writeAuditLog({ actorId: userId, action: "admin_login_failed", entityType: "assignment", entityId: assignment.id });
      return withCors(req, new Response(JSON.stringify({ error: { code: "FORBIDDEN", message: "Unable to verify admin access.", retryable: false } }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    }
    await admin.schema("admin").from("security_credentials").update({ failed_attempts: 0, locked_until: null, last_used_at: new Date().toISOString(), status: "active" }).eq("assignment_id", assignment.id);
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    const { data: session } = await admin.schema("admin").from("sessions").insert({ assignment_id: assignment.id, device: req.headers.get("user-agent") ?? null, expires_at: expiresAt }).select("id").single();
    const { data: roles } = await admin.schema("admin").from("assignment_roles").select("role_id").eq("assignment_id", assignment.id);
    const roleIds = (roles ?? []).map((r: any)=> r.role_id);
    let permissions: string[] = [];
    if (roleIds.length) {
      const { data: rp } = await admin.schema("admin").from("role_permissions").select("permission_id").in("role_id", roleIds);
      const permIds = (rp ?? []).map((x: any)=> x.permission_id);
      if (permIds.length) {
        const { data: perms } = await admin.schema("admin").from("permissions").select("key").in("id", permIds);
        permissions = (perms ?? []).map((p: any)=> p.key);
      }
    }
    if (assignment.is_owner) permissions = ["*"];
    await writeAuditLog({ actorId: userId, action: "admin_login_success", entityType: "assignment", entityId: assignment.id });
    return withCors(req, new Response(JSON.stringify({ ok: true, assignment_id: assignment.id, is_owner: assignment.is_owner, permissions, session_id: session?.id ?? null, expires_at: expiresAt }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
