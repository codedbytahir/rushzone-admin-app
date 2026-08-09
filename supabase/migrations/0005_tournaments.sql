-- 0005_tournaments.sql
-- Tournaments, registrations, rosters, rooms

create table if not exists app.tournaments (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  description         text,
  internal_notes      text,
  cover_path          text,
  mode                text not null check (mode in ('solo','duo','squad','custom')),
  map                 text,
  rounds              int not null default 1 check (rounds between 1 and 20),
  capacity            int not null check (capacity > 0 and capacity <= 500),
  entry_fee           bigint not null default 0 check (entry_fee >= 0),
  prize_pool          bigint not null default 0 check (prize_pool >= 0),
  prize_distribution  jsonb not null default '[]',
  score_rules         jsonb not null default '{}',
  rules_text          text,
  status              tournament_status not null default 'draft',
  reg_open_at         timestamptz,
  reg_close_at        timestamptz,
  match_start_at      timestamptz,
  room_release_at     timestamptz,
  result_expected_at  timestamptz,
  is_preset           boolean not null default false,
  preset_key          text,
  free_slot_enabled   boolean not null default false,
  free_slot_trigger   text not null default 'slots_full' check (free_slot_trigger in ('slots_full','match_start')),
  free_slot_number    int,
  free_slot_awarded_at timestamptz,
  created_by          uuid references auth.users(id),
  published_at        timestamptz,
  cancelled_reason    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_tournaments_status on app.tournaments(status);
create index if not exists idx_tournaments_match_start on app.tournaments(match_start_at);
create index if not exists idx_tournaments_preset on app.tournaments(is_preset) where is_preset = true;
create index if not exists idx_tournaments_created_by on app.tournaments(created_by);

comment on table app.tournaments is 'Central event table. Lifecycle: draft->scheduled->registration_open->registration_full/closed->room_released->live->results_pending->completed/cancelled. Entry fee snapshotted per registration.';

-- Rosters (internal grouping for Duo/Squad)
create table if not exists app.rosters (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references app.tournaments(id) on delete cascade,
  label         text not null,
  capacity      int not null check (capacity > 0),
  created_at    timestamptz not null default now()
);

create index if not exists idx_rosters_tournament on app.rosters(tournament_id);

comment on table app.rosters is 'Internal roster/lobby grouping. Membership is via registrations.roster_id; players cannot self-assign.';

-- Registrations
create table if not exists app.registrations (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references app.tournaments(id) on delete cascade,
  profile_id     uuid not null references app.profiles(id) on delete cascade,
  status         reg_status not null default 'confirmed',
  slot_number    int,
  fee_snapshot   bigint not null,
  roster_id      uuid references app.rosters(id),
  idempotency_key text unique,
  created_at     timestamptz not null default now(),
  unique (tournament_id, profile_id)
);

create index if not exists idx_registrations_tournament_slot on app.registrations (tournament_id, slot_number);
create index if not exists idx_registrations_profile on app.registrations(profile_id);
create index if not exists idx_registrations_roster on app.registrations(roster_id);

comment on table app.registrations is 'Individual entry; unique per tournament+profile; fee_snapshot preserves price at join time.';

-- Rooms (restricted)
create table if not exists app.rooms (
  tournament_id uuid primary key references app.tournaments(id) on delete cascade,
  room_id       text not null,
  room_password text not null,
  server_region text,
  instructions  text,
  release_at    timestamptz not null,
  released_at   timestamptz,
  released_by   uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

comment on table app.rooms is 'Restricted credentials. Never exposed via RLS to players; delivered via Edge Function after eligibility + released_at check.';

-- updated_at triggers
drop trigger if exists trg_tournaments_updated_at on app.tournaments;
create trigger trg_tournaments_updated_at before update on app.tournaments
for each row execute function public.handle_updated_at();

-- Helper: next available slot
create or replace function app.next_slot_number(p_tournament_id uuid)
returns int
language sql
as $$
  select coalesce(max(slot_number), 0) + 1 from app.registrations where tournament_id = p_tournament_id and status = 'confirmed';
$$;

-- RPC: register for tournament (atomic: eligibility + slot + debit + insert)
create or replace function app.register_for_tournament(
  p_tournament_id uuid,
  p_profile_id uuid,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_tournament app.tournaments%rowtype;
  v_fee bigint;
  v_slot int;
  v_reg_id uuid;
begin
  -- idempotency
  select id into v_reg_id from app.registrations where idempotency_key = p_idempotency_key;
  if found then return v_reg_id; end if;

  select * into v_tournament from app.tournaments where id = p_tournament_id for update;

  if not found then raise exception 'TOURNAMENT_NOT_FOUND'; end if;
  if v_tournament.status not in ('registration_open','scheduled') then
    -- allow registration_open only; but also handle registration_full check below
    if v_tournament.status not in ('registration_open','registration_full','registration_closed','scheduled') then
      raise exception 'REGISTRATION_NOT_OPEN: status=%', v_tournament.status;
    end if;
  end if;

  if v_tournament.status = 'registration_full' then
    raise exception 'TOURNAMENT_FULL';
  end if;

  -- capacity check
  if (select count(*) from app.registrations where tournament_id = p_tournament_id and status='confirmed') >= v_tournament.capacity then
    raise exception 'TOURNAMENT_FULL';
  end if;

  -- duplicate
  if exists (select 1 from app.registrations where tournament_id = p_tournament_id and profile_id = p_profile_id and status='confirmed') then
    raise exception 'ALREADY_REGISTERED';
  end if;

  -- profile eligibility (active only)
  if exists (select 1 from app.profiles where id = p_profile_id and status != 'active') then
    raise exception 'PROFILE_NOT_ELIGIBLE';
  end if;

  -- wallet check + debit
  v_fee := v_tournament.entry_fee;
  if v_fee > 0 then
    perform app.wallet_debit(p_profile_id, v_fee, 'tournament_entry', 'tournament', p_tournament_id, p_idempotency_key || ':debit');
  end if;

  v_slot := app.next_slot_number(p_tournament_id);

  insert into app.registrations (tournament_id, profile_id, slot_number, fee_snapshot, idempotency_key)
  values (p_tournament_id, p_profile_id, v_slot, v_fee, p_idempotency_key)
  returning id into v_reg_id;

  -- free slot auto-award if enabled and trigger is slots_full
  if v_tournament.free_slot_enabled and v_tournament.free_slot_trigger = 'slots_full' then
    if (select count(*) from app.registrations where tournament_id = p_tournament_id and status='confirmed') = v_tournament.capacity then
      perform app.award_free_slot(p_tournament_id);
    end if;
  end if;

  return v_reg_id;
end;
$$;

-- Helper: award free slot (random among confirmed, creates slot_refund credit)
create or replace function app.award_free_slot(p_tournament_id uuid)
returns uuid
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_winner_reg app.registrations%rowtype;
  v_slot int;
begin
  -- already awarded?
  if exists (select 1 from app.tournaments where id = p_tournament_id and free_slot_awarded_at is not null) then
    return null;
  end if;

  -- pick random confirmed registration
  select * into v_winner_reg from app.registrations
  where tournament_id = p_tournament_id and status='confirmed'
  order by random() limit 1 for update;

  if not found then return null; end if;

  v_slot := v_winner_reg.slot_number;

  -- credit refund
  perform app.wallet_credit(v_winner_reg.profile_id, v_winner_reg.fee_snapshot, 'slot_refund', 'tournament', p_tournament_id, 'slot_refund:'||p_tournament_id::text||':'||v_winner_reg.profile_id::text);

  update app.tournaments set free_slot_number = v_slot, free_slot_awarded_at = now() where id = p_tournament_id;

  return v_winner_reg.profile_id;
end;
$$;
