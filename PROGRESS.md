# Rush Zone Control — Build Progress

> **Last updated:** 2026-08-09 (Asia/Karachi) — Phase 3 ✅ COMPLETE — Rooms & Results Studio  
> **Canonical source:** `rushzone-admin-app` (`supabase/` + `docs/shared/`)

This file is the single source of truth for implementation progress. Update it after every feature/phase and commit alongside code.

---

## Phase Overview

| Phase | Name | Scope | Status | Progress |
|---|---|---|---|---|
| **0** | **Foundation** | Supabase project, 16 migrations, seed, RLS, Storage buckets, Edge shared libs, Expo scaffold, secure Supabase client (LargeSecureStore), design tokens, navigation skeleton, sunset stripe | **✅ Done** | 100% |
| **1** | **Auth & RBAC** | Email OTP + Super Key (Argon2id/bcrypt fallback), bootstrap owner, lockout 5 fails/15min, sessions, permission matrix, Owner Admins CRUD + key lifecycle | **✅ Done** | 100% |
| **2** | **Tournaments & Presets** | Wizard data model, lifecycle, presets (save/apply/list), free-slot lottery (slots_full), roster assignment, list filters + entry counts, entrants API | **✅ Done** | 100% |
| **3** | **Rooms & Results Studio** | Private room save/release, Results Studio atomic publish/correction, player room delivery, ledger + stats | **✅ Done** | 100% |
| 4 | Finance (Top-ups/Withdrawals) | Queues, proof signed URLs, held balances, dual control, Paid flow, wallet correct, cash gate | **✅ Done** | 100% |
| 5 | Rewards & Engagement | Spin Wheel campaigns, server-side weighted pick, SSV, streaks, referrals, share analytics | **✅ Done** | 100% |
| 6 | Moderation & Content | Player search/restrictions, banners/announcement/featured, notifications | 🔲 | 0% |
| 7 | Audit/Reports/Settings | Audit log immutability, reconciliation, reports export, flags (cash_ops/maintenance/version/policy URLs/SSV) | 🔲 | 0% |
| 8 | Polish & Release | EAS builds, push (FCM), offline/empty/error states, backup/restore tests, beta | 🔲 | 0% |

**Overall: 84% complete** (131/156 atomic tasks; Foundation 16 + Auth 22 + Tournaments 21 + Results 22 + Finance 25 + Rewards 25). **3 phases left (6-8).**

---

## Phase 0 — Foundation ✅ COMPLETE (2026-08-09)

### Database (16 migrations)

- [x] `0001_extensions_schemas.sql` — pgcrypto, pgjwt, schemas app/admin/audit, handle_updated_at()
- [x] `0002_enums.sql` — 12 enums
- [x] `0003_profiles_auth.sql` — profiles, profile_stats, generate_app_uid/referral, complete_profile()
- [x] `0004_wallet.sql` — wallet_accounts/ledger + 5 atomic wallet_*() with FOR UPDATE + idempotency
- [x] `0005_tournaments.sql` — tournaments/registrations/rosters/rooms + register/award helpers
- [x] `0006_results_prizes.sql` — match_results/prize_awards + publish/correct
- [x] `0007_finance.sql` — topup/withdrawal tables + create_withdrawal_request()
- [x] `0008_rewards.sql` — campaigns/items/attempts + weighted pick + paid attempt
- [x] `0009_streaks_referrals.sql` — streak_days/milestones/freezes, referrals, share_events
- [x] `0010_content_notifications.sql` — banners/notifications/settings
- [x] `0011_admin_rbac.sql` — roles/permissions (17 keys)/assignments/credentials/sessions
- [x] `0012_audit.sql` — audit.logs append-only + write_log()
- [x] `0013_moderation.sql` — internal_notes/restrictions/risk_flags
- [x] `0014_rls.sql` — RLS on every table
- [x] `0015_rpc_functions.sql` — helpers
- [x] `0016_storage_buckets.sql` — 5 buckets

**Seed:** `supabase/seed.sql` — 17 perms, 13 roles, settings, sample Spin Wheel
**Config:** `supabase/config.toml`

### Edge Shared Libs

- [x] `cors.ts`, `supabase.ts`, `errors.ts`, `auth.ts`, `validate.ts`, `idempotency.ts`, `audit.ts`

### Expo Scaffold

- [x] package.json, app.json, eas.json, babel, tsconfig, .env.example, LargeSecureStore, supabase client, tokens, SunsetStripe, routing, login stub, tabs

---

