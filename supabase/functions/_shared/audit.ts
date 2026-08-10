// _shared/audit.ts — Immutable audit writer (secret key only)
// Writes EXACTLY ONE row per call. Do not also call audit.write_log() here — that
// duplicates rows. Edge Functions call writeAuditLog once per audited action.

import { createAdminClient } from "./supabase.ts";

export async function writeAuditLog(params: {
  actorId: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  reason?: string | null;
  before?: any;
  after?: any;
  ip?: string | null;
}) {
  const admin = createAdminClient();
  const { error } = await admin.schema("audit").from("logs").insert({
    actor_id: params.actorId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    reason: params.reason,
    before: params.before,
    after: params.after,
    ip: params.ip,
  });
  if (error) console.error("audit write failed", error);
}

export async function writeAuditWithRequest(
  req: Request,
  action: string,
  meta: Omit<Parameters<typeof writeAuditLog>[0], "actorId" | "action" | "ip"> & { actorId: string | null }
) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  return writeAuditLog({ ...meta, action, ip });
}
