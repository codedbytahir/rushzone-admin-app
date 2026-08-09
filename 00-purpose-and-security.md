# 00 — Purpose & Security

## Purpose
Rush Zone Control is the secure mobile operations app used to run the business. The Owner and permission-limited admins create tournaments, manage registrations and internal rosters, release rooms, enter results, review top-ups/withdrawals, manage rewards, moderate players, control admin access, and inspect audit/reporting data.

> Every tournament, result, coin movement, staff permission, and sensitive override is controlled by an authorized person and leaves an auditable history.

This is **not** a set of hidden player screens. It is a separate secured app with Owner-approved access, backend-enforced permissions, privileged re-authentication, private operational data, and audit controls.

## Financial gate
Build/test now with test coins, test payment proof, simulated approvals/payouts, and test admin accounts. The server flag `cash_operations_enabled` remains off until documented approval; the Owner sees its state and must re-authenticate to change it (with a permanent audit entry).

## Roles
- **Owner:** highest privilege; approves/suspends/removes admins; generates/rotates/revokes Super Keys and sessions; manages roles; configures payment instructions, payout methods, wallet policy/limits, support link, feature flags, policy versions; toggles cash ops, withdrawals, reward campaigns, maintenance; views all audit/finance/security data; approves material tournament changes and high-risk corrections/dual-control thresholds.
- **Admin:** no implicit permission; only what the Owner grants at backend level.

Suggested permission groups: Tournament Management, Room & Match Ops, Results, Top-up Review, Withdrawal Ops, Rewards (includes Streaks), Referrals/Engagement, Content & Marketing (banners/announcement/featured), Support/Moderation, Notifications, Reports, Release & Settings, Access Administration (Owner-only default).

## Enforcement
- Backend checks permission for **every** protected command. Hiding a button is not authorization.
- The app fetches only permitted fields; sensitive data is masked/minimized by role.
- Least privilege; combine roles only as needed. Top-up review does not grant withdrawal payout; support does not grant payment-proof access.
- Admin cannot approve their own financial request. Four-eyes for withdrawals above an Owner-configured threshold (creator/reviewer/payer differ).
- Role change, key change, finance decision, result change, tournament change, and user restriction all create audit events.

## Access: email OTP + individual Super Key
```
Staff email → email OTP (Supabase Auth + Brevo SMTP)
  → individual Owner-issued Admin Super Key
  → Edge Function verifies session + Argon2id key hash + assignment status + roles/risk
  → short-lived admin session
```
- Generic failure: `Unable to verify admin access.` (does not reveal which factor failed).
- The app uses the **publishable key** (`sb_publishable_…`) for the Supabase client; all privileged actions call Edge Functions that use `sb_secret_…` server-side.
- No legacy `anon`/`service_role` JWTs anywhere.

### Super Key handling
- Unique per admin; stored only as Argon2id hash; plaintext shown to Owner **once** at generation.
- Admin cannot view/reset/rotate own key (Owner does). Rotation/revocation immediately invalidates old key and sessions.
- Never store plaintext in notes, chats, screenshots, source, logs, or notifications.
- 5 failed attempts temporarily locks the key and notifies Owner.
- Re-authenticate (Super Key) for: role change, admin approval, key rotation, high-value withdrawal override, cash-ops enablement, recovery.
- No default/hard-coded Owner key. First-run uses an out-of-band bootstrap secret to create the initial Owner Super Key.

### Sessions
- Short-lived JWT with role/permission claims; secure refresh.
- Force re-auth after inactivity, sensitive action, key rotation, role change, suspension, or risk signal.
- Owner can remotely revoke sessions; raw Super Key and raw OTP are never stored on device.