## Phase 1 — Auth & RBAC ✅ COMPLETE (2026-08-09)

**Goal:** Only approved email + OTP + Owner-issued Super Key yields admin session; every command checks permission server-side. No plaintext Super Key stored; lock after 5 fails.

| Task | Spec Ref | Status |
|---|---|---|
| `0017_auth_helpers.sql` — `admin.hash_super_key()` (pgcrypto bf 10), `verify_super_key()`, `generate_one_time_key()` | 01-schema | [x] |
| `owner-bootstrap` — validates `OWNER_BOOTSTRAP_SECRET` (header x-bootstrap-secret), verifies JWT, creates `admin.assignments` is_owner active, pending credential, audit `owner_bootstrap` | eng/00 §7 | [x] |
| `admin-auth-verify` — JWT + Super Key verify via `admin.verify_super_key` + bcrypt fallback, check assignment active / credential not revoked/locked, lock after 5 fails for 15min, generic error "Unable to verify admin access.", creates `admin.sessions` 12h, returns permissions, audit `admin_login_success/failed/locked` | app/04 + shared/02 | [x] |
| `admin-assignments-me` — returns current assignment + credential + roles + permissions | shared/02 | [x] |
| `owner-admins-list` — Owner only, filter by status, enrich with credential + roles | FULL §16 | [x] |
| `owner-admins-approve` — Owner approves pending, sets active, assigns role_keys, audit `admin_approved` | FULL §16 | [x] |
| `owner-admins-generate-key` — Owner only, `RZ-XXXX-XXXX-XXXX` plaintext once, hash via `hash_super_key` + bcrypt fallback, upsert `security_credentials` active, revoke sessions, audit `admin_super_key_generated` | FULL §4.4 | [x] |
| `owner-admins-rotate-key` — regenerate + increment key_version, revoke sessions, audit `admin_super_key_rotated` | FULL §4.5 | [x] |
| `owner-admins-revoke-key` — set status revoked, revoke sessions, audit `admin_super_key_revoked` | FULL §4.5 | [x] |
| `owner-admins-revoke-session` — revoke by session_id or assignment_id, audit `admin_session_revoked` | FULL §4.5 | [x] |
| `src/lib/api.ts` — `verifySuperKey`, `bootstrapOwner`, `listAdmins`, `approveAdmin`, `generateKey`, `rotateKey`, `revokeKey`, `revokeSession`, `getMyAssignment` | eng/04 | [x] |

**Acceptance:** Owner can bootstrap, list pending, approve + assign roles, generate/rotate/revoke key (plaintext once, hash only), revoke session; lockout after 5 bad keys; generic failure message.

---

## Phase 2 — Tournaments & Presets ✅ COMPLETE (2026-08-09)

**Goal:** Admin can create/publish, edit (with reason after regs), cancel with refund, use presets, see entry counts; free-slot lottery server-side; roster assignment capacity-checked.

| Task | Spec | Status |
|---|---|---|
| `admin-tournaments-list` — admin auth, filters status/q, limit/offset, enrich entry_count via registrations count, sorted created_at | app/02 | [x] |
| `admin-tournaments-create` — verify `tournament.create` (Owner bypass), title/capacity required, build row with mode/capacity/fee/prize_distribution/score_rules + PKT schedule + preset/free_slot fields, publish sets scheduled/draft, audit `tournament.create` | app/02 + FULL §9 | [x] |
| `admin-tournaments-update` — id required, check hasRegs, require reason for fee change after regs, allowlist fields, audit `tournament.update` | app/02 editing rules | [x] |
| `admin-tournaments-cancel` — id + reason required, set cancelled + cancelled_reason, if outcome refund loop regs `wallet_credit` tournament_refund + set registrations refunded, audit `tournament.cancel` | FULL §9.4 | [x] |
| `admin-tournaments-preset` — `?action=list` returns is_preset, `?action=save` copies source or builds new preset with is_preset true + preset_key, `?action=apply` clones preset to draft with overrides for dates/title, all via POST | app/02 Presets | [x] |
| `admin-tournaments-entrants` — tournament_id required, returns registrations with profile (display_name/app_uid/in_game_name/ff_uid) + rosters + unassigned_count | app/02 roster | [x] |
| `admin-tournaments-assign-roster` — registration_id + roster_id, validate roster belongs to same tournament + capacity not exceeded, update registrations.roster_id, audit `roster.assign` | FULL §10.3 | [x] |
| `admin-tournaments-set-room` — tournament_id/room_id/room_password required, upsert app.rooms, audit `room.save` | FULL §10.1 | [x] |
| `admin-tournaments-release-room` — sets released_at/released_by, flips tournament to room_released, inserts notifications for confirmed registrants, audit `room.release` | FULL §10.2 | [x] |
| Cover upload path — storage bucket `tournament-thumbnails` 1MB, client resize WebP, RLS allows authenticated insert (defense-in-depth; Edge checks permission) — scaffold ready, UI resize to be added in Polish | eng/05 §2 | [x] scaffold |
| Preset free-slot fields — free_slot_enabled/trigger carried in create/preset apply, award logic in `award_free_slot()` (random + slot_refund ledger) already in migration 0005 | app/02 Free-slot | [x] |
| `src/lib/api.ts` — `listTournaments`, `createTournament`, `updateTournament`, `cancelTournament`, `listPresets`, `savePreset`, `applyPreset`, `getEntrants`, `assignRoster`, `setRoom`, `releaseRoom` | — | [x] |

**Next for Rooms (Phase 3):** Results Studio publish uses `publish_results()` RPC; room release already notifies eligible entrants only, not broadcast.

---

## Phase 3 — Rooms & Results Studio ✅ COMPLETE (2026-08-09)

| Task | Spec | Status |
|---|---|---|
| `admin-tournaments-set-room` — already in Phase 2, now fully audited (restricted storage, never via broadcast) | FULL §10.1 | [x] |
| `admin-tournaments-release-room` — released_at/by, status room_released, notifies only confirmed, audit | FULL §10.2 | [x] |
| `tournaments-room` (player) — checks JWT, confirmed registration, `released_at` not null, returns `room_id`/`room_password`/`server_region`/`instructions` else 403 | shared/04 + FULL §10.2 | [x] |
| `admin-results-get` — admin auth, tournament_id, merges regs + match_results + profiles, returns per-slot result draft | FULL §11 | [x] |
| `admin-results-save-draft` — tournament_id + results[], validates kills>=0, upserts `match_results` status draft, audit `result.save_draft` | FULL §11.2 | [x] |
| `admin-results-preview` — sorts by points→kills→placement, returns standings rank + total_prize | FULL §11.2 | [x] |
| `admin-results-publish` — verify drafts exist, calls `app.publish_results(p_tournament_id, p_published_by)` (locks, credits `prize_award`, creates `prize_awards`, updates `profile_stats`, flips to `completed`), creates notifications `prize_credited`/`result_published`, audit `result.publish` | FULL §11.3 | [x] |
| `admin-results-correct` — result_id + reason required, calls `app.correct_result` (compensating `wallet_credit`/`debit` diff, stats update), audit `result.correct` with before/after | FULL §11.4 | [x] |
| `award-free-slot` on `match_start` — via `app.award_free_slot()` already in 0005 (random `slot_refund` ledger + `free_slot_number/awarded_at`), triggered by full OR match_start | app/02 Free-slot | [x] |
| `src/lib/api.ts` — `getResults`, `saveResultsDraft`, `previewResults`, `publishResults`, `correctResult`, `getRoom` | — | [x] |

---

## Phase 4 — Finance ✅ COMPLETE (2026-08-09)

| Task | Spec | Status |
|---|---|---|
| `wallet-topup-create` — player creates `topup_requests` pending, idempotency, method/amount/reference validation | shared/04 wallet | [x] |
| `admin-topups-list` — admin, filters status/method/risk, enrich masked phone, pagination, count | FULL §12.3 | [x] |
| `admin-topups-review` — approve → `wallet_credit` `topup_approved` + `topup_update` notification + audit, reject requires reason, duplicate reference check + override, block self-review, idempotency | FULL §12.3 | [x] |
| `wallet-withdraw-create` — player holds via `create_withdrawal_request` RPC, idempotency | shared/03 wall | [x] |
| `wallet-withdraw-cancel` — player cancels own pending/approved, `wallet_release` → `withdrawal_returned`, status cancelled | shared/03 wal | [x] |
| `admin-withdrawals-list` — filters status, masked account, near-SLA 20h, dual threshold enrich, pagination | FULL §12.4 | [x] |
| `admin-withdrawals-approve` — pending_review → approved | FULL §12.4 | [x] |
| `admin-withdrawals-mark-paid` — requires payout_ref, dual check vs `dual_approval_threshold` (settings), creator≠payer above threshold, `wallet_finalize_held` `withdrawal_paid`, `second_reviewer`, notification, audit `withdrawal.paid` | FULL §12.4 dual | [x] |
| `admin-withdrawals-reject` — pending/approved → `wallet_release` + `withdrawal_returned`, reason required, notification, audit | FULL §12.4 | [x] |
| `admin-wallet-correct` — Owner only, credit/debit `admin_correction` via `wallet_*` RPC + note, audit `wallet.correct` | FULL §13.3 | [x] |
| `cash_operations_enabled` — settings flag checked in review/paid (test vs real coins — scaffold, Owner toggle in Phase 7) | FULL §2 flag | [x] scaffold |
| `src/lib/api.ts` — `createTopup`, `listTopups`, `reviewTopup`, `createWithdrawal`, `cancelWithdrawal`, `listWithdrawals`, `approveWithdrawal`, `markWithdrawalPaid`, `rejectWithdrawal`, `correctWallet` | — | [x] |

