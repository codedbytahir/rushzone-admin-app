// _shared/cors.ts — CORS preflight + allowed origins for Rush Zone Control
// Allowed: Expo dev, production APK schemes, and preview hosts (https://*.e2b.app)

const ALLOWED_ORIGINS = [
  "rushzone://",
  "rushzonecontrol://",
  "exp://",
  "http://localhost:3000",
  "http://localhost:19006",
  "http://localhost:54323",
];

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  // Allow preview hosts for Arena/E2B
  const isPreview = /\.e2b\.app$/.test(new URL(origin || "http://x").hostname) || origin.includes("localhost");
  const isAllowed = ALLOWED_ORIGINS.some((o) => origin.startsWith(o)) || isPreview || !origin;

  return {
    "Access-Control-Allow-Origin": isAllowed && origin ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key, x-request-id",
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
