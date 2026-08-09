-- 0009_streaks_referrals.sql
-- Streaks, referrals, share events

create table if not exists app.streak_days (
  profile_id   uuid not null references app.profiles(id) on delete cascade,
  day          date not null,
  intensity    smallint not null default 0 check (intensity between 0 and 4),
  source_events jsonb not null default '[]',
  created_at   timestamptz not null default now(),
  primary key (profile_id, day)
);

create table if not exists app.streak_milestones (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references app.profiles(id) on delete cascade,
  day_count    int not null,
  reward_coins bigint not null check (reward_coins >= 0),
  ledger_id    uuid references app.wallet_ledger(id),
  claimed_at   timestamptz not null default now(),
  unique (profile_id, day_count)
);

create table if not exists app.streak_freezes (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references app.profiles(id) on delete cascade,
  balance     int not null default 0 check (balance >= 0),
  consumed_on date,
  created_at  timestamptz not null default now()
);

create table if not exists app.referrals (
  id             uuid primary key default gen_random_uuid(),
  referrer_id    uuid not null references app.profiles(id) on delete cascade,
  referred_id    uuid not null references app.profiles(id) on delete cascade,
  qualified_at   timestamptz,
  reward_status  text not null default 'pending' check (reward_status in ('pending','rewarded','held','rejected')),
  referrer_ledger_id uuid references app.wallet_ledger(id),
  referred_ledger_id uuid references app.wallet_ledger(id),
  risk_flags     jsonb not null default '[]',
  created_at     timestamptz not null default now(),
  unique (referred_id)
);

create index if not exists idx_referrals_referrer on app.referrals(referrer_id);

create table if not exists app.card_share_events (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references app.profiles(id) on delete cascade,
  card_type    text not null check (card_type in ('result','win','prize','streak','spin','referral','profile')),
  channel      text,
  ref_type     text,
  ref_id       uuid,
  created_at   timestamptz not null default now()
);

create index if not exists idx_share_profile on app.card_share_events(profile_id, created_at desc);

comment on table app.streak_days is 'Per-PKT-day streak intensity. Source events appended by Edge Functions.';
comment on table app.referrals is 'One row per referred user. Unique on referred_id. Reward held/rejected if anti-fraud flags.';
