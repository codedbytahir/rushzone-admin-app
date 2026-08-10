import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const { user } = await requireAdmin(req);
    const admin = createAdminClient();
    const userId = user.id;
    const { data: assignment } = await admin.schema("admin").from("assignments").select("id, status, is_owner, created_at").eq("user_id", userId).maybeSingle();
    if (!assignment) return withCors(req, jsonError("FORBIDDEN" as any, "No assignment", 403));
    const { data: roles } = await admin.schema("admin").from("assignment_roles").select("role_id").eq("assignment_id", assignment.id);
    const roleIds = (roles ?? []).map((r: any)=> r.role_id);
    let permissions: string[] = [];
    let roleKeys: string[] = [];
    if (roleIds.length) {
      const { data: rp } = await admin.schema("admin").from("role_permissions").select("permission_id").in("role_id", roleIds);
      const permIds = (rp ?? []).map((x: any)=> x.permission_id);
      if (permIds.length) {
        const { data: perms } = await admin.schema("admin").from("permissions").select("key").in("id", permIds);
        permissions = (perms ?? []).map((p: any)=> p.key);
      }
      const { data: roleRows } = await admin.schema("admin").from("roles").select("key, name").in("id", roleIds);
      roleKeys = (roleRows ?? []).map((r: any)=> r.key);
    }
    const { data: cred } = await admin.schema("admin").from("security_credentials").select("status, key_version, last_used_at, locked_until").eq("assignment_id", assignment.id).maybeSingle();
    return withCors(req, new Response(JSON.stringify({ assignment, cred, roles: roleKeys, permissions, is_owner: assignment.is_owner }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
