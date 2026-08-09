# 04 — Admin Access, Audit, Reports & Settings

## Admin Access (Owner-only default)
Lists pending applications/invites, approved/suspended/revoked admins, assigned roles/permissions, Super Key status (Pending/Active/Locked/Revoked), last-used timestamp, key version, session state (never the actual key), and recent access/security activity.

Owner actions: approve/reject admin; assign/remove roles; generate one-time Super Key; rotate key; revoke key + active sessions; suspend/reactivate; change permission templates; revoke sessions after suspected compromise. Every action requires confirmation, Owner re-authentication, and an audit event.

### Audit events (security)
`admin_super_key_generated`, `admin_super_key_rotated`, `admin_super_key_revoked`, `owner_super_key_rotated`, `admin_login_failed`, `admin_login_locked`, `admin_session_revoked`, `admin_approved`, `admin_suspended`, `role_permission_changed`. Never include raw key, key hash, OTP, or secret fragments.

## Audit log (immutable)
Records actor, action, timestamp, impacted entity, reason, and before/after where appropriate for: admin approval/suspension/role/key changes; tournament create/publish/material update/cancel and free-slot award; room save/release; result draft/publish/correction; top-up approval/rejection; withdrawal approval/paid/rejection/cancellation; prize/refund/reward/correction ledger activity; player restriction/ban/reactivation; reward campaign config/pause; streak config change, milestone grant, and support freeze grant; referral config change and referral reward review/hold/reject; banner/announcement/featured content changes; policy URL/support URL changes; ad/SSV config changes; app version/force-update and maintenance changes; feature flag/cash-operation change. Routine staff cannot edit/delete audit history (append-only via service role).

## Reports (Owner / Reports Viewer)
Tournament entries/capacity/completion/cancellation; prize/revenue/refund summaries; top-up states/approval performance; withdrawal states/paid/pending/SLA; wallet liability/held summary; reward campaign cost/activity; streak engagement and milestone payouts; referral funnel and rewards; share-card analytics by type/channel; admin action report; player growth/activity. Export as permitted.

## Reconciliation
Wallet snapshot totals vs ledger totals; top-up approval totals vs review records; withdrawal held/paid/rejected vs ledger; prize awards vs official results; duplicate/failed idempotency events. Flag discrepancies — never silently fix; use audited correction.

## Settings (Owner / permissioned)

### Payment & wallet
Official payment instructions/method activation; withdrawal limits/fees/eligibility (purchased vs prize coin eligibility, min/max, fee, daily/weekly/monthly limits, accepted rails, dispute policy); **cash operations flag**; high-value dual-approval threshold; file-retention policy reference.

### Policies & support
- **Policy URLs** (owner-updatable): Terms of Use, Privacy Policy, Tournament Rules, Wallet & Withdrawal Policy, Reward Terms. The player app loads these URLs at consent time and from Profile → Policies; material version bumps force re-consent.
- **WhatsApp support URL** (with optional support hours/expectation text).

### Rewards & ads
- Spin-wheel reward caps/cooldowns live in Rewards Control.
- **Ad / SSV configuration (Owner-only):** mediation provider (Unity LevelPlay/AppLovin MAX), app IDs and ad-unit IDs for AdMob/Unity/AppLovin/Mintegral, provider-specific server-side-verification secrets/callback URLs, and a global enable/disable for ad attempts. SSV callbacks are validated before any coin is granted; secrets are stored only as server env vars / encrypted settings, never returned to the apps.

### Engagement
- Streak milestone/freeze/qualifying-action config (see `06-engagement-content.md`).
- Referral reward amounts, qualification trigger, caps, anti-fraud settings (see `06-engagement-content.md`).

### Notifications
Default notification templates and sender settings.

### Release & maintenance
- **App version / force-update:** set `min_version` and `latest_version` separately for the Player App and Control (e.g., `player_min_version`, `player_latest_version`, `admin_min_version`, `admin_latest_version`); toggle `force_update`. The public `app/version` endpoint serves these; older APKs show the force-update screen.
- **Maintenance mode:** toggle on/off per app (or globally) with a player/admin message; the app shows the maintenance screen and blocks actions.
- Toggling cash operations, maintenance, or release thresholds requires Owner re-authentication and writes a permanent audit entry.

### Content
Home banners, announcement, and featured tournament are managed under Content (see `06-engagement-content.md`).

## Data model
All admin tables live in the `admin` schema (`roles`, `permissions`, `role_permissions`, `assignments`, `assignment_roles`, `security_credentials`, `sessions`) and `audit.logs` — see `../shared/01-database-schema.md`. These are never directly accessible from mobile; only via Edge Functions that verify roles/permissions.

## Supabase keys in Control
Same rule as the player app — session storage must be encrypted (see [`../shared/engineering/04-client-and-session.md`](../shared/engineering/04-client-and-session.md)):
```ts
import 'react-native-url-polyfill/auto'
import { createClient, processLock } from '@supabase/supabase-js'
import LargeSecureStore from '../lib/LargeSecureStore' // AES-256 key in expo-secure-store, encrypted session in AsyncStorage

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, // sb_publishable_… (NOT legacy anon)
  {
    auth: {
      storage: new LargeSecureStore(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  }
)
```
- The app ships with only the publishable key. `sb_secret_…` is used exclusively inside Edge Functions; no secret or legacy JWT in the Control bundle.
- The Super Key is never persisted to device storage. It is held in memory for the admin session and re-entered after auto-lock or for sensitive actions. Biometrics may unlock the local session as a convenience but never replace the server-side Super Key check.
