-- 0011_admin_rbac.sql
-- Admin RBAC: roles, permissions, assignments, credentials (Argon2id), sessions

create table if not exists admin.roles (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  name        text not null,
  is_owner    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists admin.permissions (
  id     uuid primary key default gen_random_uuid(),
  key    text unique not null,
  name   text not null,
  created_at timestamptz not null default now()
);

create table if not exists admin.role_permissions (
  role_id       uuid not null references admin.roles(id) on delete cascade,
  permission_id uuid not null references admin.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists admin.assignments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade unique,
  status       admin_status not null default 'pending',
  is_owner     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists admin.assignment_roles (
  assignment_id uuid not null references admin.assignments(id) on delete cascade,
  role_id       uuid not null references admin.roles(id) on delete cascade,
  primary key (assignment_id, role_id)
);

create table if not exists admin.security_credentials (
  assignment_id  uuid primary key references admin.assignments(id) on delete cascade,
  key_hash       text not null,
  key_version    int not null default 1,
  status         key_status not null default 'pending',
  failed_attempts int not null default 0,
  locked_until   timestamptz,
  last_used_at   timestamptz,
  rotated_at     timestamptz,
  issued_by      uuid references auth.users(id),
  created_at     timestamptz not null default now()
);

create table if not exists admin.sessions (
  id           uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references admin.assignments(id) on delete cascade,
  device       text,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  revoked_at   timestamptz
);

create index if not exists idx_assignments_status on admin.assignments(status);
create index if not exists idx_assignments_user on admin.assignments(user_id);
create index if not exists idx_sessions_assignment on admin.sessions(assignment_id, created_at desc);
create index if not exists idx_credentials_status on admin.security_credentials(status);

comment on table admin.roles is 'Named role groups (e.g., tournament_manager). Maps to permission keys via role_permissions.';
comment on table admin.permissions is 'Granular capability keys: tournament.create, withdrawal.pay, cash_ops.toggle, etc.';
comment on table admin.security_credentials is 'Super Key stored ONLY as Argon2id hash. Plaintext shown once at generation via Edge Function response.';
comment on table admin.assignments is 'One row per staff user. Status controls login ability.';

drop trigger if exists trg_assignments_updated_at on admin.assignments;
create trigger trg_assignments_updated_at before update on admin.assignments for each row execute function public.handle_updated_at();

-- Helper view: expand permissions for an assignment (used by Edge Functions, not RLS)
create or replace view admin.assignment_permissions as
select
  a.id as assignment_id,
  a.user_id,
  a.is_owner,
  coalesce(string_agg(p.key, ','), '') as permission_keys
from admin.assignments a
left join admin.assignment_roles ar on ar.assignment_id = a.id
left join admin.role_permissions rp on rp.role_id = ar.role_id
left join admin.permissions p on p.id = rp.permission_id
where a.status = 'active'
group by a.id, a.user_id, a.is_owner;

comment on view admin.assignment_permissions is 'Convenience view for Edge Function RBAC checks; not granted to client roles.';

-- Function to check permission efficiently (used inside Edge Functions via RPC if desired)
create or replace function admin.has_permission(p_user_id uuid, p_permission_key text)
returns boolean
language sql
security definer
set search_path = admin, public
as $$
  select exists (
    select 1
    from admin.assignments a
    join admin.assignment_roles ar on ar.assignment_id = a.id
    join admin.role_permissions rp on rp.role_id = ar.role_id
    join admin.permissions p on p.id = rp.permission_id
    where a.user_id = p_user_id and a.status='active' and p.key = p_permission_key
  ) or exists (select 1 from admin.assignments where user_id = p_user_id and status='active' and is_owner = true);
$$;
