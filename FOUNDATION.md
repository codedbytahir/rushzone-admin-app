# Foundation — What Was Built (2026-08-09)

> **Scope:** Everything needed before feature work can start without rework. This is the “Phase 0” described in `PROGRESS.md`.
> **Timeboxed as:** Foundation, not polish. The app runs locally; production secrets/buckets are still to be provisioned.

---

## 1. Database — 16 Migrations (immutable, ordered)

```
supabase/
├── config.toml
├── seed.sql
└── migrations/
    ├── 0001_extensions_schemas.sql      ✓ pgcrypto, pgjwt, app/admin/audit, handle_updated_at()
    ├── 0002_enums.sql                  ✓ 12 enums including 10-state tournament_status + 15 ledger_type
    ├── 0003_profiles_auth.sql          ✓ profiles + profile_stats + generate_app_uid/referral + complete_profile()
    ├── 0004_wallet.sql                 ✓ wallet_accounts + wallet_ledger + 5 atomic wallet_*() with FOR UPDATE + idempotency
    ├── 0005_tournaments.sql            ✓ tournaments/registrations/rosters/rooms + register_for_tournament() + award_free_slot()
    ├── 0006_results_prizes.sql         ✓ match_results/prize_awards + publish_results() + correct_result() (compensating ledger)
    ├── 0007_finance.sql                ✓ topup/withdrawal tables + create_withdrawal_request() (hold)
    ├── 0008_rewards.sql                ✓ campaigns/items/attempts + pick_reward_item() + reward_paid_attempt()
    ├── 0009_streaks_referrals.sql      ✓ streak_days/milestones/freezes, referrals (unique referred_id), card_share_events
    ├── 0010_content_notifications.sql  ✓ banners/notifications/settings (key→jsonb feature flag store)
    ├── 0011_admin_rbac.sql             ✓ roles/permissions (17 keys)/role_permissions/assignments/credentials (Argon2id)/sessions + has_permission()
    ├── 0012_audit.sql                  ✓ audit.logs (bigserial append-only) + write_log() + tournament trigger
    ├── 0013_moderation.sql             ✓ internal_notes/restrictions/risk_flags
    ├── 0014_rls.sql                    ✓ RLS enabled on every table + player self-read/public-read policies; admin/audit have NO client policies
    ├── 0015_rpc_functions.sql          ✓ get_wallet_me, reconciliation_check, queue stats, version helper
    └── 0016_storage_buckets.sql        ✓ 5 buckets (3 public, 2 private) + storage.objects RLS
```

**Key design decisions (to avoid CRUD anti-patterns):**
- Ledger is **append-only**; corrections are new rows with opposite direction, never `UPDATE balance`.
- Every money function does `SELECT ... FOR UPDATE` + idempotency_key unique check in one transaction.
- RLS default-deny; admin tables unreachable without `sb_secret_…` Edge Function even if JWT stolen.
- `free_slot_number` awarded server-side via `award_free_slot()` with `order by random()` + `slot_refund` ledger entry.

### Seed (`supabase/seed.sql`)

- 17 permissions, 13 roles, full role→permission mapping (least privilege).
- 17 settings rows: `cash_operations_enabled=false`, `maintenance_mode`, policy URLs, WhatsApp, withdrawal_config, streak tiers, referral 0, ad test_mode, versions `1.0.0`, threshold 10000.
- One paused sample Spin Wheel (6 items weights 30/25/20/15/8/2) for Owner to review.

Re-run safe: `on conflict do nothing`.

---

## 2. Edge Functions — Shared Library (`supabase/functions/_shared/`)

| File | Responsibility |
|---|---|
| `cors.ts` | Allows `rushzone://`, `rushzonecontrol://`, `exp://`, localhost, `*.e2b.app` previews; handles OPTIONS. |
| `supabase.ts` | `createAdminClient()` (secret, bypasses RLS — only after authz) + `createUserClient(jwt)` (RLS). |
| `errors.ts` | Standard `{error:{code,message,retryable}}`, 20 codes, helpers. |
| `auth.ts` | `requireUser` (validate JWT), `requireAdmin(permission)` (assignment active + not locked/revoked + Owner bypass + permission check via RPC + manual join fallback), `verifySuperKey` (delegates to Postgres Argon2 verify). |
| `validate.ts` | zod schemas for uuid/coins/E.164 phone/FF UID/pagination/tournamentCreate, `parseOrThrow`. |
| `idempotency.ts` | Reads `Idempotency-Key` header (UUID v4 expected), warns if not, `idempotentResponse`. |
| `audit.ts` | Inserts into `audit.logs` via secret key, also tries RPC. |

**Convention enforced (eng/03):** `OPTIONS → validate zod → get JWT → requireAdmin → get Idempotency-Key → transact via RPC → audit → return {data}`. Never `await` multi-step money ops without a transaction.

---

## 3. Expo App (`app/`, `src/`)

**Stack:** Expo 51 + expo-router 3.5 + TypeScript strict + `react-native-url-polyfill` + `LargeSecureStore`.

