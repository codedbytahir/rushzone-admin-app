-- 0015_rpc_functions.sql
-- Additional RPC helpers exposed via PostgREST / Edge Functions
-- Wallet + registration RPCs already defined in earlier migrations; this file adds convenience + maintenance helpers.

-- Get wallet snapshot
create or replace function app.get_wallet_me(p_profile_id uuid)
returns table (available_balance bigint, held_balance bigint, total_balance bigint)
language sql
security definer
set search_path = app, public
as $$
  select available_balance, held_balance, available_balance + held_balance as total_balance
  from app.wallet_accounts where profile_id = p_profile_id;
$$;

-- Reconciliation check: compare cached balances vs ledger sum (flag drift, never auto-fix)
create or replace function app.reconciliation_check()
returns table (profile_id uuid, cached_available bigint, cached_held bigint, ledger_available bigint, mismatch boolean)
language plpgsql
security definer
set search_path = app, public
as $$
begin
  return query
  with ledger_sums as (
    select
      l.profile_id,
      -- available = sum(credits - debits) ; held moves are not part of available directly but via wallet_* logic
      -- Simplified: recompute available as sum(case when direction='credit' then amount when direction='debit' then -amount else 0 end)
      -- plus hold/release handled as moves. For MVP: just compare available via sum of credit/debit where direction in ('credit','debit')
      -- Real prod should compute precisely matching app.wallet_* semantics.
      sum(case when direction='credit' then amount when direction in ('debit') then -amount else 0 end) as ledger_avail
    from app.wallet_ledger l
    group by l.profile_id
  )
  select
    w.profile_id,
    w.available_balance as cached_available,
    w.held_balance as cached_held,
    coalesce(ls.ledger_avail,0) as ledger_available,
    (w.available_balance != coalesce(ls.ledger_avail,0)) as mismatch
  from app.wallet_accounts w
  left join ledger_sums ls on ls.profile_id = w.profile_id
  where w.available_balance != coalesce(ls.ledger_avail,0);
end;
$$;

comment on function app.reconciliation_check is 'Returns rows where cached available != ledger-derived available. Flag to risk_flags, never auto-fix. Owner runs via admin/reports.';

-- Helper: list pending topups with risk flags (admin queue helper, but filtered by Edge Function anyway)
create or replace function app.admin_topup_queue_stats()
returns table (pending_count bigint, oldest_pending_age interval, risk_count bigint)
language sql
security definer
set search_path = app, public
as $$
  select
    count(*) filter (where status='pending') as pending_count,
    (now() - min(created_at) filter (where status='pending')) as oldest_pending_age,
    count(*) filter (where status='pending' and risk_flags != '[]'::jsonb) as risk_count
  from app.topup_requests;
$$;

-- Version / maintenance read helper (public via Edge Function app/version, but also as RPC for debugging)
create or replace function app.get_app_version(p_app_key text)
returns jsonb
language sql
security definer
set search_path = app, public
as $$
  select value from app.settings where key = p_app_key;
$$;

-- Mark notification read (player self only via RLS, but as RPC for atomicity if needed)
create or replace function app.mark_notification_read(p_notification_id uuid, p_profile_id uuid)
returns void
language sql
security definer
set search_path = app, public
as $$
  update app.notifications set read_at = now() where id = p_notification_id and profile_id = p_profile_id;
$$;
