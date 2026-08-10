#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
F="${D}supabase/migrations/0020_security_hardening.sql"

# Write the whole file with correct PL/pgSQL. Use a quoted heredoc so bash
# does not expand the $ signs.
cat > "$F" << 'MIGEOF'
-- 0020_security_hardening.sql
-- 1. REVOKE the Super Key hash/verify functions from anon + authenticated.
--    They are SECURITY DEFINER and read admin.security_credentials; exposing them
--    gave an unauthenticated brute-force oracle with no lockout.
-- 2. Drop the tournaments audit trigger: Edge Functions already write richer audit
--    rows via writeAuditLog; the trigger duplicated (tripled) every tournament event.
-- 3. Add granular tournament permissions used by requireAdmin().

-- 1. Revoke public execution of Super Key functions
revoke execute on function public.hash_super_key(text) from anon, authenticated;
revoke execute on function public.verify_super_key(uuid, text) from anon, authenticated;

-- 2. Remove duplicate audit trigger on tournaments (audit comes from Edge Functions)
drop trigger if exists trg_tournaments_audit on app.tournaments;

-- 3. Granular tournament permissions (least privilege)
insert into admin.permissions (key, name) values
  ('tournament.view', 'View Tournaments & Entrants'),
  ('tournament.roster', 'Assign Internal Rosters')
on conflict (key) do nothing;

do $$
declare
  rec record;
begin
  for rec in
    select r.id as rid, p.id as pid
    from admin.roles r
    cross join admin.permissions p
    where (r.key = 'tournament_manager' and p.key in ('tournament.view', 'tournament.roster'))
       or (r.key = 'room_ops' and p.key in ('tournament.view', 'tournament.roster'))
  loop
    insert into admin.role_permissions (role_id, permission_id) values (rec.rid, rec.pid)
    on conflict do nothing;
  end loop;
end $$;

comment on function public.verify_super_key(uuid, text) is 'SECURITY DEFINER - service_role only. Super Key verification must go through admin-auth-verify edge function (lockout + audit).';
MIGEOF

echo '=== rewritten ==='
grep -n '\$\$' "$F"
echo '=== head/tail ==='
head -5 "$F"
tail -3 "$F"
