// _shared/auth.ts — requireUser (any authenticated user) + requireAdmin (RBAC) + requireOwner
// Every protected admin Edge Function must call requireAdmin(req, "<permission>") BEFORE using
// the secret-key client. Hiding a button in the UI is never authorization.

import { createAdminClient } from "./supabase.ts";
import { unauthorized, forbidden } from "./errors.ts";

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

export type AdminContext = {
  assignmentId: string;
  isOwner: boolean;
  permissions: string[];
};

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // matches admin-auth-verify session expiry

// Resolve the caller's admin context: active assignment, credential not revoked/locked,
// a live admin session (non-revoked, non-expired; expiry slides while actively used),
// and (when requiredPermission is given) the exact permission key from admin.role_permissions.
export async function requireAdmin(
  req: Request,
  requiredPermission?: string
): Promise<{ user: AuthUser; admin: AdminContext }> {
  const user = await requireUser(req);
  const admin = createAdminClient();

  const { data: a } = await admin
    .schema("admin")
    .from("assignments")
    .select("id, status, is_owner")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!a || a.status !== "active") throw forbidden("Unable to verify admin access.");

  const { data: cred } = await admin
    .schema("admin")
    .from("security_credentials")
    .select("status, locked_until")
    .eq("assignment_id", a.id)
    .maybeSingle();
  if (cred?.status === "revoked") throw forbidden("Unable to verify admin access.");
  if (cred?.status === "locked" && cred.locked_until && new Date(cred.locked_until) > new Date()) {
    throw forbidden("Admin access temporarily locked. Contact the Owner.");
  }

  // Session enforcement: a revoked key or a revoked/expired session cuts off access
  // even though the Supabase JWT is still valid.
  const now = new Date().toISOString();
  const { data: session } = await admin
    .schema("admin")
    .from("sessions")
    .select("id")
    .eq("assignment_id", a.id)
    .is("revoked_at", null)
    .gt("expires_at", now)
    .limit(1)
    .maybeSingle();
  if (!session) throw forbidden("Admin session expired. Sign in again.");

  // Slide the session expiry so an actively-used admin session is not cut mid-workflow.
  await admin
    .schema("admin")
    .from("sessions")
    .update({ expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString() })
    .eq("id", session.id);

  if (a.is_owner) {
    return { user, admin: { assignmentId: a.id, isOwner: true, permissions: ["*"] } };
  }

  const { data: v } = await admin
    .schema("admin")
    .from("assignment_permissions")
    .select("permission_keys")
    .eq("assignment_id", a.id)
    .maybeSingle();
  const permissions = (v?.permission_keys ?? "").split(",").filter(Boolean);

  if (requiredPermission && !permissions.includes(requiredPermission)) {
    throw forbidden(`Missing permission: ${requiredPermission}`);
  }

  return { user, admin: { assignmentId: a.id, isOwner: false, permissions } };
}

// Owner-only gate (Owner has is_owner=true, which bypasses role permissions).
export async function requireOwner(req: Request): Promise<{ user: AuthUser; admin: AdminContext }> {
  const ctx = await requireAdmin(req, "admins.manage");
  if (!ctx.admin.isOwner) throw forbidden("Owner only");
  return ctx;
}