### Secure Supabase Client

`src/lib/LargeSecureStore.ts` fixes the pre-foundation insecure `AsyncStorage` usage:
- 256-bit AES key stored in `expo-secure-store` (Android Keystore / `AFTER_FIRST_UNLOCK`).
- Session JWT (can exceed 2048-byte SecureStore limit) encrypted with CTR mode (`aes-js`) and stored in `AsyncStorage`.
- Implements `getItem/setItem/removeItem` expected by `supabase-js`; `processLock` serializes refresh.

`src/lib/supabase.ts`:
- Only `sb_publishable_…` in the bundle; never `sb_secret_…`.
- `AppState` auto-refresh on foreground.
- `callEdgeFunction()` helper adds `Authorization` + `Idempotency-Key` + normalizes errors.

### Design System

`src/theme/tokens.ts` — warm cream operational palette (`canvas #FFFDF6`, `surface #FFFFFF`, `creamPanel #FFF0C3`, `ink #172016`, `primary #ED5A1F`), sunset stripe `['#C8493B','#ED5A1F','#F4B826','#FFF0C3']`, 12px cards/8px buttons, `touchMin 44`.

`components/SunsetStripe.tsx` — 4px horizontal gradient rendered via 4 flex views (required above bottom nav on every screen per spec 05-ui).

### Routing

- `app/_layout.tsx` — root Stack with Supabase session restore + `onAuthStateChange`, light header.
- `app/index.tsx` — Splash/Security Check; `Redirect` to `(auth)/login` if no session else `(tabs)/dashboard`.
- `app/(auth)/login.tsx` — 3-step mock (email → 6-digit OTP → masked Super Key), helper text `This key is assigned ... Owner.`, generic failure copy ready.
- `app/(tabs)/_layout.tsx` — `Tabs` with 5 tabs `Dashboard · Tournaments · Finance · Players · More`, `tabBarActiveTintColor` primary, `<SunsetStripe />` pinned above bar.
- `app/(tabs)/dashboard.tsx` — cream `priority queue` placeholder card with spec priority order listed; other tabs are stubs with “Foundation ready”.

### Config

- `app.json` — `scheme rushzonecontrol://`, `usesCleartextTraffic=false`, `expo-secure-store` plugin, `orientation portrait`, `userInterfaceStyle light`.
- `eas.json` — `development` (dev client), `preview` (staging internal), `production` (internal) with `EXPO_PUBLIC_APP_ENV`.
- `package.json` scripts: `gen:types` (`supabase gen types typescript --local`), `supabase:start`, `supabase:db:reset`, `supabase:functions:serve`.
- `.env.example` + `tsconfig.json` + `babel.config.js` + `types/database.types.ts` placeholder (compile-safe until `gen:types` run).

---

## 4. Supabase Config

`supabase/config.toml` — Postgres 15, `pgcrypto`/`pgjwt`, `auth.email.otp` enabled, site_url + `rushzone://`/`rushzonecontrol://` redirects, storage `file_size_limit 50MiB`, inbucket for local email testing, no legacy keys committed.

`supabase/README.md` updated below to reflect `supabase/` is populated (was “to be populated”).

---

## 5. What “Foundation Complete” Means for Next Steps

1. `supabase start && supabase db reset` succeeds and creates all tables + RLS + buckets + seed data.
2. `npm install && npm run typecheck` passes (LargeSecureStore + supabase client typed).
3. `npm start` shows Splash → Login (3-step) → Dashboard (cream card) with sunset stripe.
4. Any future Edge Function can `import { requireAdmin, writeAuditLog } from "../_shared/auth.ts"` and be sure RBAC/audit conventions are followed.
5. Money code can immediately call `app.wallet_*` RPCs with idempotency — no need to retrofit ledger locking later.
6. Copy `supabase/` + `docs/shared/` to `rushzone-user-app` (canonical sync rule, eng/00 §2) — foundation is identical in both repos.

---

## 6. Known Gaps (intentionally deferred to Phase 1+)

- No `admin.verify_super_key` Postgres function yet using `pgcrypto` Argon2id (fallback path in `auth.ts` logs warning; Phase 1 must add extension check and implement).
- No Edge Function implementations beyond `_shared` (Phase 1 starts with `owner/bootstrap` + `admin-auth-verify`).
- No `icon.png`/`splash.png`/`adaptive-icon.png` assets (placeholder `.gitkeep`; design provides 390×844).
- No CI RLS test (`player cannot read other player rows`) — required by eng/02 §5 Verification checklist (Phase 1).
- `types/database.types.ts` is a stub — run `supabase gen types` after first `db reset` to get real types.
- `supabase/config.toml` has `projectId 000...` placeholder — replace after `eas init` / Supabase project creation (eng/00 §5).

---

**Authoring note:** All files follow `docs/shared/engineering/01-migrations-and-seed.md` (15 files + storage), `02-rls-policies.md`, `03-edge-function-conventions.md`, `04-client-and-session.md`. If spec and code disagree, spec wins — update code, not spec, and note in `PROGRESS.md`.
