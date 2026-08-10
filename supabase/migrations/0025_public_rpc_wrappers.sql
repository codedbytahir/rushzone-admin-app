-- 0025_public_rpc_wrappers.sql
-- Edge Functions call admin.rpc('<fn>') unqualified, which PostgREST resolves
-- against the search path (public first) — but the real functions live in the
-- app schema. Add public wrappers (same pattern as public.hash_super_key) so
-- wallet / results / withdrawal / reward RPCs resolve. Grant execution to the
-- service_role (edge functions run with the secret key); anon/authenticated get
-- nothing (migration 0020 already revoked the key functions).

create or replace function public.wallet_credit(
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
language sql
security definer
set search_path = app, public, extensions
as $$ select app.wallet_credit(p_profile_id, p_amount, p_type, p_reference_type, p_reference_id, p_idempotency_key, p_created_by, p_note); $$;
grant execute on function public.wallet_credit(uuid, bigint, ledger_type, text, uuid, text, uuid, text) to service_role;

create or replace function public.wallet_debit(
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
language sql
security definer
set search_path = app, public, extensions
as $$ select app.wallet_debit(p_profile_id, p_amount, p_type, p_reference_type, p_reference_id, p_idempotency_key, p_created_by, p_note); $$;
grant execute on function public.wallet_debit(uuid, bigint, ledger_type, text, uuid, text, uuid, text) to service_role;

create or replace function public.wallet_hold(
  p_profile_id uuid,
  p_amount bigint,
  p_type ledger_type,
  p_reference_type text,
  p_reference_id uuid,
  p_idempotency_key text,
  p_created_by uuid default null
)
returns bigint
language sql
security definer
set search_path = app, public, extensions
as $$ select app.wallet_hold(p_profile_id, p_amount, p_type, p_reference_type, p_reference_id, p_idempotency_key, p_created_by); $$;
grant execute on function public.wallet_hold(uuid, bigint, ledger_type, text, uuid, text, uuid) to service_role;

create or replace function public.wallet_release(
  p_profile_id uuid,
  p_amount bigint,
  p_type ledger_type,
  p_reference_type text,
  p_reference_id uuid,
  p_idempotency_key text,
  p_created_by uuid default null
)
returns bigint
language sql
security definer
set search_path = app, public, extensions
as $$ select app.wallet_release(p_profile_id, p_amount, p_type, p_reference_type, p_reference_id, p_idempotency_key, p_created_by); $$;
grant execute on function public.wallet_release(uuid, bigint, ledger_type, text, uuid, text, uuid) to service_role;

create or replace function public.wallet_finalize_held(
  p_profile_id uuid,
  p_amount bigint,
  p_type ledger_type,
  p_reference_type text,
  p_reference_id uuid,
  p_idempotency_key text,
  p_created_by uuid default null
)
returns bigint
language sql
security definer
set search_path = app, public, extensions
as $$ select app.wallet_finalize_held(p_profile_id, p_amount, p_type, p_reference_type, p_reference_id, p_idempotency_key, p_created_by); $$;
grant execute on function public.wallet_finalize_held(uuid, bigint, ledger_type, text, uuid, text, uuid) to service_role;

create or replace function public.publish_results(p_tournament_id uuid, p_published_by uuid)
returns int
language sql
security definer
set search_path = app, public, extensions
as $$ select app.publish_results(p_tournament_id, p_published_by); $$;
grant execute on function public.publish_results(uuid, uuid) to service_role;

create or replace function public.correct_result(
  p_result_id uuid,
  p_new_kills int,
  p_new_placement int,
  p_new_points int,
  p_new_prize bigint,
  p_corrected_by uuid,
  p_reason text
)
returns uuid
language sql
security definer
set search_path = app, public, extensions
as $$ select app.correct_result(p_result_id, p_new_kills, p_new_placement, p_new_points, p_new_prize, p_corrected_by, p_reason); $$;
grant execute on function public.correct_result(uuid, int, int, int, bigint, uuid, text) to service_role;

create or replace function public.create_withdrawal_request(
  p_profile_id uuid,
  p_method text,
  p_account_snapshot text,
  p_amount bigint,
  p_idempotency_key text
)
returns uuid
language sql
security definer
set search_path = app, public, extensions
as $$ select app.create_withdrawal_request(p_profile_id, p_method, p_account_snapshot, p_amount, p_idempotency_key); $$;
grant execute on function public.create_withdrawal_request(uuid, text, text, bigint, text) to service_role;

create or replace function public.pick_reward_item(p_campaign_id uuid)
returns uuid
language sql
security definer
set search_path = app, public, extensions
as $$ select app.pick_reward_item(p_campaign_id); $$;
grant execute on function public.pick_reward_item(uuid) to service_role;

create or replace function public.reward_paid_attempt(p_campaign_id uuid, p_profile_id uuid, p_idempotency_key text)
returns uuid
language sql
security definer
set search_path = app, public, extensions
as $$ select app.reward_paid_attempt(p_campaign_id, p_profile_id, p_idempotency_key); $$;
grant execute on function public.reward_paid_attempt(uuid, uuid, text) to service_role;

create or replace function public.reconciliation_check()
returns table (profile_id uuid, cached_available bigint, cached_held bigint, ledger_available bigint, mismatch boolean)
language sql
security definer
set search_path = app, public, extensions
as $$ select * from app.reconciliation_check(); $$;
grant execute on function public.reconciliation_check() to service_role;

create or replace function public.admin_topup_queue_stats()
returns table (pending_count bigint, oldest_pending_age interval, risk_count bigint)
language sql
security definer
set search_path = app, public, extensions
as $$ select * from app.admin_topup_queue_stats(); $$;
grant execute on function public.admin_topup_queue_stats() to service_role;

create or replace function public.get_wallet_me(p_profile_id uuid)
returns table (available_balance bigint, held_balance bigint, total_balance bigint)
language sql
security definer
set search_path = app, public, extensions
as $$ select * from app.get_wallet_me(p_profile_id); $$;
grant execute on function public.get_wallet_me(uuid) to service_role;

create or replace function public.register_for_tournament(
  p_tournament_id uuid,
  p_profile_id uuid,
  p_idempotency_key text
)
returns uuid
language sql
security definer
set search_path = app, public, extensions
as $$ select app.register_for_tournament(p_tournament_id, p_profile_id, p_idempotency_key); $$;
grant execute on function public.register_for_tournament(uuid, uuid, text) to service_role;
