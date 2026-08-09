-- 0003_profiles_auth.sql
-- Profiles, profile_stats, helpers for app_uid / referral_code

-- Profiles (extends auth.users)
create table if not exists app.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  display_name    text not null check (char_length(display_name) between 2 and 30),
  app_uid         text unique not null,
  ff_uid          text unique not null,
  in_game_name    text not null,
  whatsapp_phone  text not null,
  phone_verified  boolean not null default false,
  avatar_path     text,
  status          user_status not null default 'active',
  referral_code   text unique not null,
  referred_by     uuid references app.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_profiles_app_uid on app.profiles(app_uid);
create index if not exists idx_profiles_referral_code on app.profiles(referral_code);
create index if not exists idx_profiles_status on app.profiles(status);

comment on table app.profiles is 'App-level profile, one row per auth.users. app_uid is 4-digit display id; referral_code for referral program. whatsapp_phone is required but NOT a login factor.';
comment on column app.profiles.app_uid is '4-digit display UID generated server-side with retry on collision.';
comment on column app.profiles.referral_code is 'Unique referral code (e.g., RZ-8A3K9P) generated server-side.';

-- Aggregated stats (derived, not source of truth)
create table if not exists app.profile_stats (
  profile_id        uuid primary key references app.profiles(id) on delete cascade,
  tournaments_joined int not null default 0,
  completed_events  int not null default 0,
  wins              int not null default 0,
  top_placements    int not null default 0,
  total_kills       int not null default 0,
  total_prize_coins bigint not null default 0,
  updated_at        timestamptz not null default now()
);

comment on table app.profile_stats is 'Derived aggregated stats; updated via triggers/functions on result publication, never written directly by client.';

-- Helper: generate 4-digit app_uid with retry (caller should handle collision)
create or replace function app.generate_app_uid()
returns text
language plpgsql
as $$
declare
  uid text;
  attempts int := 0;
begin
  loop
    uid := lpad((floor(random()*9000)+1000)::int::text, 4, '0');
    -- caller checks uniqueness; this function just returns a candidate
    return uid;
    exit when attempts > 10;
    attempts := attempts + 1;
  end loop;
  return uid;
end;
$$;

-- Helper: generate referral code e.g. RZ-XXXXXX
create or replace function app.generate_referral_code()
returns text
language plpgsql
as $$
declare
  code text;
begin
  code := 'RZ-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
  return code;
end;
$$;

-- Function to atomically complete a profile (called by Edge Function or via RPC)
create or replace function app.complete_profile(
  p_user_id uuid,
  p_display_name text,
  p_ff_uid text,
  p_in_game_name text,
  p_whatsapp_phone text,
  p_avatar_path text default null,
  p_referral_code_input text default null
)
returns uuid
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_app_uid text;
  v_referral_code text;
  v_referred_by uuid;
  v_attempt int := 0;
begin
  -- idempotency: if profile already exists, return it
  if exists (select 1 from app.profiles where id = p_user_id) then
    return p_user_id;
  end if;

  -- resolve referrer if code supplied
  if p_referral_code_input is not null then
    select id into v_referred_by from app.profiles where referral_code = p_referral_code_input;
  end if;

  -- generate unique app_uid with retry
  loop
    v_app_uid := app.generate_app_uid();
    begin
      v_referral_code := app.generate_referral_code();
      insert into app.profiles (id, email, display_name, app_uid, ff_uid, in_game_name, whatsapp_phone, referral_code, referred_by, avatar_path)
      values (
        p_user_id,
        (select email from auth.users where id = p_user_id),
        p_display_name, v_app_uid, p_ff_uid, p_in_game_name, p_whatsapp_phone, v_referral_code, v_referred_by, p_avatar_path
      );
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt > 20 then raise exception 'Failed to generate unique app_uid/referral_code after 20 attempts'; end if;
    end;
  end loop;

  -- create wallet + stats rows
  insert into app.wallet_accounts (profile_id, available_balance, held_balance) values (p_user_id, 0, 0) on conflict do nothing;
  insert into app.profile_stats (profile_id) values (p_user_id) on conflict do nothing;

  -- create referral row if applicable
  if v_referred_by is not null then
    insert into app.referrals (referrer_id, referred_id, reward_status) values (v_referred_by, p_user_id, 'pending') on conflict do nothing;
  end if;

  return p_user_id;
end;
$$;

-- updated_at trigger
drop trigger if exists trg_profiles_updated_at on app.profiles;
create trigger trg_profiles_updated_at before update on app.profiles
for each row execute function public.handle_updated_at();

drop trigger if exists trg_profile_stats_updated_at on app.profile_stats;
create trigger trg_profile_stats_updated_at before update on app.profile_stats
for each row execute function public.handle_updated_at();
