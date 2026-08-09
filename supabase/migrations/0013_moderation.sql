-- 0013_moderation.sql
-- Internal notes, restrictions, risk flags

create table if not exists app.internal_notes (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references app.profiles(id) on delete cascade,
  author_id   uuid not null references auth.users(id),
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);

create index if not exists idx_notes_profile on app.internal_notes(profile_id, created_at desc);

create table if not exists app.restrictions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references app.profiles(id) on delete cascade,
  type        restriction_type not null,
  reason      text not null,
  applied_by  uuid not null references auth.users(id),
  expires_at  timestamptz,
  lifted_at   timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_restrictions_profile on app.restrictions(profile_id, created_at desc);
create index if not exists idx_restrictions_type on app.restrictions(type);

create table if not exists app.risk_flags (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references app.profiles(id) on delete cascade,
  context     text not null,
  severity    text not null default 'info' check (severity in ('info','warning','critical')),
  meta        jsonb not null default '{}',
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_risk_profile on app.risk_flags(profile_id, created_at desc);
create index if not exists idx_risk_context on app.risk_flags(context);

comment on table app.internal_notes is 'Staff-only notes per player, permission: players.restrict/support.';
comment on table app.restrictions is 'Reasoned restrictions (entry, rewards, wallet, suspend, ban) with actor/timestamp/expiry/audit.';
comment on table app.risk_flags is 'System/Edge Function generated fraud/abuse flags; reconciliation mismatches land here.';
