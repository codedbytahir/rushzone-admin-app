-- 0007_finance.sql
-- Topup, withdrawal methods, withdrawal requests

create table if not exists app.topup_requests (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references app.profiles(id) on delete cascade,
  method         text not null check (method in ('easypaisa','jazzcash','bank','other')),
  amount_coins   bigint not null check (amount_coins > 0),
  reference      text not null,
  status         topup_status not null default 'pending',
  idempotency_key text unique,
  reviewed_by    uuid references auth.users(id),
  reviewed_at    timestamptz,
  reject_reason  text,
  risk_flags     jsonb not null default '[]',
  created_at     timestamptz not null default now()
);

create index if not exists idx_topup_profile on app.topup_requests(profile_id);
create index if not exists idx_topup_status on app.topup_requests(status);
create index if not exists idx_topup_reference on app.topup_requests(reference);

create table if not exists app.withdrawal_methods (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references app.profiles(id) on delete cascade,
  method      text not null check (method in ('easypaisa','jazzcash','bank','other')),
  account     text not null,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_withdrawal_methods_profile on app.withdrawal_methods(profile_id);

create table if not exists app.withdrawal_requests (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references app.profiles(id) on delete cascade,
  method         text not null,
  account_snapshot text not null,
  amount_coins   bigint not null check (amount_coins > 0),
  status         withdrawal_status not null default 'pending_review',
  payout_ref     text,
  reviewed_by    uuid references auth.users(id),
  second_reviewer uuid references auth.users(id),
  held_ledger_id uuid references app.wallet_ledger(id),
  reject_reason  text,
  risk_flags     jsonb not null default '[]',
  idempotency_key text unique,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_withdrawal_requests_profile on app.withdrawal_requests(profile_id);
create index if not exists idx_withdrawal_requests_status on app.withdrawal_requests(status);
create index if not exists idx_withdrawal_requests_created on app.withdrawal_requests(created_at desc);

comment on table app.topup_requests is 'Manual top-up with payment proof reference. Approval creates wallet_credit.';
comment on table app.withdrawal_requests is 'Held-balance withdrawal lifecycle: pending_review->approved->paid or rejected/cancelled->release.';
comment on table app.withdrawal_methods is 'Saved payout methods per user, masked in reads except to finance roles via Edge Function.';

drop trigger if exists trg_withdrawal_requests_updated_at on app.withdrawal_requests;
create trigger trg_withdrawal_requests_updated_at before update on app.withdrawal_requests
for each row execute function public.handle_updated_at();

-- Helper: create withdrawal request (holds balance atomically)
create or replace function app.create_withdrawal_request(
  p_profile_id uuid,
  p_method text,
  p_account_snapshot text,
  p_amount bigint,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_id uuid;
  v_existing uuid;
begin
  select id into v_existing from app.withdrawal_requests where idempotency_key = p_idempotency_key;
  if found then return v_existing; end if;

  -- hold balance
  perform app.wallet_hold(p_profile_id, p_amount, 'withdrawal_requested', 'withdrawal', null, p_idempotency_key||':hold');

  insert into app.withdrawal_requests (profile_id, method, account_snapshot, amount_coins, idempotency_key, held_ledger_id)
  values (p_profile_id, p_method, p_account_snapshot, p_amount, p_idempotency_key,
    (select id from app.wallet_ledger where idempotency_key = p_idempotency_key||':hold' limit 1)
  )
  returning id into v_id;

  -- update reference id for ledger row if needed (optional)
  return v_id;
end;
$$;
