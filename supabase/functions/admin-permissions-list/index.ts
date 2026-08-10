import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { requireOwner } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    await requireOwner(req);
    const admin = createAdminClient();
    const { data } = await admin.schema("admin").from("permissions").select("id, key, name").order("key");
    return withCors(req, new Response(JSON.stringify({ data: data ?? [] }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
