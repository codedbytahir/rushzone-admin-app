-- 0004_wallet.sql
-- Wallet accounts, ledger, atomic functions with row locking + idempotency

create table if not exists app.wallet_accounts (
  profile_id       uuid primary key references app.profiles(id) on delete cascade,
  available_balance bigint not null default 0 check (available_balance >= 0),
  held_balance      bigint not null default 0 check (held_balance >= 0),
  version           bigint not null default 0,
  updated_at        timestamptz not null default now()
);

create table if not exists app.wallet_ledger (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references app.profiles(id) on delete cascade,
  direction      ledger_direction not null,
  type           ledger_type not null,
  amount         bigint not null check (amount > 0),
  balance_after  bigint not null,
  idempotency_key text unique,
  reference_type text,
  reference_id   uuid,
  note           text,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now()
);

create index if not exists idx_ledger_profile_created on app.wallet_ledger (profile_id, created_at desc);
create index if not exists idx_ledger_reference on app.wallet_ledger (reference_type, reference_id);
create index if not exists idx_ledger_idempotency on app.wallet_ledger (idempotency_key);

comment on table app.wallet_accounts is 'Cached balances; authoritative source is sum of ledger. Row-locked during transactions.';
comment on table app.wallet_ledger is 'Immutable ledger. Append-only. No UPDATE/DELETE. Corrections are compensating entries.';

drop trigger if exists trg_wallet_accounts_updated_at on app.wallet_accounts;
create trigger trg_wallet_accounts_updated_at before update on app.wallet_accounts
for each row execute function public.handle_updated_at();

-- Atomic wallet functions
-- All functions: (1) idempotency check (2) SELECT FOR UPDATE (3) validate (4) insert ledger (5) update balance

create or replace function app.wallet_credit(
  p_profile_id uuid,
  p_amount bigint,
  p_type ledger_type,
  p_reference_type text,
  p_reference_id uuid,
  p_idempotency_key text,
  p_created_by uuid default null,
  p_note text default null
)
returns bigint
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_existing_id uuid;
  v_existing_balance bigint;
  v_new_balance bigint;
begin
  if p_amount <= 0 then raise exception 'Amount must be > 0'; end if;

  -- idempotency: if key exists, return prior balance_after without side effect
  if p_idempotency_key is not null then
    select id, balance_after into v_existing_id, v_existing_balance
    from app.wallet_ledger where idempotency_key = p_idempotency_key;
    if found then return v_existing_balance; end if;
  end if;

  -- lock wallet row (create if missing)
  insert into app.wallet_accounts (profile_id, available_balance, held_balance)
  values (p_profile_id, 0, 0) on conflict (profile_id) do nothing;

  perform 1 from app.wallet_accounts where profile_id = p_profile_id for update;

  select available_balance into v_new_balance from app.wallet_accounts where profile_id = p_profile_id;
  v_new_balance := v_new_balance + p_amount;

  insert into app.wallet_ledger (profile_id, direction, type, amount, balance_after, idempotency_key, reference_type, reference_id, note, created_by)
  values (p_profile_id, 'credit', p_type, p_amount, v_new_balance, p_idempotency_key, p_reference_type, p_reference_id, p_note, p_created_by);

  update app.wallet_accounts set available_balance = v_new_balance, version = version + 1 where profile_id = p_profile_id;

  return v_new_balance;
end;
$$;

create or replace function app.wallet_debit(
  p_profile_id uuid,
  p_amount bigint,
  p_type ledger_type,
  p_reference_type text,
  p_reference_id uuid,
  p_idempotency_key text,
  p_created_by uuid default null,
  p_note text default null
)
returns bigint
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_existing_balance bigint;
  v_available bigint;
  v_new_balance bigint;
begin
  if p_amount <= 0 then raise exception 'Amount must be > 0'; end if;

  if p_idempotency_key is not null then
    select balance_after into v_existing_balance from app.wallet_ledger where idempotency_key = p_idempotency_key;
    if found then return v_existing_balance; end if;
  end if;

  insert into app.wallet_accounts (profile_id, available_balance, held_balance)
  values (p_profile_id, 0, 0) on conflict (profile_id) do nothing;

  select available_balance into v_available from app.wallet_accounts where profile_id = p_profile_id for update;

  if v_available < p_amount then
    raise exception 'INSUFFICIENT_BALANCE: available=%, required=%', v_available, p_amount;
  end if;

  v_new_balance := v_available - p_amount;

  insert into app.wallet_ledger (profile_id, direction, type, amount, balance_after, idempotency_key, reference_type, reference_id, note, created_by)
  values (p_profile_id, 'debit', p_type, p_amount, v_new_balance, p_idempotency_key, p_reference_type, p_reference_id, p_note, p_created_by);

  update app.wallet_accounts set available_balance = v_new_balance, version = version + 1 where profile_id = p_profile_id;

  return v_new_balance;
end;
$$;

