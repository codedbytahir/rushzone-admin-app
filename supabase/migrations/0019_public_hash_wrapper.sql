-- 0019_public_hash_wrapper.sql
-- Wrappers so Edge Functions (secret key) can hash/verify Super Keys via RPC.
-- SECURITY: these are SECURITY DEFINER functions that read admin.security_credentials.
-- They must NEVER be executable by anon or authenticated — only service_role (secret key).
-- Migration 0020 additionally revokes any grants applied by the earlier version of this file.

create or replace function public.hash_super_key(p_plaintext text)
returns text
language sql
security definer
set search_path = admin, public, extensions
as $$ select admin.hash_super_key(p_plaintext); $$;
grant execute on function public.hash_super_key(text) to service_role;

create or replace function public.verify_super_key(p_assignment_id uuid, p_plaintext text)
returns boolean
language sql
security definer
set search_path = admin, public, extensions
as $$ select admin.verify_super_key(p_assignment_id, p_plaintext); $$;
grant execute on function public.verify_super_key(uuid, text) to service_role;
