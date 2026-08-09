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
    const plaintext = genKey();
    const { data: hashData } = await admin.rpc("hash_super_key", { p_plaintext: plaintext } as any);
    let hash: string | null = hashData as any;
    if (!hash) {
      const bcrypt = await import("https://esm.sh/bcryptjs@2.4.3");
      hash = bcrypt.hashSync(plaintext, 10);
    }
    const { data: cred } = await admin.schema("admin").from("security_credentials").select("key_version").eq("assignment_id", assignmentId).maybeSingle();
    const nextVersion = (cred?.key_version ?? 0) + 1;
    await admin.schema("admin").from("security_credentials").update({ key_hash: hash, status: "active", key_version: nextVersion, issued_by: userData.user.id, rotated_at: new Date().toISOString(), failed_attempts: 0, locked_until: null }).eq("assignment_id", assignmentId);
    await admin.schema("admin").from("sessions").update({ revoked_at: new Date().toISOString() }).eq("assignment_id", assignmentId);
    await writeAuditLog({ actorId: userData.user.id, action: "admin_super_key_rotated", entityType: "assignment", entityId: assignmentId, after: { key_version: nextVersion } });
    return withCors(req, new Response(JSON.stringify({ ok: true, super_key: plaintext, key_version: nextVersion }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
