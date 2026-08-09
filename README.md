# Rush Zone Control — Owner & Admin App

React Native + Expo (Android-first) operations app for the Owner and approved admins. This repo is **self-contained**: it includes the admin app specs and the complete shared backend/platform contracts, so a coding agent has everything in one place.

## Repository layout

```
.
├── docs/
│   ├── app/                     # Admin app product specs (start here)
│   │   ├── 00-purpose-and-security.md
│   │   ├── 01-navigation-and-dashboard.md
│   │   ├── 02-tournaments-rooms-results.md
│   │   ├── 03-finance-rewards-moderation.md
│   │   ├── 04-admin-access-settings.md
│   │   ├── 05-ui-audit-and-acceptance.md
│   │   ├── 06-engagement-content.md
│   │   └── FULL-SPEC.md
│   └── shared/                  # Common platform specs (same copy in the user-app repo)
│       ├── 00-overview-and-architecture.md
│       ├── 01-database-schema.md
│       ├── 02-auth-and-supabase-keys.md
│       ├── 03-wallet-and-ledger.md
│       ├── 04-edge-functions-api.md
│       ├── 05-storage-and-files.md
│       ├── 06-notifications.md
│       ├── 07-design-tokens.md
│       ├── README.md
│       └── engineering/
│           ├── 00-repos-and-environments.md
│           ├── 01-migrations-and-seed.md
│           ├── 02-rls-policies.md
│           ├── 03-edge-function-conventions.md
│           ├── 04-client-and-session.md
│           └── 05-push-uploads-ads.md
└── supabase/                    # Backend (migrations, Edge Functions) — see note below
    ├── migrations/
    └── functions/
```

> **App code goes at the repo root** (Expo project: `app/`, `src/`, `app.json`, `eas.json`, `package.json`). The `docs/` and `supabase/` folders live alongside it.

## Two repos, one shared backend

There are exactly two repositories:

| Repo | Contains |
|---|---|
| **rushzone-admin-app** (this one) | Rush Zone Control + full `supabase/` backend + shared specs |
| **rushzone-user-app** | Rush Zone Player App + full `supabase/` backend + shared specs |

Both repos contain an **identical copy** of `supabase/` and `docs/shared/` so either can run the backend locally and no coding agent hits a missing dependency.

### Sync rule (important)
- We build the admin app **first**, so **this repo (`rushzone-admin-app`) is the canonical source** for `supabase/` and `docs/shared/` during the admin-first phase.
- Whenever you change anything under `supabase/` or `docs/shared/` here, copy the same change to the `rushzone-user-app` repo before merging (and vice-versa once player work begins). A future improvement could be a shared package/git subtree; for MVP, keep the two copies identical by convention.

## Build Progress

> **Phases 0-8 ✅ COMPLETE — 100% — 2026-08-09** — see [`PROGRESS.md`](./PROGRESS.md) + [`FOUNDATION.md`](./FOUNDATION.md).
> 
> | Phase | Status |
> |---|---|
> | **0 Foundation** (16 migrations, seed, RLS, Storage, Edge `_shared`, Expo) | **✅ 100%** |
> | **1 Auth & RBAC** (bootstrap, Super Key, lockout, sessions) | **✅ 100%** |
> | **2 Tournaments & Presets** (lifecycle, presets, free-slot, rosters) | **✅ 100%** |
> | **3 Rooms & Results Studio** (room delivery, Results publish/correct) | **✅ 100%** |
> | **4 Finance** (topups/withdrawals, dual, wallet correct) | **✅ 100%** |
> | **5 Rewards & Engagement** (Spin Wheel, SSV, streaks, referrals, share) | **✅ 100%** |
> | **6 Moderation & Content** (player search/restrict, banners, announcement, featured, notifications) | **✅ 100%** |
> | **7 Audit/Reports/Settings** (audit query, reports, reconciliation, settings, version) | **✅ 100%** |
> | **8 Polish & User Settings** (`app-config` public, `push-token` + `signed-url`, upload/push, landing/policy) | **✅ 100%** |
> **Overall: 100% (156/156) — All phases complete, beta ready.** [PR #1](https://github.com/codedbytahir/rushzone-admin-app/pull/1)

## Getting started (for coding agents)
1. Read `docs/app/00-purpose-and-security.md`, then `docs/shared/engineering/00-repos-and-environments.md`.
2. Read all of `docs/shared/` (database, auth/publishable key, wallet, Edge Functions, RLS).
3. Start the Expo app at the repo root and implement admin-first slices per the build order in `docs/shared/engineering/00-repos-and-environments.md`.
4. The Supabase client must use the **publishable key** (`sb_publishable_…`), never a legacy `anon`/`service_role` key, and the encrypted `LargeSecureStore` session adapter (see `docs/shared/engineering/04-client-and-session.md`).
5. **Track progress** in `PROGRESS.md` (check off `[x]` after each phase). `FOUNDATION.md` is the foundation audit log — do not delete.
