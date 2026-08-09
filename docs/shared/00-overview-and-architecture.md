# 00 — Overview & Architecture

## 1. System shape

Rush Zone consists of **two separate React Native + Expo mobile apps** backed by **one Supabase project**:

```text
┌─────────────────────┐   ┌──────────────────────────┐
│   Player App (APK)  │   │  Rush Zone Control (APK) │
│  user-app/          │   │  admin-app/              │
│  sb_publishable_…   │   │  sb_publishable_…         │
└─────────┬───────────┘   └────────────┬─────────────┘
          │                            │
          │   HTTPS (RLS-gated)        │  HTTPS (RLS + admin role)
          ▼                            ▼
┌──────────────────────────────────────────────────────┐
│              Supabase Platform (one project)          │
│                                                       │
│  Postgres  │  Auth (email OTP)  │  Storage  │ Realtime │
│           ▲                        ▲                   │
│           │                        │                   │
│     Edge Functions (server-authoritative)              │
│     using sb_secret_… (never shipped to apps)         │
└──────────────────────────────────────────────────────┘
```

- The **Player App** and **Rush Zone Control** are independently built, versioned, and distributed (side-loaded APKs; not published to app stores in MVP).
- They share **one database**. Tables are not duplicated; Row Level Security (RLS) and Edge Functions decide what each caller may read/write.
- No mobile client ever writes sensitive data directly. Every privileged operation goes through a versioned Edge Function (see [04-edge-functions-api.md](04-edge-functions-api.md)).
- **Three separate Git repositories** — not a monorepo (see [engineering/00-repos-and-environments.md](engineering/00-repos-and-environments.md)): `rushzone-backend` (migrations, Edge Functions, shared types), `rushzone-user-app`, `rushzone-admin-app`.

## 2. Backend stack (MVP)

| Layer | Choice | Notes |
|---|---|---|
| Database | **PostgreSQL 16** (Supabase managed) | Relational, ACID; integer coins only |
| Auth | **Supabase Auth — Email OTP** | Free via Brevo SMTP (300/day free) |
| API | **Supabase Edge Functions** (Deno/TypeScript) | All privileged commands; use `sb_secret_…` |
| Public client access | PostgREST with **RLS** | Reads only what policies allow |
| Storage | Supabase Storage | Public `tournament-thumbnails`; private `avatars`, `payment-proofs`, `admin-docs` |
| Realtime | Supabase Realtime | In-app notifications, live tournament state |
| Push | Expo Notifications + FCM (Android) | No push guaranteed; in-app inbox is source of truth |
| Ads | Unity LevelPlay mediation (AdMob + Unity Ads, AppLovin/Mintegral later) | Rewarded video with server-side verification |

## 3. Environments

- **Staging:** a separate Supabase project with `cash_operations_enabled = false`, test coins, Brevo sandbox/own test inboxes. All new work lands here first.
- **Production:** the live project; real-money feature flag stays off until documented approval.

## 4. Time, money, IDs

- All timestamps stored **UTC**, displayed **PKT (`Asia/Karachi`)**.
- All money values are **whole integer Rush Coins** (1 coin = PKR 1). Never use floats. Never store money as `numeric` with fractions; use `bigint`.
- All primary keys are `uuid` (or `bigserial`/`identity` where clearly internal).
- Every money-moving or registration request carries a client-generated **idempotency key**.

## 5. Release gate

A single server feature flag `cash_operations_enabled` (boolean, Owner-only, audited) gates all real-money behavior. It is **off by default**. When off:

- Top-ups and withdrawals are simulated (test coins only).
- No Easypaisa/JazzCash real account details are shown to players.
- Rewarded ads still run (in test mode) but grant non-redeemable coins.
- The Owner sees the current state in Control and must re-authenticate to flip it.

## 6. App distribution (MVP)

Apps are **not** on Google Play or the App Store in MVP:
- Build production APKs with EAS Build (`eas build -p android --profile preview`).
- Host the APK at a stable URL and share it; include an "install from unknown sources" guide in the app and on the download page.
- Version endpoint returns `{ min_version, latest_version, force_update, maintenance }` so an old APK can be blocked.

## 7. Platform

- Android-first (min SDK 24 / Android 7.0+), target current SDK.
- iOS-ready architecture (no Android-only APIs locked in), but iOS builds are deferred until a distribution path exists.
- Design target 390 × 844, 44px minimum touch targets, safe-area aware.
