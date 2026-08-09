# Engineering 00 — Repositories & Environments

There are **two separate Git repositories** (no monorepo, no separate backend repo). Each app repo is **self-contained**: it includes the app code, the full shared specs, and a complete `supabase/` backend folder. This is deliberate so a coding agent working in either repo never hits a missing dependency.

## 1. The two repositories

### `rushzone-admin-app` (build this first)
```
rushzone-admin-app/
├── app/, src/                   # Expo Rush Zone Control app (app code at root)
├── app.json, eas.json, package.json
├── docs/
│   ├── app/                     # admin product specs
│   └── shared/                  # shared platform/engineering specs
└── supabase/
    ├── migrations/              # shared SQL migrations
    ├── seed.sql
    └── functions/               # all Edge Functions
```

### `rushzone-user-app`
Same structure, with the Player App instead of Control:
```
rushzone-user-app/
├── app/, src/                   # Expo Player app
├── docs/{app,shared}/
└── supabase/                    # identical copy of migrations + functions
```

## 2. Keeping the two repos consistent
- Both repos contain **identical copies** of `supabase/` (migrations, functions, config) and `docs/shared/`.
- During the admin-first build, **`rushzone-admin-app` is the canonical source** for `supabase/` and `docs/shared/`.
- Sync rule: whenever `supabase/` or `docs/shared/` changes in one repo, copy the exact same change to the other repo before merging. (A shared package or git subtree can replace this manual sync post-MVP; for MVP, identical copies by convention.)
- App-specific code (`app/`, `src/`, `docs/app/`) is never copied; it stays in its own repo.
- There is one logical database and one set of Edge Functions — they are just versioned identically in both repos.

## 3. Why no separate backend repo
A standalone backend repo forces coding agents (and humans) to context-switch across repos and produces "cannot find shared types/function" errors. Since both apps share one backend, co-locating the backend with each app keeps every checkout runnable. The cost is manual two-way sync of `supabase/`, which is acceptable at MVP size.

## 4. Environments
| Env | Supabase project | Purpose | Cash ops |
|---|---|---|---|
| `local` | Supabase CLI (`supabase start`) | Dev work, offline | off |
| `staging` | Dedicated hosted project | Integration, beta, ad test mode | off |
| `production` | Hosted project | Live | off until approved |

Each app has Expo dev/staging/production builds pointing at the matching Supabase URL + publishable key. Each Supabase project has its own publishable/secret key pair.

## 5. Accounts & credentials to set up before coding
- Supabase account + project; create **publishable** and **secret** keys (no legacy `anon`/`service_role`).
- Brevo account + SMTP user/pass (300/day free); configure in Supabase Auth SMTP settings.
- Expo account + EAS; `eas init` in each app; Android development builds.
- FCM project for push (works for side-loaded APKs); add the FCM server key as a Supabase/Edge secret.
- Ads (later): Unity/AdMob/AppLovin accounts, test ad-unit IDs, SSV callback keys as backend secrets.

## 6. Environment variables

### App repos (public — RLS is the gate)
```bash
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
```
No secret key, no service_role, no FCM/SSV secrets in an app repo.

### Backend / Edge Functions (local `.env` and CI secrets — never committed)
```bash
SUPABASE_URL=…
SUPABASE_SECRET_KEY=sb_secret_…
BREVO_SMTP_USER=…
BREVO_SMTP_PASS=…
FCM_SERVER_KEY=…
AD_SSV_KEY_ADMOB=…
AD_SSV_KEY_UNITY=…
OWNER_BOOTSTRAP_SECRET=…
```
Set hosted secrets with `supabase secrets set KEY=value`.

## 7. Initial Owner bootstrap
There is no hard-coded default Owner. Procedure:
1. Deploy backend (from either repo's `supabase/`).
2. Create the first staff user via Supabase Auth (email) or let them request an email OTP once.
3. Run a one-time bootstrap Edge Function (or SQL as the postgres role) requiring `OWNER_BOOTSTRAP_SECRET` that creates an `admin.assignments` row with `is_owner=true, status='active'` and forces first-login Super Key creation.
4. After the first successful Owner login, rotate/disable the bootstrap secret.

## 8. Deployment
- Migrations: `supabase db push`; functions: `supabase functions deploy`. Because both repos carry the same `supabase/`, deploy from the canonical repo (admin first during this phase) to avoid divergent deploys.
- Apps: `eas build -p android --profile preview|production` produces side-loadable APKs hosted at a stable download URL. The `app/version` endpoint plus an in-app updater enforces min/latest versions; use EAS Update for JS-only fixes and force-update for native changes.
