import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { requireOwner } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const { user } = await requireOwner(req);
    const admin = createAdminClient();
    const { data: caller } = await admin.schema("admin").from("assignments").select("id, is_owner, status").eq("user_id", user.id).maybeSingle();
    if (!caller?.is_owner || caller.status !== "active") return withCors(req, jsonError("FORBIDDEN" as any, "Owner only", 403));
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    let q = admin.schema("admin").from("assignments").select("id, user_id, status, is_owner, created_at, requested_role").order("created_at", { ascending: false });
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
    // Effective permission keys per assignment (via the RBAC view) for accurate prefill.
    let permMap: Record<string, string[]> = {};
    try {
      const { data: pv } = await admin.schema("admin").from("assignment_permissions").select("assignment_id, permission_keys");
      for (const r of (pv ?? [])) permMap[r.assignment_id] = (r.permission_keys ?? "").split(",").filter(Boolean);
    } catch { /* best-effort */ }
    const enriched = (list ?? []).map((a: any)=> ({ ...a, credential: credMap[a.id] ?? null, roles: rolesMap[a.id] ?? [], permissions: permMap[a.id] ?? [] }));

    // Enrich with emails (owner-facing list only).
    let emailMap: Record<string, string> = {};
    try {
      const uidSet = new Set<string>();
      for (const r of (list ?? [])) { const uid = (r as any)?.user_id; if (typeof uid === 'string' && uid) uidSet.add(uid); }
      const uids = Array.from(uidSet);
      if (uids.length) {
        const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
        const userList = ((users as any)?.users ?? []) as Array<{ id: string; email?: string | null }>;
        const byId = new Map<string, string>(userList.map((u) => [u.id, u.email ?? '']));
        for (const uid of uids) emailMap[uid] = byId.get(uid) ?? '';
      }
    } catch { /* email enrichment is best-effort */ }
    const out = enriched.map((a: any)=> ({ ...a, email: emailMap[a.user_id] ?? a.email ?? null }));
    return withCors(req, new Response(JSON.stringify({ data: out }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
    return withCors(req, new Response(JSON.stringify({ data: enriched }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
