// _shared/supabase.ts — Two Supabase clients (user + admin) per 03-edge-function-conventions.md

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SECRET_KEY = Deno.env.get("SUPABASE_SECRET_KEY")!;
const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.warn("Missing SUPABASE_URL / SUPABASE_SECRET_KEY env");
}

/** Privileged client (bypasses RLS) — only after authz check */
export function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** User-context client (RLS applies) — validates caller JWT */
export function createUserClient(jwt: string) {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export { SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY };
