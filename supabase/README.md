# Supabase backend (shared) — FOUNDATION COMPLETE ✅ 2026-08-09

This folder contains the migrations, seed data, and Edge Functions for Rush Zone.

> **Canonical source:** during the admin-first build, the `supabase/` and `docs/shared/` folders in `rushzone-admin-app` are the source of truth. Keep this copy identical to the admin repo's copy (copy changes both ways).

## Layout

```
supabase/
├── config.toml              ✅ Supabase project config (Postgres 15, Auth OTP, Storage, buckets)
├── seed.sql                 ✅ 17 permissions, 13 roles, 17 settings, sample Spin Wheel campaign
├── migrations/              ✅ 0001..0016 (ordered, immutable — never edit after merge)
│   ├── 0001_extensions_schemas.sql      — pgcrypto/pgjwt, app/admin/audit, handle_updated_at()
│   ├── 0002_enums.sql                  — 12 enums (10-state tournament_status, 15 ledger_type, etc.)
│   ├── 0003_profiles_auth.sql          — profiles, profile_stats, app_uid/referral helpers
│   ├── 0004_wallet.sql                 — wallet_accounts/ledger + 5 atomic wallet_*() (FOR UPDATE + idempotency)
│   ├── 0005_tournaments.sql            — tournaments/registrations/rosters/rooms + register/award helpers
│   ├── 0006_results_prizes.sql         — match_results/prize_awards + publish/correct (compensating ledger)
│   ├── 0007_finance.sql                — topup/withdrawal_requests/methods + create_withdrawal_request()
│   ├── 0008_rewards.sql                — campaigns/items/attempts + weighted pick + paid attempt
│   ├── 0009_streaks_referrals.sql      — streak_days/milestones/freezes, referrals, share_events
│   ├── 0010_content_notifications.sql  — banners/notifications/settings (feature flag store)
│   ├── 0011_admin_rbac.sql             — roles/permissions/assignments/credentials (Argon2id)/sessions
│   ├── 0012_audit.sql                  — audit.logs append-only + write_log() + trigger
│   ├── 0013_moderation.sql             — internal_notes/restrictions/risk_flags
│   ├── 0014_rls.sql                    — RLS on EVERY table + player/server policies (no admin/audit client access)
│   ├── 0015_rpc_functions.sql          — helpers: get_wallet_me, reconciliation_check, version
│   └── 0016_storage_buckets.sql        — 5 buckets: tournament-thumbnails/banners/avatars (public) + payment-proofs/admin-docs (private)
└── functions/
    └── _shared/             ✅ Foundation shared library (used by all Edge Functions)
        ├── cors.ts          — allowed origins (rushzone://, preview *.e2b.app) + preflight
        ├── supabase.ts      — createAdminClient (secret, after authz) + createUserClient(jwt)
        ├── errors.ts        — standard {error:{code,message,retryable}} + 20 codes
        ├── auth.ts          — requireUser/requireAdmin(permission)/verifySuperKey (Argon2id)
        ├── validate.ts      — zod schemas + parseOrThrow
        ├── idempotency.ts   — Idempotency-Key header helper
        └── audit.ts         — writeAuditLog (append-only audit.logs)
```

See `docs/shared/engineering/01-migrations-and-seed.md` and `03-edge-function-conventions.md`.

## Quick start

```bash
supabase start                    # local Postgres/Auth/Storage on ports 54321..54324
supabase db reset                 # applies 0001..0016 + seed.sql
supabase gen types typescript --local > ../../types/database.types.ts
supabase functions serve --env-file ./supabase/.env --debug  # serve Edge Functions locally
```

## Next

Phase 1 adds the first Edge Functions: `owner/bootstrap` and `admin-auth-verify` (OTP + Super Key). See `PROGRESS.md` for the full 8-phase roadmap.

Foundation audit: `FOUNDATION.md` + `PROGRESS.md` (Phase 0 100%). All money moves MUST use `app.wallet_*` RPCs with `Idempotency-Key`; every admin command MUST call `requireAdmin(req, permission)` before `createAdminClient()`.
