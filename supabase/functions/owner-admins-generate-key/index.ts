import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
import { writeAuditLog } from "../_shared/audit.ts";
function genKey() {
  const a = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  const b = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  const c = crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `RZ-${a}-${b}-${c}`;
}
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
    const { data: caller } = await admin.schema("admin").from("assignments").select("id, is_owner, status").eq("user_id", userData.user.id).maybeSingle();
    if (!caller?.is_owner || caller.status !== "active") return withCors(req, jsonError("FORBIDDEN" as any, "Owner only", 403));
    const body = await req.json();
    const assignmentId = body.assignment_id;
    if (!assignmentId) return withCors(req, jsonError("VALIDATION_ERROR" as any, "assignment_id required", 400));
    const { data: target } = await admin.schema("admin").from("assignments").select("id").eq("id", assignmentId).maybeSingle();
    if (!target) return withCors(req, jsonError("NOT_FOUND" as any, "Assignment not found", 404));
    const plaintext = genKey();
    const { data: hashData, error: hashErr } = await admin.rpc("hash_super_key", { p_plaintext: plaintext } as any);
    let hash: string | null = hashData as any;
    if (hashErr || !hash) {
      try {
        const bcrypt = await import("https://esm.sh/bcryptjs@2.4.3");
        hash = bcrypt.hashSync(plaintext, 10);
      } catch { hash = null; }
    }
    if (!hash) return withCors(req, jsonError("INTERNAL" as any, "Hash failed", 500));
    const { data: existing } = await admin.schema("admin").from("security_credentials").select("assignment_id, key_version").eq("assignment_id", assignmentId).maybeSingle();
    const nextVersion = (existing?.key_version ?? 0) + 1;
    if (existing) {
      await admin.schema("admin").from("security_credentials").update({ key_hash: hash, status: "active", key_version: nextVersion, issued_by: userData.user.id, rotated_at: new Date().toISOString(), failed_attempts: 0, locked_until: null }).eq("assignment_id", assignmentId);
    } else {
      await admin.schema("admin").from("security_credentials").insert({ assignment_id: assignmentId, key_hash: hash, status: "active", key_version: 1, issued_by: userData.user.id, failed_attempts: 0 } as any);
    }
    await admin.schema("admin").from("sessions").update({ revoked_at: new Date().toISOString() }).eq("assignment_id", assignmentId);
    await writeAuditLog({ actorId: userData.user.id, action: "admin_super_key_generated", entityType: "assignment", entityId: assignmentId, after: { key_version: nextVersion } });
    return withCors(req, new Response(JSON.stringify({ ok: true, super_key: plaintext, key_version: nextVersion, warning: "Copy now. Plaintext shown only once." }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
