# Engineering 02 — Row Level Security Policies

RLS is enabled on **every** table in `app`, `admin`, and `audit`. The mobile apps connect with the publishable key; direct table access is permitted only where these policies allow. All privileged/financial writes go through Edge Functions using the secret key.

## 1. Global rules
- Enable RLS before creating policies: `alter table <t> enable row level security;`
- Default deny: do not grant broad `to anon, authenticated` access.
- Players can only read/update rows belonging to their own `auth.uid()`.
- Admin/auditor access to `admin.*` and `audit.*` is **not** granted through RLS at all; those tables are reached only via Edge Functions that verify roles and then use the secret key. This avoids duplicating RBAC in SQL policies.
- Service-role/secret key bypasses RLS and is used only inside Edge Functions.

## 2. Player-accessible tables

### `app.profiles`
```sql
-- players read their own row
create policy "profiles_self_read" on app.profiles for select
  using (id = auth.uid());
-- players update only safe own fields (email/phone/ff_uid changes may go through functions)
create policy "profiles_self_update" on app.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
-- insert handled by an Edge Function after email OTP (so app_uid/referral_code are server-generated)
```
Public display fields for cards (display name, avatar, app UID) can be exposed through a function or a restricted view that never returns email/phone/FF UID.

### `app.wallet_accounts`, `app.wallet_ledger`
```sql
create policy "wallet_self_read" on app.wallet_accounts for select using (profile_id = auth.uid());
create policy "ledger_self_read" on app.wallet_ledger for select using (profile_id = auth.uid());
-- no insert/update/delete for clients; all writes via wallet functions
```

### `app.tournaments`
```sql
-- anyone authenticated can read published/visible events
create policy "tournaments_public_read" on app.tournaments for select
  using (status in ('scheduled','registration_open','registration_full','registration_closed',
                    'room_released','live','results_pending','completed'));
-- no direct client writes
```

### `app.registrations`
```sql
create policy "reg_self_read" on app.registrations for select using (profile_id = auth.uid());
-- inserts via tournaments/register Edge Function (atomic + idempotent)
```

### `app.rooms`
No direct select for players (password must never leak). Players fetch room credentials through the `tournaments/room` Edge Function, which checks confirmed registration and release time, and returns only the fields needed.

### `app.match_results`, `app.prize_awards`
```sql
create policy "results_self_read" on app.match_results for select
  using (profile_id = auth.uid() and status in ('published','corrected'));
create policy "prizes_self_read" on app.prize_awards for select
  using (profile_id = auth.uid());
```
Drafts are never visible to players.

### `app.topup_requests`, `app.withdrawal_requests`, `app.withdrawal_methods`
```sql
create policy "topups_self_read" on app.topup_requests for select using (profile_id = auth.uid());
create policy "topups_self_insert" on app.topup_requests for insert with check (
  profile_id = auth.uid() and status = 'pending'
);
create policy "withdrawals_self_read" on app.withdrawal_requests for select using (profile_id = auth.uid());
create policy "methods_self_all" on app.withdrawal_methods for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
```
Status transitions and balance movements are enforced in Edge Functions/DB functions — RLS only scopes rows.

### `app.reward_attempts`, `app.streak_*`, `app.referrals`, `app.card_share_events`
- Self-read on rows where `profile_id = auth.uid()`.
- Inserts for `card_share_events` allowed for own profile (analytics); reward/streak writes only through functions/Edge Functions.

### `app.notifications`
```sql
create policy "notifications_self_read" on app.notifications for select using (profile_id = auth.uid());
create policy "notifications_self_update_read" on app.notifications for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid() and read_at is not null);
```

### `app.banners`
Public read for active/in-schedule banners only.

## 3. Tables with no direct client access
The following have RLS enabled but **no client policies** (all access via Edge Functions):
`app.rooms`, `app.rosters`, `app.roster_members`, `app.internal_notes`, `app.restrictions`, `app.risk_flags`, all `admin.*`, and all `audit.*`.

## 4. Profile setup helper (recommended)
Use a Postgres function `app.complete_profile(...)` (or do it in an Edge Function) that atomically:
- sets display name, FF UID, in-game name, WhatsApp phone, avatar;
- generates `app_uid` (4-digit, retry on collision) and `referral_code`;
- creates `wallet_accounts` and `profile_stats` rows;
- attributes referral if a valid referral code was supplied at sign-up.

## 5. Verification checklist
- Every table: `relrowsecurity = true` (verify with `pg_tables`).
- No policy uses `true` for write operations on financial tables.
- Run an automated test in CI that connects as a player (publishable key + a test user JWT) and asserts it cannot read other players' rows, write to wallet/result/admin tables, or read `rooms.room_password`.
