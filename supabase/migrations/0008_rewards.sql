-- 0008_rewards.sql
-- Reward campaigns, items, attempts

create table if not exists app.reward_campaigns (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  status         reward_campaign_status not null default 'active',
  starts_at      timestamptz,
  ends_at        timestamptz,
  ad_enabled     boolean not null default true,
  paid_enabled   boolean not null default true,
  paid_cost      bigint not null default 5 check (paid_cost >= 0),
  daily_cap      int check (daily_cap is null or daily_cap > 0),
  cooldown_secs  int not null default 0 check (cooldown_secs >= 0),
  global_cap     int check (global_cap is null or global_cap > 0),
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists app.reward_items (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references app.reward_campaigns(id) on delete cascade,
  coins        bigint not null check (coins >= 0),
  weight       int not null check (weight > 0),
  created_at   timestamptz not null default now()
);

create index if not exists idx_reward_items_campaign on app.reward_items(campaign_id);

create table if not exists app.reward_attempts (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references app.reward_campaigns(id) on delete cascade,
  profile_id   uuid not null references app.profiles(id) on delete cascade,
  source       reward_source not null,
  ad_provider  text,
  ad_token     text,
  item_id      uuid references app.reward_items(id),
  coins_won    bigint not null default 0 check (coins_won >= 0),
  ledger_id    uuid references app.wallet_ledger(id),
  risk_flags   jsonb not null default '[]',
  idempotency_key text unique,
  created_at   timestamptz not null default now()
);

create index if not exists idx_reward_attempts_campaign_profile on app.reward_attempts(campaign_id, profile_id);
create index if not exists idx_reward_attempts_profile_created on app.reward_attempts(profile_id, created_at desc);

comment on table app.reward_campaigns is 'Spin Wheel campaign config. Controls caps, costs, active window, status.';
comment on table app.reward_items is 'Weighted prize items per campaign. Server-side selection.';
comment on table app.reward_attempts is 'Immutable attempt history; each links to ledger if coins won.';

drop trigger if exists trg_reward_campaigns_updated_at on app.reward_campaigns;
create trigger trg_reward_campaigns_updated_at before update on app.reward_campaigns
for each row execute function public.handle_updated_at();

-- Server-side weighted random selection (called inside paid attempt transaction and SSV callback)
create or replace function app.pick_reward_item(p_campaign_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_total_weight int;
  v_rand int;
  v_running int := 0;
  r record;
begin
  select coalesce(sum(weight),0) into v_total_weight from app.reward_items where campaign_id = p_campaign_id;
  if v_total_weight = 0 then return null; end if;
  v_rand := floor(random() * v_total_weight)::int + 1;
  for r in select id, weight from app.reward_items where campaign_id = p_campaign_id order by id loop
    v_running := v_running + r.weight;
    if v_rand <= v_running then return r.id; end if;
  end loop;
  return null;
end;
$$;

-- Paid attempt: debit cost + pick item + credit award atomically
create or replace function app.reward_paid_attempt(
  p_campaign_id uuid,
  p_profile_id uuid,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_campaign app.reward_campaigns%rowtype;
  v_item_id uuid;
  v_coins bigint;
  v_attempt_id uuid;
begin
  -- idempotency
  select id into v_attempt_id from app.reward_attempts where idempotency_key = p_idempotency_key;
  if found then return v_attempt_id; end if;

  select * into v_campaign from app.reward_campaigns where id = p_campaign_id for update;
  if not found then raise exception 'CAMPAIGN_NOT_FOUND'; end if;
  if v_campaign.status != 'active' then raise exception 'CAMPAIGN_NOT_ACTIVE'; end if;
  if not v_campaign.paid_enabled then raise exception 'PAID_ATTEMPTS_DISABLED'; end if;

  -- caps: daily cap check (simplified: count today)
  if v_campaign.daily_cap is not null then
    if (select count(*) from app.reward_attempts where campaign_id=p_campaign_id and profile_id=p_profile_id and created_at >= date_trunc('day', now())) >= v_campaign.daily_cap then
      raise exception 'DAILY_CAP_REACHED';
    end if;
  end if;

  if v_campaign.global_cap is not null then
    if (select count(*) from app.reward_attempts where campaign_id=p_campaign_id) >= v_campaign.global_cap then
      raise exception 'GLOBAL_CAP_REACHED';
    end if;
  end if;

  -- cooldown (check last attempt)
  if v_campaign.cooldown_secs > 0 then
    if exists (select 1 from app.reward_attempts where campaign_id=p_campaign_id and profile_id=p_profile_id and created_at > now() - make_interval(secs => v_campaign.cooldown_secs)) then
      raise exception 'COOLDOWN_ACTIVE';
    end if;
  end if;

  -- debit cost
  perform app.wallet_debit(p_profile_id, v_campaign.paid_cost, 'reward_cost', 'reward_campaign', p_campaign_id, p_idempotency_key||':cost');

  -- pick weighted item
  v_item_id := app.pick_reward_item(p_campaign_id);
  if v_item_id is null then raise exception 'NO_REWARD_ITEMS'; end if;
  select coins into v_coins from app.reward_items where id=v_item_id;

  -- credit if coins >0
  if v_coins > 0 then
    perform app.wallet_credit(p_profile_id, v_coins, 'reward_award', 'reward_campaign', p_campaign_id, p_idempotency_key||':award');
  end if;

  insert into app.reward_attempts (campaign_id, profile_id, source, item_id, coins_won, idempotency_key, ledger_id)
  values (p_campaign_id, p_profile_id, 'paid', v_item_id, v_coins, p_idempotency_key,
    case when v_coins>0 then (select id from app.wallet_ledger where idempotency_key=p_idempotency_key||':award' limit 1) else null end
  )
  returning id into v_attempt_id;

  return v_attempt_id;
end;
$$;
