import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const auth = req.headers.get("authorization") ?? "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return withCors(req, jsonError("UNAUTHORIZED" as any, "Missing token", 401));
    const jwt = m[1];
    const admin = createAdminClient();
    const { data: userData } = await admin.auth.getUser(jwt);
    if (!userData?.user) return withCors(req, jsonError("UNAUTHORIZED" as any, "Invalid token", 401));
    const url = new URL(req.url);
    const body = await req.json().catch(()=>({}) as any);
    const bucket = url.searchParams.get("bucket") ?? body.bucket;
    const path = url.searchParams.get("path") ?? body.path;
    const expires = parseInt(url.searchParams.get("expires") ?? "300");
    if (!bucket || !path) return withCors(req, jsonError("VALIDATION_ERROR" as any, "bucket and path required", 400));
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expires);
    if (error) return withCors(req, jsonError("INTERNAL" as any, error.message, 500));
    return withCors(req, new Response(JSON.stringify({ url: data.signedUrl, expires_in: expires }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, jsonError("INTERNAL" as any, String(e), 500));
  }
});
