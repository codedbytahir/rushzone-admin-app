# Engineering 01 — Migrations & Seed Data

All database changes ship as ordered, immutable SQL migrations in `rushzone-backend/supabase/migrations/`. Never edit a migration after it's merged; add a new one.

## 1. Migration order (initial schema)
Create one migration per concern, prefixed numerically:
1. `0001_extensions_schemas.sql` — pgcrypto, pgjwt; `app`, `admin`, `audit` schemas; set search_path.
2. `0002_enums.sql` — all enums from `shared/01-database-schema.md` §2.
3. `0003_profiles_auth.sql` — `app.profiles`, `app.profile_stats`, profile triggers, app_uid/referral_code generation, updated_at triggers.
4. `0004_wallet.sql` — `wallet_accounts`, `wallet_ledger`, indexes; atomic wallet functions (`wallet_debit`, `wallet_credit`, `wallet_hold`, `wallet_release`, `wallet_finalize_held`) with row locking and idempotency.
5. `0005_tournaments.sql` — tournaments, registrations, rooms, rosters; slot/free-slot columns; unique constraints.
6. `0006_results_prizes.sql` — match_results, prize_awards; publish/correction functions.
7. `0007_finance.sql` — topup_requests, withdrawal_methods, withdrawal_requests.
8. `0008_rewards.sql` — reward_campaigns, reward_items, reward_attempts.
9. `0009_streaks_referrals.sql` — streak_days, streak_milestones, streak_freezes, referrals, card_share_events.
10. `0010_content_notifications.sql` — banners, notifications, settings.
11. `0011_admin_rbac.sql` — roles, permissions, role_permissions, assignments, assignment_roles, security_credentials, sessions; credential helper functions (Argon2id verify).
12. `0012_audit.sql` — audit.logs, trigger-based audit for sensitive tables, append-only grants.
13. `0013_moderation.sql` — internal_notes, restrictions, risk_flags.
14. `0014_rls.sql` — all RLS policies (see `02-rls-policies.md`).
15. `0015_rpc_functions.sql` — server-callable functions used by Edge Functions / PostgREST where appropriate.

## 2. Migration rules
- Use `bigint` for all coins; `timestamptz` for all times; `uuid` primary keys (`gen_random_uuid()`).
- All money-moving functions: `SELECT … FOR UPDATE`, idempotency key check, insert ledger entry, update balance, return new balance — in one transaction.
- Every table has `created timestamptz not null default now()`; mutable tables have `updated_at` with a trigger.
- Add comments (`comment on table …`) explaining each table's purpose and security posture.

## 3. Seed data (`supabase/seed.sql`)
Seed is non-sensitive and re-runnable (`on conflict do nothing`):
- **Permissions** — the full permission key list (`tournament.create`, `tournament.publish`, `room.release`, `result.publish`, `topup.review`, `withdrawal.pay`, `rewards.manage`, `streaks.manage`, `referrals.review`, `content.manage`, `players.restrict`, `notifications.send`, `reports.view`, `admins.manage`, `settings.manage`, `cash_ops.toggle`, `audit.view`).
- **Roles** — suggested groups (Tournament Management, Room & Match Ops, Results, Top-up Review, Withdrawal Ops, Rewards, Engagement, Content & Marketing, Support/Moderation, Notifications, Reports, Release & Settings, Access Administration). Map each role to its permission keys.
- **Settings defaults** — `cash_operations_enabled=false`, maintenance flags, WhatsApp support URL placeholder, policy URLs (Terms/Privacy/Tournament Rules/Wallet/Reward), payout limits/fees defaults (0/disabled until owner configures), reward paid cost = 5, streak tiers (e.g., 3→10, 7→25, 14→60, 30→150), referral rewards (0 by default until configured), featured tournament = none.
- **Default reward campaign/items** — one inactive sample Spin Wheel campaign with example weights (owner reviews and activates).
- **App version settings** — `player_min_version`, `player_latest_version`, `admin_min_version`, `admin_latest_version`, force_update=false.

Do NOT seed any Super Key hash, secret key, SMTP password, or ad SSV secret.

## 4. Local development
- `supabase start` runs local Postgres + Auth + Storage.
- `supabase db reset` reapplies migrations + seed.
- `supabase gen types typescript --local > types/database.types.ts`; commit the generated types in the backend repo. Apps can pull the types from a tagged release of `rushzone-backend`.

## 5. Deploying
- Staging: push migrations via CI on merge to `develop` / manual approval.
- Production: push on merge to `main`; take a DB backup first; never run destructive schema changes without a migration that preserves data.