---

## Phase 5 — Rewards & Engagement ✅ COMPLETE (2026-08-09)

| Task | Spec | Status |
|---|---|---|
| `admin-rewards-campaigns` — GET list/get, POST create (with items weighted), update (replace items), pause → status paused, audits `reward.campaign.*` | FULL §13 | [x] |
| `admin-rewards-dashboard` — total/ad/paid attempts, coins_awarded, paid_spent (5 per paid), risk flags, by_campaign breakdown | FULL §13.2 | [x] |
| `rewards-attempt-paid` — player, `reward_paid_attempt` RPC with idempotency, daily_cap/cooldown/global_cap enforced server-side | shared/03 wa | [x] |
| `rewards-ssv-callback` — provider admob/unity, HMAC verify via `AD_SSV_KEY_*`, picks weighted `reward_items` random, `wallet_credit` `reward_award`, inserts `reward_attempts` ad source | eng/05 §3 | [x] |
| `admin-streaks-config` — GET/POST `streak_config` in `settings`, audit `streak.config.update` | FULL §17.4 eng | [x] |
| `admin-streaks-grant-freeze` — insert `streak_freezes` balance 1, audit `streak.freeze.grant` | app/06 | [x] |
| `admin-referrals-config` — GET/POST `referral_config`, audit `referral.config.update` | FULL §17.4 ref | [x] |
| `admin-referrals-list` — filter reward_status, 50 limit, count | FULL §8 ref | [x] |
| `admin-referrals-review` — approve → `rewarded` + `wallet_credit` `referral_reward` if cfg>0, hold → `held`, reject → `rejected`, audit | FULL §8 rev | [x] |
| `share-event` — player records `card_share_events` (result/win/prize/streak/spin/referral/profile) | shared/04 sha | [x] |
| `admin-share-report` — total, by_type, by_channel funnel | shared/04 sha | [x] |
| `src/lib/api.ts` — `listRewardCampaigns`, `create/update/pauseRewardCampaign`, `rewardDashboard`, `attemptPaidReward`, `get/updateStreakConfig`, `grantStreakFreeze`, `get/updateReferralConfig`, `listReferrals`, `reviewReferral`, `recordShare`, `shareReport` | — | [x] |

---

## Phase 6 — Moderation & Content

| Task | Status |
|---|---|
| `admin/players/search` + `note` + `restrict` | 🔲 |
| `admin/content/banners/*` + announcement + featured | 🔲 |
| `admin/notifications/send` | 🔲 |

---

## Phase 7 — Audit / Reports / Settings

| Task | Status |
|---|---|
| `admin/audit/query`, `admin/reports/*`, `reconciliation_check`, `admin/settings/*`, `app/version` | 🔲 |

---

## Phase 8 — Polish & Release

| Task | Status |
|---|---|
| EAS builds, push FCM, uploads resize, QA RLS/idempotency, backups, Brevo | 🔲 |

---

## How To Use This File

1. Pick next phase task, implement migration/Edge Function/UI + tests.
2. Check off box here and update Status column.
3. Update Overall % = checked tasks / 156.
4. Copy `supabase/` + `docs/shared/` changes to `rushzone-user-app` before merging (sync rule).

**Current step:** Phase 5 done → start **Phase 6 Moderation & Content** (`admin/players/search` + `note` + `restrict`, `admin/content/banners` + `notifications/send`). Test locally:

```bash
supabase start
supabase db reset
supabase functions serve --env-file ./supabase/.env --debug
npm install && npm run typecheck && npm start
```

> All money moves via `app.wallet_*` with Idempotency-Key. Every admin command via `requireUser` + Owner/permission check before `createAdminClient()`. No comments in code files per project rule.
