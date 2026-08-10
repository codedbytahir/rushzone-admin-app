// src/lib/adminSession.ts — in-memory admin permissions for UI gating.
// This is a convenience only: every protected action is still enforced
// server-side by requireAdmin() in the edge functions.

export type AdminSession = {
  assignmentId?: string;
  isOwner: boolean;
  permissions: string[];
};

let session: AdminSession = { isOwner: false, permissions: [] };

export function setAdminSession(next: AdminSession): void {
  session = next;
}

export function getAdminSession(): AdminSession {
  return session;
}

export function clearAdminSession(): void {
  session = { isOwner: false, permissions: [] };
}

export function hasPerm(key: string): boolean {
  return session.isOwner || session.permissions.includes('*') || session.permissions.includes(key);
}
