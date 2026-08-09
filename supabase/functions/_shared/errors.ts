// _shared/errors.ts — Standard error shape { error: { code, message, retryable } }

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "IDEMPOTENCY_REQUIRED"
  | "INSUFFICIENT_BALANCE"
  | "INSUFFICIENT_BALANCE_FOR_HOLD"
  | "INSUFFICIENT_HELD_BALANCE"
  | "TOURNAMENT_NOT_FOUND"
  | "TOURNAMENT_FULL"
  | "ALREADY_REGISTERED"
  | "REGISTRATION_NOT_OPEN"
  | "PROFILE_NOT_ELIGIBLE"
  | "CAMPAIGN_NOT_FOUND"
  | "CAMPAIGN_NOT_ACTIVE"
  | "DAILY_CAP_REACHED"
  | "GLOBAL_CAP_REACHED"
  | "COOLDOWN_ACTIVE"
  | "TOURNAMENT_NOT_IN_RESULTS_PENDING"
  | "ADMIN_NOT_FOUND"
  | "SUPER_KEY_INVALID"
  | "SUPER_KEY_LOCKED"
  | "RATE_LIMITED"
  | "INTERNAL";

export function jsonError(code: ErrorCode, message: string, status = 400, retryable = false, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: { code, message, retryable } }), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export function unauthorized(msg = "Unauthorized") { return jsonError("UNAUTHORIZED", msg, 401); }
export function forbidden(msg = "Forbidden") { return jsonError("FORBIDDEN", msg, 403); }
export function notFound(msg = "Not found") { return jsonError("NOT_FOUND", msg, 404); }
export function badRequest(code: ErrorCode, msg: string) { return jsonError(code, msg, 400); }
