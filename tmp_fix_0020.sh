#!/bin/bash
cd /project/workspace
D=$(echo rushzone*/)
F="${D}supabase/migrations/0020_security_hardening.sql"
cat > /tmp/fix-0020.cjs << 'SCRIPTEOF'
const fs = require('fs');
const f = process.argv[2];
let s = fs.readFileSync(f, 'utf8');
const old = `do $$
declare
  r record; p record;
begin
  for r, p in
    select r.id as rid, p.id as pid
    from admin.roles r
    cross join admin.permissions p
    where (r.key = 'tournament_manager' and p.key in ('tournament.view', 'tournament.roster'))
       or (r.key = 'room_ops' and p.key in ('tournament.view', 'tournament.roster'))
  loop
    insert into admin.role_permissions (role_id, permission_id) values (r.rid, p.pid)
    on conflict do nothing;
  end loop;
end $$;`;
const add = `do $$
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
end $$;`;
if (s.includes(old)) { s = s.replace(old, add); fs.writeFileSync(f, s); console.log('0020 fixed'); } else console.log('pattern MISS');
SCRIPTEOF
node /tmp/fix-0020.cjs "$F"
echo '=== verify ==='
grep -n -A 3 'for rec in' "$F"
