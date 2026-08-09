-- 0006_results_prizes.sql
-- Match results, prize awards, publish/correction

create table if not exists app.match_results (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references app.tournaments(id) on delete cascade,
  profile_id     uuid not null references app.profiles(id) on delete cascade,
  kills          int not null default 0 check (kills >= 0),
  placement      int check (placement > 0),
  points         int not null default 0,
  is_dq          boolean not null default false,
  prize_coins    bigint not null default 0 check (prize_coins >= 0),
  status         result_status not null default 'draft',
  published_at   timestamptz,
  published_by   uuid references auth.users(id),
  corrected_from uuid references app.match_results(id),
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (tournament_id, profile_id)
);

create index if not exists idx_results_tournament_placement on app.match_results (tournament_id, placement);
create index if not exists idx_results_profile on app.match_results(profile_id);

create table if not exists app.prize_awards (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references app.tournaments(id) on delete cascade,
  profile_id    uuid not null references app.profiles(id) on delete cascade,
  result_id     uuid not null references app.match_results(id) on delete cascade,
  amount        bigint not null check (amount > 0),
  ledger_id     uuid references app.wallet_ledger(id),
  created_at    timestamptz not null default now(),
  unique (result_id)
);

create index if not exists idx_prize_tournament on app.prize_awards(tournament_id);
create index if not exists idx_prize_profile on app.prize_awards(profile_id);

comment on table app.match_results is 'Official per-participant results. Drafts invisible to players. Published rows are locked; corrections are new rows referencing corrected_from.';
comment on table app.prize_awards is 'Prize award linked to result + ledger credit. One award per result.';

drop trigger if exists trg_results_updated_at on app.match_results;
create trigger trg_results_updated_at before update on app.match_results
for each row execute function public.handle_updated_at();

-- Publish results: atomic orchestration
-- Called by Edge Function admin/results/publish with admin authz already verified
create or replace function app.publish_results(
  p_tournament_id uuid,
  p_published_by uuid
)
returns int
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_count int := 0;
  r app.match_results%rowtype;
  v_ledger_id uuid;
begin
  -- tournament must be in results_pending/live with at least one result draft
  if not exists (select 1 from app.tournaments where id = p_tournament_id and status in ('results_pending','live','room_released')) then
    raise exception 'TOURNAMENT_NOT_IN_RESULTS_PENDING';
  end if;

  -- lock draft rows
  for r in select * from app.match_results where tournament_id = p_tournament_id and status='draft' for update loop
    -- compute prize_coins should already be set by admin (or via preview); here we just credit what admin entered
    -- update row to published
    update app.match_results set status='published', published_at=now(), published_by=p_published_by where id=r.id;

    if r.prize_coins > 0 then
      -- credit prize via ledger
      perform app.wallet_credit(r.profile_id, r.prize_coins, 'prize_award', 'tournament', p_tournament_id, 'prize:'||p_tournament_id::text||':'||r.profile_id::text, p_published_by);
      -- get latest ledger id for this profile+badge
      select id into v_ledger_id from app.wallet_ledger where profile_id=r.profile_id and reference_type='tournament' and reference_id=p_tournament_id order by created_at desc limit 1;
      insert into app.prize_awards (tournament_id, profile_id, result_id, amount, ledger_id)
      values (p_tournament_id, r.profile_id, r.id, r.prize_coins, v_ledger_id)
      on conflict do nothing;

      -- update stats
      insert into app.profile_stats (profile_id) values (r.profile_id) on conflict (profile_id) do nothing;
      update app.profile_stats set
        completed_events = completed_events + 1,
        wins = wins + case when r.placement = 1 then 1 else 0 end,
        top_placements = top_placements + case when r.placement is not null and r.placement <= 3 then 1 else 0 end,
        total_kills = total_kills + r.kills,
        total_prize_coins = total_prize_coins + r.prize_coins,
        updated_at = now()
      where profile_id = r.profile_id;
    else
      insert into app.profile_stats (profile_id) values (r.profile_id) on conflict (profile_id) do nothing;
      update app.profile_stats set
        completed_events = completed_events + 1,
        total_kills = total_kills + r.kills,
        updated_at = now()
      where profile_id = r.profile_id;
    end if;

    v_count := v_count + 1;
  end loop;

  -- flip tournament to completed if all published
  if not exists (select 1 from app.match_results where tournament_id=p_tournament_id and status='draft') then
    update app.tournaments set status='completed', updated_at=now() where id=p_tournament_id;
  end if;

  return v_count;
end;
$$;

-- Correction: requires new rows; original rows marked corrected/void and compensating ledger if prize changes
create or replace function app.correct_result(
  p_result_id uuid,
  p_new_kills int,
  p_new_placement int,
  p_new_points int,
  p_new_prize bigint,
  p_corrected_by uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_old app.match_results%rowtype;
  v_new_id uuid;
  v_diff bigint;
begin
  select * into v_old from app.match_results where id=p_result_id for update;
  if not found then raise exception 'RESULT_NOT_FOUND'; end if;
  if v_old.status != 'published' then raise exception 'ONLY_PUBLISHED_CAN_BE_CORRECTED'; end if;

  v_diff := p_new_prize - v_old.prize_coins;

  -- mark old as corrected
  update app.match_results set status='corrected' where id=p_result_id;

  -- create new corrected row
  insert into app.match_results (tournament_id, profile_id, kills, placement, points, is_dq, prize_coins, status, corrected_from, notes, published_by, published_at)
  values (v_old.tournament_id, v_old.profile_id, p_new_kills, p_new_placement, p_new_points, v_old.is_dq, p_new_prize, 'published', p_result_id, p_reason, p_corrected_by, now())
  returning id into v_new_id;

  -- compensating ledger if prize changed
  if v_diff > 0 then
    perform app.wallet_credit(v_old.profile_id, v_diff, 'prize_award', 'tournament', v_old.tournament_id, 'prize_correct_up:'||v_new_id::text, p_corrected_by, 'Correction: '||p_reason);
  elsif v_diff < 0 then
    perform app.wallet_debit(v_old.profile_id, -v_diff, 'prize_award', 'tournament', v_old.tournament_id, 'prize_correct_down:'||v_new_id::text, p_corrected_by, 'Correction debit: '||p_reason);
  end if;

  -- adjust stats diff
  if v_diff != 0 or p_new_kills != v_old.kills then
    update app.profile_stats set
      total_kills = total_kills - v_old.kills + p_new_kills,
      total_prize_coins = total_prize_coins + v_diff,
      wins = wins + case when p_new_placement=1 and v_old.placement !=1 then 1 when p_new_placement !=1 and v_old.placement=1 then -1 else 0 end,
      updated_at = now()
    where profile_id = v_old.profile_id;
  end if;

  return v_new_id;
end;
$$;
