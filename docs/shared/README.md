# Rush Zone — Shared Foundation

This folder contains specs that are **common to both apps**:

### Product / platform
- [00-overview-and-architecture.md](00-overview-and-architecture.md) — how the two apps relate, single Supabase project, deployment.
- [01-database-schema.md](01-database-schema.md) — the one shared PostgreSQL schema (all tables, enums, RLS, indexes).
- [02-auth-and-supabase-keys.md](02-auth-and-supabase-keys.md) — email OTP auth, **publishable key (`sb_publishable_…`)**, secret key, admin Super Key.
- [03-wallet-and-ledger.md](03-wallet-and-ledger.md) — wallet accounts, immutable ledger, atomic money rules.
- [04-edge-functions-api.md](04-edge-functions-api.md) — every server-authoritative endpoint for both apps.
- [05-storage-and-files.md](05-storage-and-files.md) — buckets, upload limits, signed URLs.
- [06-notifications.md](06-notifications.md) — push + in-app notification system.
- [07-design-tokens.md](07-design-tokens.md) — shared visual language and tokens.

### Engineering (build-ready implementation specs)
- [engineering/00-repos-and-environments.md](engineering/00-repos-and-environments.md) — **three separate repos** (backend, user app, admin app), environments, env vars, Owner bootstrap.
- [engineering/01-migrations-and-seed.md](engineering/01-migrations-and-seed.md) — ordered migrations and seed data.
- [engineering/02-rls-policies.md](engineering/02-rls-policies.md) — concrete RLS policies per table.
- [engineering/03-edge-function-conventions.md](engineering/03-edge-function-conventions.md) — auth/RBAC pattern, idempotency, transactions, errors.
- [engineering/04-client-and-session.md](engineering/04-client-and-session.md) — correct Supabase client with encrypted session storage (LargeSecureStore).
- [engineering/05-push-uploads-ads.md](engineering/05-push-uploads-ads.md) — push worker, file uploads, rewarded-ad SSV contracts, Super Key UX.

Both app folders reference these; they do **not** duplicate the database or auth rules.

## The two apps share one backend

| | Player App | Rush Zone Control (Admin) |
|---|---|---|
| Folder | [`../user-app/`](../user-app/) | [`../admin-app/`](../admin-app/) |
| Codebase | Separate Expo app | Separate Expo app |
| Audience | Free Fire players | Owner + approved admins |
| Client key | `sb_publishable_…` (same project) | `sb_publishable_…` (same project) |
| Privilege | Player RLS policies only | Player RLS + admin-role checks inside Edge Functions |
| Privileged writes | None — all via Edge Functions | None — all via Edge Functions (secret key server-side) |
| Database | **Same Supabase Postgres project** | **Same Supabase Postgres project** |

There is **one Supabase project, one Postgres database, one Auth project**. The apps are two different front-ends talking to the same backend.
