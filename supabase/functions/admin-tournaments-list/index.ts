import { handleCors, corsHeaders, withCors } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { jsonError } from "../_shared/errors.ts";
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const { user } = await requireAdmin(req, "tournament.view");
    const admin = createAdminClient();
    const { data: caller } = await admin.schema("admin").from("assignments").select("id, status").eq("user_id", user.id).maybeSingle();
    if (!caller || caller.status !== "active") return withCors(req, jsonError("FORBIDDEN" as any, "Admin only", 403));
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const q = url.searchParams.get("q");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 100);
    const offset = parseInt(url.searchParams.get("offset") ?? "0");
    let query = admin.schema("app").from("tournaments").select("id, title, mode, map, capacity, entry_fee, prize_pool, status, reg_open_at, match_start_at, free_slot_enabled, free_slot_number, free_slot_awarded_at, cover_path, created_at", { count: "exact" }).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (status) query = query.eq("status", status);
    if (q) query = query.ilike("title", `%${q}%`);
    const { data, error, count } = await query;
    if (error) return withCors(req, jsonError("INTERNAL" as any, error.message, 500));
    const ids = (data ?? []).map((t: any)=> t.id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: regs } = await admin.schema("app").from("registrations").select("tournament_id").in("tournament_id", ids).eq("status", "confirmed");
      for (const r of (regs ?? [])) counts[r.tournament_id] = (counts[r.tournament_id] ?? 0) + 1;
    }
    const enriched = (data ?? []).map((t: any)=> ({ ...t, entry_count: counts[t.id] ?? 0 }));
    return withCors(req, new Response(JSON.stringify({ data: enriched, count }), { headers: { "Content-Type": "application/json", ...corsHeaders(req) } }));
  } catch (e) {
    return withCors(req, e instanceof Response ? e : jsonError("INTERNAL" as any, String(e), 500));
  }
});
