# Supabase backend (shared)

This folder contains the migrations, seed data, and Edge Functions for Rush Zone.

> **Canonical source:** during the admin-first build, the `supabase/` and `docs/shared/`
> folders in `rushzone-admin-app` are the source of truth. Keep this copy identical to
> the admin repo's copy (copy changes both ways).

## Layout (to be populated)
```
supabase/
├── config.toml
├── migrations/      # ordered SQL migrations (0001_*.sql ...)
├── seed.sql         # non-sensitive seed data
└── functions/
    └── _shared/     # CORS, auth, RBAC, errors, db helpers
```

See `docs/shared/engineering/01-migrations-and-seed.md` and `03-edge-function-conventions.md`.
