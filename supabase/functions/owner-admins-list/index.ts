import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
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
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    let q = admin.schema("admin").from("assignments").select("id, user_id, status, is_owner, created_at").order("created_at", { ascending: false });
    if (status) q = q.eq("status", status);
    const { data: list, error } = await q;
    if (error) return withCors(req, jsonError("INTERNAL" as any, error.message, 500));
    const ids = (list ?? []).map((r: any)=> r.id);
    let credMap: Record<string, any> = {};
    let rolesMap: Record<string, any> = {};
    if (ids.length) {
      const { data: creds } = await admin.schema("admin").from("security_credentials").select("assignment_id, status, key_version, last_used_at, locked_until, failed_attempts").in("assignment_id", ids);
      for (const c of (creds ?? [])) credMap[c.assignment_id] = c;
      const { data: ar } = await admin.schema("admin").from("assignment_roles").select("assignment_id, role_id").in("assignment_id", ids);
      const roleIds = [...new Set((ar ?? []).map((x: any)=> x.role_id))];
      let roleLookup: Record<string, any> = {};
      if (roleIds.length) {
        const { data: roles } = await admin.schema("admin").from("roles").select("id, key, name").in("id", roleIds);
        for (const r of (roles ?? [])) roleLookup[r.id] = r;
      }
      for (const a of (ar ?? [])) {
        if (!rolesMap[a.assignment_id]) rolesMap[a.assignment_id] = [];
        if (roleLookup[a.role_id]) rolesMap[a.assignment_id].push(roleLookup[a.role_id]);
      }
    }
    const enriched = (list ?? []).map((a: any)=> ({ ...a, credential: credMap[a.id] ?? null, roles: rolesMap[a.id] ?? [] }));
    return withCors(req, new Response(JSON.stringify({ data: enriched }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
