// _shared/idempotency.ts — Idempotency-Key helper

export function getIdempotencyKey(req: Request, required = true): string | null {
  const key = req.headers.get("idempotency-key") ?? req.headers.get("Idempotency-Key") ?? req.headers.get("x-idempotency-key");
  if (!key && required) {
    throw new Response(
      JSON.stringify({ error: { code: "IDEMPOTENCY_REQUIRED", message: "Idempotency-Key header required (UUID v4)", retryable: false } }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (key && !/^[0-9a-fA-F-]{36}$/.test(key) && key.length < 8) {
    // allow non-UUID but warn
    console.warn("Idempotency-Key is not UUID v4:", key);
  }
  return key;
}

export function idempotentResponse<T>(key: string, data: T, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Idempotency-Key": key, ...headers },
  });
}
