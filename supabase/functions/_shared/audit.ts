// _shared/audit.ts — Immutable audit writer (secret key only)

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
  // Also try RPC for callers that prefer it (audit.write_log)
  try {
    await admin.rpc("write_log", {
      p_actor_id: params.actorId,
      p_action: params.action,
      p_entity_type: params.entityType ?? null,
      p_entity_id: params.entityId ?? null,
      p_reason: params.reason ?? null,
      p_before: params.before ?? null,
      p_after: params.after ?? null,
    } as any);
  } catch (_) { /* ignore */ }
}

export async function writeAuditWithRequest(req: Request, action: string, meta: Omit<Parameters<typeof writeAuditLog>[0], "actorId" | "action" | "ip"> & { actorId: string | null }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  return writeAuditLog({ ...meta, action, ip });
}
