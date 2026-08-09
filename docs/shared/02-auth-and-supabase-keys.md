# 02 — Authentication & Supabase API Keys

## 1. Key model (use the new keys, not legacy)

Supabase is retiring the long-lived `anon` and `service_role` JWT keys in **late 2026**. This project uses the **new opaque keys from day one**.

| Key | Format | Where it lives | May it ship in the app? |
|---|---|---|---|
| **Publishable key** | `sb_publishable_…` | Bundled in both mobile apps (Player + Control) via env | **Yes — it is designed to be public**; RLS is its protection |
| **Secret key(s)** | `sb_secret_…` | Only in Edge Function / server environment variables | **No — never in mobile code, git, logs, screenshots, or docs** |
| ~~anon JWT~~ | `eyJ…` | Not used | Do not use; it is legacy |
| ~~service_role JWT~~ | `eyJ…` | Not used | Do not use; it is legacy |

> Reference: [Supabase changelog — upcoming API key changes](https://supabase.com/changelog/29260-upcoming-changes-to-supabase-api-keys). Legacy keys still work during the transition but must not appear in this project.

### 1.1 Publishable-key rules
- Each app initializes Supabase with the project URL **and** the `sb_publishable_…` key.
- It is safe to embed, but **only because RLS is on and policies are correct** — a publishable key is not a password.
- It must be the only key present in the mobile bundles and any public CI artifact.
- It can be rotated independently in the Supabase dashboard with zero downtime.

### 1.2 Secret-key rules
- `sb_secret_…` bypasses RLS. It exists **only** as an Edge Function / server env var (`SUPABASE_SECRET_KEY`).
- Edge Functions use the secret key to perform privileged writes after they have independently authenticated and authorized the caller (the user's JWT is verified from the `Authorization` header).
- Never log it, never return it in an API response, never put it in client `.env` files named `EXPO_PUBLIC_*`.
- Create **named secret keys per use** (e.g., `wallet-fn`, `admin-fn`) so a leak can be revoked without touching everything.

### 1.3 Header behavior
The new keys are opaque (not JWTs), so they **cannot** be placed in the `Authorization: Bearer …` header (except for a temporary backward-compatibility match against `apikey`). Clients send:
- `apikey: sb_publishable_…`
- `Authorization: Bearer <user-jwt>` (the user's session JWT, after sign-in)

Supabase's client libraries handle this automatically when initialized with the publishable key.

## 2. Player authentication — Email OTP

### 2.1 Method
- Players sign in with **email + one-time passcode** via Supabase Auth `signInWithOtp({ email, options: { shouldCreateUser: true } })`.
- OTP emails are sent through **Brevo's free SMTP** (300 emails/day) configured in Supabase Dashboard → Auth → SMTP Settings. The default Supabase email service (≈2–4/hr) is for local development only.
- Code is a 6-digit numeric OTP with a short expiry (5–10 minutes), single-use.
- Passwordless only; no passwords in MVP.

### 2.2 Sequence
```text
App: enter email
  → supabase.auth.signInWithOtp({ email })
  → email delivered via Brevo SMTP
App: enter 6-digit code
  → supabase.auth.verifyOtp({ email, token, type: 'email' })
  → Supabase returns session (JWT + refresh token)
App: upsert app.profiles row (if new) and require Profile Setup
```

### 2.3 Requirements
- Rate-limit sends/verifications by email, device, and IP (Supabase built-in limits plus Edge Function checks for sensitive actions).
- Generic errors: "Unable to sign in. Check your details and try again." Do not reveal whether an email is registered.
- Mask email in profile summaries (`a***@gmail.com`) where appropriate.
- Re-authenticate (fresh OTP) before: paid tournament entry, withdrawal, profile/email change, payout-account change.
- Refresh/session tokens are persisted using the `LargeSecureStore` adapter (AES-256 key in `expo-secure-store`, encrypted session blob in AsyncStorage). Never store a raw/unencrypted session or any secret in plain AsyncStorage.
- One device per account policy enforced server-side via a device/session check on sensitive actions.

## 3. WhatsApp phone number (required, not a login factor)
- `whatsapp_phone` is collected during Profile Setup and normalized to E.164 (`+92…`).
- In MVP it is **format-validated only**. It is used for:
  - WhatsApp support deep-link identity/context.
  - Easypaisa/JazzCash withdrawal details when withdrawals are enabled.
  - Future WhatsApp OTP as an optional second factor (not built now; would use Baileys self-hosted sender or the official WhatsApp Cloud API at that time).
- The app does **not** send an SMS/WhatsApp OTP to this number in MVP, and the number is not used to log in.

## 4. Admin authentication — Email OTP + Super Key

Staff (Owner/Admins) also authenticate with email OTP via Supabase Auth, **plus** a second factor: an individual, Owner-issued **Admin Super Key**.

```text
Staff email → email OTP → Admin Super Key
   → Edge Function verifies OTP session + Super Key hash + admin assignment + roles
   → issues an admin session (short-lived)
```

### 4.1 Super Key properties
- Long random passphrase/key, unique per admin.
- Stored only as an **Argon2id hash** (`admin.security_credentials.key_hash`); plaintext is shown to the Owner **once** at generation and never stored.
- Admin cannot view, rotate, or reset their own key — only the Owner can generate/rotate/revoke.
- 5 failed attempts locks the key temporarily (e.g., 15 min) and notifies the Owner.
- Rotation/revocation immediately invalidates the old key and active sessions.
- Re-entry required for sensitive Owner actions: role change, admin approval, key rotation, cash-operations toggle, high-value override.

### 4.2 Owner bootstrap
- There is **no hard-coded default Owner key** in source, config, seeds, or docs.
- Initial Owner is provisioned by a one-time bootstrap secret held outside the app (server env / secret manager) that forces first-time Super Key creation.
- Owner recovery is a separate high-security process, not a normal password reset.

### 4.3 Admin sessions
- Short-lived JWT with explicit role/permission claims (refreshed while valid).
- Re-authentication forced on: inactivity timeout, Super Key rotation, role change, suspension, or a backend risk signal.
- Owner can remotely revoke sessions (`admin.sessions.revoked_at`).
- Device must never persist the raw Super Key; it is held only in memory during the session and re-entered for privileged actions.

## 5. Authorization model

### 5.1 Players
- Authorization is enforced by **Postgres RLS** using `auth.uid()`.
- Sensitive writes go through Edge Functions that verify the user's JWT and apply business rules.

### 5.2 Admins (RBAC)
- Each admin has an `admin.assignments` row with status and one or more roles.
- Roles map to permissions (`admin.role_permissions`). Suggested groups: Tournament Management, Room & Match Ops, Results, Top-up Review, Withdrawal Ops, Rewards, Support/Moderation, Notifications, Reports, Access Administration (Owner-only default).
- **Every protected Edge Function checks permissions server-side.** Hiding a button in the UI is not authorization.
- Least privilege: combine roles only as needed; top-up review does not imply withdrawal payout; support does not imply payment-proof access.
- Segregation of duties: an admin cannot approve their own financial request; above a configurable threshold, withdrawals require a second reviewer (four-eyes).

## 6. Auth audit events

Emitted to `audit.logs`, never containing raw secrets:
```
admin_login_failed, admin_login_locked, admin_session_revoked,
admin_super_key_generated, admin_super_key_rotated, admin_super_key_revoked,
owner_super_key_rotated, admin_approved, admin_suspended,
role_permission_changed, cash_ops_toggled
```

## 7. Environment variables (how they appear in each app)

Player app / Admin app (Expo, **public** — publishable only):
```bash
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
```

Edge Functions / server (**secret** — never in the apps):
```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_…            # privileged server key
BREVO_SMTP_USER=…
BREVO_SMTP_PASS=…
```
