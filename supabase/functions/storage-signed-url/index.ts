import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const { user } = await requireAdmin(req, "reports.view");
    const admin = createAdminClient();
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
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
