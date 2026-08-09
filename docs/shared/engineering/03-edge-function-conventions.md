# Engineering 03 — Edge Function Conventions

All privileged logic lives in Supabase Edge Functions (Deno/TypeScript) in `rushzone-backend/supabase/functions/`. The mobile apps never touch money, results, rooms, or admin data directly.

## 1. Standard structure
```
functions/
  _shared/
    cors.ts            # CORS preflight + allowed origins
    supabase.ts        # createAdminClient() with sb_secret_…; createUserClient(jwt)
    auth.ts            # requireUser(jwt), requireAdmin(jwt, permission)
    errors.ts          # error shape + error codes
    validate.ts        # zod schemas + validation helper
    idempotency.ts     # key checking helper
    audit.ts           # writeAuditLog()
  tournaments/
    register/index.ts
  ...
```

## 2. Request lifecycle
1. Handle CORS preflight (`OPTIONS`).
2. Parse + validate body/query with **zod**.
3. Extract the user JWT from `Authorization: Bearer <jwt>`.
4. Create a user-context Supabase client (validates the JWT). For privileged actions verify admin assignment + required permission (`requireAdmin(jwt, 'result.publish')`).
5. Read the `Idempotency-Key` header for mutations; reject if malformed.
6. Execute work inside a database transaction / RPC function.
7. Emit notifications and audit log entries.
8. Return a consistent response.

## 3. Two Supabase clients inside a function
```ts
// client on behalf of the caller (RLS applies)
const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_PUBLISHABLE_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` }}})
// privileged client (uses sb_secret_…, bypasses RLS) — only after authz
const adminClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)
```
Even with the secret key, still enforce business rules in code; RLS-bypass is not authorization.

## 4. Admin RBAC check
`requireAdmin(jwt, permission)`:
- Loads `admin.assignments` for `user_id = jwt.sub` with status `active`.
- Loads roles → `role_permissions` → permissions.
- Returns `{ assignmentId, isOwner, permissions }` or throws 403.
- Caches the result per request (not globally) to avoid repeat queries.
- Checks `locked_until` / session revocation where relevant.

## 5. Idempotency
- Every mutating endpoint accepts `Idempotency-Key` (UUID v4 recommended).
- For financial/registration actions, store the key on the affected row/ledger (`idempotency_key` unique). If a duplicate arrives, return the original result with the same status, never perform the action twice.
- Retries from a bad network/tap are safe by design.

## 6. Money & transactions
- Never do multi-step money operations as separate awaited queries without a transaction.
- Prefer a Postgres function (`select wallet_debit(...)`) that does row locking, ledger insert, and balance update atomically.
- Tournament registration: one RPC `register_for_tournament(...)` that re-checks eligibility, picks a slot, debits, and inserts the registration.
- Withdrawal request: one RPC that holds balance and creates the request.
- Result publication: one function/RPC that locks results, computes standings, creates prize awards + ledger credits, updates stats, and flips status.

## 7. Standard error shape
```json
{ "error": { "code": "INSUFFICIENT_BALANCE", "message": "You do not have enough coins.", "retryable": false } }
```
Use stable `code` values so apps can branch. Never leak internal details (stack traces, SQL, Super Key, whether an email/account exists).

## 8. Validation
- Use zod for all inputs: emails, E.164 phones, positive integer coin amounts, UUIDs, enums.
- Reject unknown fields.
- Pagination with `limit`/`offset` (cap limit, e.g. 100).

## 9. Logging & observability
- Structured logs: request id, actor, action, entity id, outcome.
- Never log: secrets, OTPs, Super Keys, raw passwords, full payout numbers in aggregate logs.
- Alert on: function errors > threshold, wallet reconciliation mismatch, finance SLA breaches, repeated auth failures, ad SSV failures, unusual reward patterns.

## 10. CORS & security
- Restrict allowed origins to the app schemes (`rushzone://`, `rushzonecontrol://`) and any web preview domains.
- Set `no-cors`-safe headers; require HTTPS.
- Apply rate limiting at the Edge Function / gateway layer for OTP, register, topup, withdrawal, reward, and admin login.

## 11. Naming & versioning
- Prefix functions by domain: `tournaments-register`, `wallet-topup-create`, `admin-results-publish`, `owner-admins-generate-key`.
- Version via the path when breaking changes are needed (`/functions/v1/...`), with the old version retained until apps update.
