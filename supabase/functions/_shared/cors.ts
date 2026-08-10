// _shared/cors.ts — CORS for Edge Functions.
// The app sends its Supabase JWT in the Authorization header (no cookies), so we
// simply echo the request Origin back — this allows ANY web origin (Expo web,
// CodeSandbox, localhost, preview URLs) plus the native app schemes. Do NOT filter
// to a fixed allowlist: that breaks legitimate web previews and forces redeploys
// whenever a new origin appears.
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowOrigin = origin && origin !== "null" ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key, x-request-id, x-bootstrap-secret",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  return null;
}
export function withCors(req: Request, res: Response): Response {
  const headers = corsHeaders(req);
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}
