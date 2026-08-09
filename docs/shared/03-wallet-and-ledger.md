# 03 — Wallet & Ledger Rules

## 1. Principles

- 1 Rush Coin = PKR 1; integer `bigint` only, never floats, never fractions.
- The **ledger is immutable**. There are no deletes or in-place edits. Corrections are new compensating entries.
- The client never writes a balance. All movements go through Edge Functions in a single Postgres transaction.
- Balances are split into **available**, **held**, and **pending** states.

## 2. Wallet account

`app.wallet_accounts(profile_id, available_balance, held_balance, version)`:
- `available_balance` = spendable coins.
- `held_balance` = coins reserved (e.g., a pending withdrawal).
- `version` is incremented on each change (optimistic concurrency) and the row is locked (`SELECT … FOR UPDATE`) during transactions.

The cached balances must equal the sum of the ledger. A reconciliation job compares the two and flags drift in `app.risk_flags`; it **never silently "fixes"** balances.

## 3. Ledger entry shape

Each row in `app.wallet_ledger` records:
- `direction`: `credit | debit | hold | release`
- `type`: one of the `ledger_type` enum values
- `amount` (positive)
- `balance_after` (snapshot of available balance for that profile, after applying the entry)
- `idempotency_key` (unique)
- `reference_type` / `reference_id` (linked tournament, withdrawal, reward, etc.)
- `created_by` (system or admin actor)

### Effects by activity

| Activity | Direction / Effect |
|---|---|
| Top-up request | none (pending only) |
| Top-up approved | credit available |
| Tournament entry | debit available |
| Tournament refund / slot refund | credit available |
| Prize award | credit available |
| Reward paid attempt cost | debit available |
| Reward coin award | credit available |
| Streak/referral reward | credit available |
| Withdrawal requested | hold: available → held |
| Withdrawal paid | finalize debit from held |
| Withdrawal rejected/cancelled | release: held → available |
| Admin correction | audited compensating credit/debit |

## 4. Atomic operations (server functions)

All wallet mutations are implemented as Postgres functions / Edge Function transactions that:

1. Take an `idempotency_key`; if it already exists, return the prior result (safe retry).
2. `SELECT … FOR UPDATE` the wallet row.
3. Validate state and balance.
4. Insert the ledger entry.
5. Update the wallet balance.
6. Return the new balance.

### Key operations
- `wallet_debit(profile, amount, type, ref, key)`
- `wallet_credit(profile, amount, type, ref, key)`
- `wallet_hold(profile, amount, type, ref, key)` — available → held
- `wallet_release(profile, amount, type, ref, key)` — held → available
- `wallet_finalize_held(profile, amount, type, ref, key)` — held → gone

## 5. Tournament entry (atomic + slot system)

Registration runs in one transaction:
1. Re-check eligibility (auth, profile complete, tournament status, capacity, no existing active reg, sufficient balance, not restricted).
2. Pick the next available `slot_number` or honor a chosen free slot per rules.
3. Insert `app.registrations`.
4. `wallet_debit(… 'tournament_entry' …)`.
5. If this tournament uses the "free slot" promotion and conditions are met (all slots booked / match started), one slot is selected; that registration receives a `slot_refund` credit. This is itself an audited ledger entry.
6. Emit notification and audit record.

Duplicate taps, retries, and app reinstalls cannot double-register or double-charge because of the unique `(tournament_id, profile_id)` constraint and idempotency key.

## 6. Top-up approval

1. Validate the request is still `pending`.
2. Check the external reference has not already been approved (unless a permissioned override is used).
3. `wallet_credit(… 'topup_approved' …)`.
4. Set status `approved`, record reviewer, timestamp, and reference.
5. Notify player + audit.

Admins **never type a balance directly**.

## 7. Withdrawal lifecycle

```
pending_review → approved → Paid
   or rejected / cancelled → held coins return to available
```

- On request: `wallet_hold(amount)` atomically; set status `pending_review`.
- On approve (optional depending on workflow): status `approved`, held remains.
- On Pay: require method, account snapshot, external payout reference, operator, timestamp; dual approval above threshold; `wallet_finalize_held(...)`; status `paid`; notify + audit.
- On reject/cancel: `wallet_release(...)`; status set; reason recorded; notify + audit.
- A completed payout is immutable; corrections use a new compensating entry.

## 8. Rewards & streaks

- A paid spin does `wallet_debit('reward_cost')` and, after server-side outcome selection, `wallet_credit('reward_award')` in the same transaction.
- A validated ad spin does no debit; the reward credit is created after SSV verification.
- Streak/referral milestones credit via the same `wallet_credit` path, each with its own idempotency key so they can never be claimed twice.

## 9. Feature flag behavior

When `cash_operations_enabled = false`:
- Real-money top-up/withdrawal rails are hidden/disabled.
- Any credits/debits created are **test/non-redeemable coins** (a flag on the ledger entry / environment separates them), and no real payout instructions are exposed.
- The Owner sees the flag state in Control; toggling it requires re-auth and writes an audit record.
