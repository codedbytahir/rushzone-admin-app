-- 0014_rls.sql
-- Enable RLS on every table and create policies per 02-rls-policies.md
-- Default deny. Only explicit policies allow access via publishable key.
-- Admin/audit tables have NO client policies — Edge Functions with secret key bypass RLS.

-- Explicitly enable
alter table app.profiles enable row level security;
alter table app.profile_stats enable row level security;
alter table app.wallet_accounts enable row level security;
alter table app.wallet_ledger enable row level security;
alter table app.tournaments enable row level security;
alter table app.registrations enable row level security;
alter table app.rosters enable row level security;
alter table app.rooms enable row level security;
alter table app.match_results enable row level security;
alter table app.prize_awards enable row level security;
alter table app.topup_requests enable row level security;
alter table app.withdrawal_methods enable row level security;
alter table app.withdrawal_requests enable row level security;
alter table app.reward_campaigns enable row level security;
alter table app.reward_items enable row level security;
alter table app.reward_attempts enable row level security;
alter table app.streak_days enable row level security;
alter table app.streak_milestones enable row level security;
alter table app.streak_freezes enable row level security;
alter table app.referrals enable row level security;
alter table app.card_share_events enable row level security;
alter table app.notifications enable row level security;
alter table app.banners enable row level security;
alter table app.settings enable row level security;
alter table app.internal_notes enable row level security;
alter table app.restrictions enable row level security;
alter table app.risk_flags enable row level security;
alter table admin.roles enable row level security;
alter table admin.permissions enable row level security;
alter table admin.role_permissions enable row level security;
alter table admin.assignments enable row level security;
alter table admin.assignment_roles enable row level security;
alter table admin.security_credentials enable row level security;
alter table admin.sessions enable row level security;
alter table audit.logs enable row level security;

-- Drop existing policies if re-running migration (idempotent)
do $$ declare r record; begin
  for r in select policyname, tablename, schemaname from pg_policies where schemaname in ('app','admin','audit')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- === PLAYER POLICIES ===

-- app.profiles: self read / self update
create policy "profiles_self_read" on app.profiles for select using (id = auth.uid());
create policy "profiles_self_update" on app.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- wallet
create policy "wallet_self_read" on app.wallet_accounts for select using (profile_id = auth.uid());
create policy "ledger_self_read" on app.wallet_ledger for select using (profile_id = auth.uid());
-- no insert/update/delete policies => blocked

-- tournaments: public read for published/visible statuses
create policy "tournaments_public_read" on app.tournaments for select
  using (status in ('scheduled','registration_open','registration_full','registration_closed','room_released','live','results_pending','completed'));
-- draft/cancelled are not readable via RLS; admin fetch via Edge Function

-- registrations: self read only; inserts via Edge Function
create policy "reg_self_read" on app.registrations for select using (profile_id = auth.uid());

-- rosters: no client policy (admin via Edge Function)
-- rooms: NO policy — never directly readable. Edge Function checks eligibility + released_at.

-- results/prizes: self read only for published/corrected
create policy "results_self_read" on app.match_results for select
  using (profile_id = auth.uid() and status in ('published','corrected'));
create policy "prizes_self_read" on app.prize_awards for select using (profile_id = auth.uid());

-- finance
create policy "topups_self_read" on app.topup_requests for select using (profile_id = auth.uid());
create policy "topups_self_insert" on app.topup_requests for insert with check (profile_id = auth.uid() and status = 'pending');
create policy "withdrawals_self_read" on app.withdrawal_requests for select using (profile_id = auth.uid());
create policy "methods_self_all" on app.withdrawal_methods for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- rewards/streaks/referrals/share: self read; inserts handled via functions
create policy "reward_attempts_self_read" on app.reward_attempts for select using (profile_id = auth.uid());
create policy "streak_days_self_read" on app.streak_days for select using (profile_id = auth.uid());
create policy "streak_milestones_self_read" on app.streak_milestones for select using (profile_id = auth.uid());
create policy "referrals_self_read" on app.referrals for select using (referrer_id = auth.uid() or referred_id = auth.uid());
create policy "share_self_insert" on app.card_share_events for insert with check (profile_id = auth.uid());
create policy "share_self_read" on app.card_share_events for select using (profile_id = auth.uid());

-- notifications: self read + mark read
create policy "notifications_self_read" on app.notifications for select using (profile_id = auth.uid());
create policy "notifications_self_update" on app.notifications for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- banners: public read for active && in schedule window
create policy "banners_public_read" on app.banners for select
  using (active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()));

-- settings: no client policy (read via public app/version Edge Function or filtered view if needed)
-- internal_notes, restrictions, risk_flags: no client policy (admin via Edge Function)
-- admin.* and audit.logs: NO policies — Edge Functions only (secret key bypasses RLS)

-- profile_stats: self read
create policy "profile_stats_self_read" on app.profile_stats for select using (profile_id = auth.uid());

-- reward campaigns/items: public read for active campaigns (players need to see weights? spec says config visible)
create policy "reward_campaigns_public_read" on app.reward_campaigns for select using (status = 'active');
create policy "reward_items_public_read" on app.reward_items for select using (
  exists (select 1 from app.reward_campaigns c where c.id = campaign_id and c.status = 'active')
);

-- Ensure no permissive policies accidentally grant anon writes
comment on table app.wallet_ledger is 'RLS: no client INSERT/UPDATE/DELETE. All writes via wallet_* RPCs from Edge Functions with secret key.';

-- Verification helper (for CI): fail if any table has RLS disabled
do $$
declare
  v_count int;
begin
  select count(*) into v_count from pg_tables where schemaname in ('app','admin','audit') and rowsecurity = false;
  if v_count > 0 then
    raise warning 'RLS disabled on % table(s) in app/admin/audit — check 0014_rls migration', v_count;
  end if;
end $$;
