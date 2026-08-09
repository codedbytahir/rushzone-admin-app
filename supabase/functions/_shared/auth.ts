// _shared/auth.ts — requireUser + requireAdmin + Super Key verification (Argon2id)

import { createAdminClient, createUserClient } from "./supabase.ts";
import { unauthorized, forbidden } from "./errors.ts";

// Lightweight JWT extraction
export function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export type AuthUser = { id: string; email?: string; jwt: string };

export async function requireUser(req: Request): Promise<AuthUser> {
  const token = getBearerToken(req);
  if (!token) throw unauthorized("Missing Authorization Bearer token");
  const admin = createAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) throw unauthorized("Invalid or expired token");
  return { id: data.user.id, email: data.user.email ?? undefined, jwt: token };
}

// Permission check via admin.assignments + role_permissions
export type AdminContext = {
  assignmentId: string;
  isOwner: boolean;
  permissions: string[];
};

export async function requireAdmin(req: Request, requiredPermission?: string): Promise<{ user: AuthUser; admin: AdminContext }> {
  const user = await requireUser(req);
  const adminClient = createAdminClient();

  // Fetch assignment
  const { data: assignment, error: assignErr } = await adminClient
    .from("assignments")
    .select("id, status, is_owner")
    .eq("user_id", user.id)
    .single();

  // Note: PostgREST schema qualified: admin.assignments is exposed via Supabase? Use RPC or direct query via service role
  // Fallback: use raw query via adminClient.rpc if table is in admin schema. Supabase JS defaults to public schema; use .schema('admin')
  let assignRow: any = assignment;
  if (assignErr || !assignRow) {
    const { data: a2, error: e2 } = await adminClient.schema("admin").from("assignments").select("id, status, is_owner").eq("user_id", user.id).maybeSingle();
    if (e2 || !a2) throw forbidden("Admin assignment not found or not active");
    assignRow = a2;
  }

  if (assignRow.status !== "active") throw forbidden(`Admin status is ${assignRow.status}`);

  // Check credential lock
  const { data: cred } = await adminClient.schema("admin").from("security_credentials").select("status, locked_until, failed_attempts").eq("assignment_id", assignRow.id).maybeSingle();
  if (cred?.status === "locked" && cred.locked_until && new Date(cred.locked_until) > new Date()) {
    throw forbidden("Super Key temporarily locked. Contact Owner.");
  }
  if (cred?.status === "revoked") throw forbidden("Super Key revoked");

  // Owner bypasses permission checks
  if (assignRow.is_owner) {
    return { user, admin: { assignmentId: assignRow.id, isOwner: true, permissions: ["*"] } };
  }

  // Fetch permissions via join
  const { data: rows } = await adminClient
    .rpc("has_permission", { p_user_id: user.id, p_permission_key: requiredPermission ?? "" })
    .maybeSingle();

  // Alternative manual fetch if RPC not used:
  let hasPerm = !!assignRow.is_owner;
  if (requiredPermission && !hasPerm) {
    const { data: permRows } = await adminClient.schema("admin").from("role_permissions")
      .select("permission_id, permissions!inner(key)")
      // This join is conceptual; fallback to separate queries below
      .limit(1);
    // Simplified: fetch via view
    const { data: view } = await adminClient.from("assignment_permissions").select("permission_keys").eq("assignment_id", assignRow.id).maybeSingle();
    // If view unavailable, query assignments->roles->permissions manually
    const { data: roles } = await adminClient.schema("admin").from("assignment_roles").select("role_id").eq("assignment_id", assignRow.id);
    const roleIds = (roles ?? []).map((r: any) => r.role_id);
    let perms: string[] = [];
    if (roleIds.length > 0) {
      const { data: rp } = await adminClient.schema("admin").from("role_permissions").select("permission_id").in("role_id", roleIds);
      const permIds = (rp ?? []).map((x: any) => x.permission_id);
      if (permIds.length > 0) {
        const { data: p } = await adminClient.schema("admin").from("permissions").select("key").in("id", permIds);
        perms = (p ?? []).map((x: any) => x.key);
      }
    }
    hasPerm = perms.includes(requiredPermission);
    if (!hasPerm) throw forbidden(`Missing permission: ${requiredPermission}`);
    return { user, admin: { assignmentId: assignRow.id, isOwner: false, permissions: perms } };
  }

  if (requiredPermission && rows === false) throw forbidden(`Missing permission: ${requiredPermission}`);

  // If no permission requested, still return context
  return { user, admin: { assignmentId: assignRow.id, isOwner: !!assignRow.is_owner, permissions: [] } };
}

// Argon2id verification helper (uses Deno's subtle or external; here we delegate to Postgres crypt via RPC)
// In Edge Function we verify by calling a Postgres function that uses pgcrypto Argon2 extension if available, else bcrypt fallback.

export async function verifySuperKey(assignmentId: string, plaintext: string): Promise<boolean> {
  const admin = createAdminClient();
  // Attempt via RPC function admin.verify_super_key (created in migration 0011 helpers)
  // Fallback: compare via stored hash using helper
  const { data, error } = await admin.rpc("verify_super_key", { p_assignment_id: assignmentId, p_plaintext: plaintext });
  if (!error && typeof data === "boolean") return data;
  // Fallback: fetch hash and use passlib-like check (not ideal; Edge should use dedicated verify)
  console.warn("verifySuperKey fallback — ensure admin.verify_super_key exists");
  return false;
}
