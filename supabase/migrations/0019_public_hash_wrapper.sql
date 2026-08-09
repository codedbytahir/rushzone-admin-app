create or replace function public.hash_super_key(p_plaintext text)
returns text
language sql
security definer
set search_path = admin, public, extensions
as $$ select admin.hash_super_key(p_plaintext); $$;
grant execute on function public.hash_super_key(text) to anon, authenticated, service_role;
create or replace function public.verify_super_key(p_assignment_id uuid, p_plaintext text)
returns boolean
language sql
security definer
set search_path = admin, public, extensions
as $$ select admin.verify_super_key(p_assignment_id, p_plaintext); $$;
grant execute on function public.verify_super_key(uuid, text) to anon, authenticated, service_role;