create or replace function app.wallet_hold(
  p_profile_id uuid,
  p_amount bigint,
  p_type ledger_type,
  p_reference_type text,
  p_reference_id uuid,
  p_idempotency_key text,
  p_created_by uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_existing_balance bigint;
  v_available bigint;
  v_held bigint;
begin
  if p_amount <= 0 then raise exception 'Amount must be > 0'; end if;

  if p_idempotency_key is not null then
    select balance_after into v_existing_balance from app.wallet_ledger where idempotency_key = p_idempotency_key;
    if found then return v_existing_balance; end if;
  end if;

  insert into app.wallet_accounts (profile_id) values (p_profile_id) on conflict (profile_id) do nothing;

  select available_balance, held_balance into v_available, v_held
  from app.wallet_accounts where profile_id = p_profile_id for update;

  if v_available < p_amount then
    raise exception 'INSUFFICIENT_BALANCE_FOR_HOLD: available=%, required=%', v_available, p_amount;
  end if;

  insert into app.wallet_ledger (profile_id, direction, type, amount, balance_after, idempotency_key, reference_type, reference_id, created_by)
  values (p_profile_id, 'hold', p_type, p_amount, v_available - p_amount, p_idempotency_key, p_reference_type, p_reference_id, p_created_by);

  update app.wallet_accounts set available_balance = v_available - p_amount, held_balance = v_held + p_amount, version = version + 1
  where profile_id = p_profile_id;

  return (select available_balance from app.wallet_accounts where profile_id = p_profile_id);
end;
$$;

create or replace function app.wallet_release(
  p_profile_id uuid,
  p_amount bigint,
  p_type ledger_type,
  p_reference_type text,
  p_reference_id uuid,
  p_idempotency_key text,
  p_created_by uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_existing_balance bigint;
  v_available bigint;
  v_held bigint;
begin
  if p_amount <= 0 then raise exception 'Amount must be > 0'; end if;

  if p_idempotency_key is not null then
    select balance_after into v_existing_balance from app.wallet_ledger where idempotency_key = p_idempotency_key;
    if found then return v_existing_balance; end if;
  end if;

  select available_balance, held_balance into v_available, v_held from app.wallet_accounts where profile_id = p_profile_id for update;

  if v_held < p_amount then
    raise exception 'INSUFFICIENT_HELD_BALANCE: held=%, required=%', v_held, p_amount;
  end if;

  insert into app.wallet_ledger (profile_id, direction, type, amount, balance_after, idempotency_key, reference_type, reference_id, created_by)
  values (p_profile_id, 'release', p_type, p_amount, v_available + p_amount, p_idempotency_key, p_reference_type, p_reference_id, p_created_by);

  update app.wallet_accounts set available_balance = v_available + p_amount, held_balance = v_held - p_amount, version = version + 1
  where profile_id = p_profile_id;

  return (select available_balance from app.wallet_accounts where profile_id = p_profile_id);
end;
$$;

create or replace function app.wallet_finalize_held(
  p_profile_id uuid,
  p_amount bigint,
  p_type ledger_type,
  p_reference_type text,
  p_reference_id uuid,
  p_idempotency_key text,
  p_created_by uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_existing_balance bigint;
  v_available bigint;
  v_held bigint;
begin
  if p_amount <= 0 then raise exception 'Amount must be > 0'; end if;

  if p_idempotency_key is not null then
    select balance_after into v_existing_balance from app.wallet_ledger where idempotency_key = p_idempotency_key;
    if found then return v_existing_balance; end if;
  end if;

  select available_balance, held_balance into v_available, v_held from app.wallet_accounts where profile_id = p_profile_id for update;

  if v_held < p_amount then
    raise exception 'INSUFFICIENT_HELD_FOR_FINALIZE: held=%, required=%', v_held, p_amount;
  end if;

  -- held -> gone (no credit to available), but record ledger with current available as balance_after
  insert into app.wallet_ledger (profile_id, direction, type, amount, balance_after, idempotency_key, reference_type, reference_id, created_by)
  values (p_profile_id, 'debit', p_type, p_amount, v_available, p_idempotency_key, p_reference_type, p_reference_id, p_created_by);

  update app.wallet_accounts set held_balance = v_held - p_amount, version = version + 1 where profile_id = p_profile_id;

  return (select available_balance from app.wallet_accounts where profile_id = p_profile_id);
end;
$$;

comment on function app.wallet_credit is 'Atomic credit: idempotent, row-locked, appends ledger, updates cached balance.';
comment on function app.wallet_debit is 'Atomic debit: validates sufficient available, idempotent, row-locked.';
comment on function app.wallet_hold is 'Move available -> held (for withdrawal pending).';
comment on function app.wallet_release is 'Move held -> available (rejected/cancelled withdrawal).';
comment on function app.wallet_finalize_held is 'Finalize held debit (paid withdrawal): held -> 0, no return to available.';
