# Engineering 05 — Push, File Uploads & Ad SSV

These are the remaining implementation contracts. They can be built in this order after the core backend/app skeleton is working.

## 1. Push notifications

### Stack
- **Expo Notifications** on the client, **FCM** as the Android push service (works fine for side-loaded APKs — Play Store is not required).
- A send worker in `rushzone-backend` (Edge Function + a queue/cron or a small service) reads `app.notifications` rows and calls Expo's Push API.

### Client
- On login, request Android notification permission, fetch the Expo push token, and POST it to an Edge Function that stores it per profile/device.
- Multiple devices per profile are allowed; remove tokens on logout and when Expo reports them invalid.
- When a push arrives, tapping it opens a `deep_link` stored on the notification row (e.g., `rushzone://tournament/<id>`).
- In-app inbox is the source of truth; push delivery is best-effort. The client subscribes to Realtime on `app.notifications` for live updates.

### Server
- `notifications` table is written by the same transactions that create events (registration, room release, result, top-up decision, etc.).
- The send worker batches pending rows, calls Expo, records delivery outcome, and retries with backoff.
- Push text never contains room passwords, OTPs, balances, payout details, or Super Keys.

## 2. File uploads

### Buckets (see storage spec)
- `tournament-thumbnails` and `banners` — public, admin-only writes.
- `avatars` — public-read, owner-write.
- `payment-proofs`, `admin-docs` — private; access only through short-lived signed URLs for permitted roles.

### Rules
- Uploads go straight from the app to Supabase Storage (not through your API) using the user's JWT + RLS storage policies; never ship the secret key to do an upload.
- Client resizes/compresses before upload (e.g., `expo-image-manipulator`): avatars ≤500 KB, thumbnails ≤1 MB, banners ≤500 KB; WebP preferred.
- Enforce MIME/extension and max size in a Storage policy/trigger as defense-in-depth.
- Object keys namespaced: `avatars/<profile-id>/<uuid>.webp`, `banners/<uuid>.webp`.
- Store only the path in the DB; never Base64 blobs.
- For private files, Edge Functions return a signed URL with a short TTL (e.g., 5 minutes) after a permission check.

## 3. Rewarded ads & server-side verification (SSV)

### Client
- Use a mediation layer — Unity LevelPlay (or AppLovin MAX) — wired with AdMob + Unity Ads at launch; AppLovin/Mintegral added later.
- Mediation SDKs are native modules; build with an **Expo development build** (EAS), not Expo Go.
- The user taps "Watch ad"; the client shows the rewarded ad via the mediation SDK. It does **not** grant a reward from the ad callback.

### Server-side verification (mandatory)
- Each network posts a signed SSV callback to your `rewards/ssv-callback` Edge Function when it verifies a completed view.
- The function:
  1. Validates the network's signature using the provider SSV key stored only as a backend secret.
  2. Looks up the pending `reward_attempts` row created when the user started the ad (with the user id + campaign + idempotency key).
  3. Selects the result server-side (secure random weighted pick from active `reward_items`).
  4. Atomically credits the coins and links the ledger entry.
  5. Marks the attempt rewarded and pushes a notification/Realtime event so the app can animate the outcome.
- Client-only "ad watched" claims are never trusted; if SSV never arrives, no coins are granted and the app shows a retry/cooldown message.

### Per-provider contracts (configure per network's docs at build time)
- **AdMob rewarded SSV:** GET callback with `ad_network`, `ad_unit`, `custom_data` (use the pending attempt id), `reward_amount`, `reward_item`, `signature`, `user_id`, `key_id`; verify with AdMob's published ECDSA public key.
- **Unity Ads SSV:** server callback with a signed payload/HMAC; verify against the Unity secret key.
- **AppLovin MAX:** server-side reward callback with an API key; validate the API key header and payload.
- Store each provider's verification key as a Supabase secret (`AD_SSV_KEY_ADMOB`, etc.), never in the app.

### Test mode
Until `cash_operations_enabled`, run ad networks in test mode and grant only non-redeemable coins. Payouts/redemption stay disabled.

## 4. Admin Super Key UX details
- Owner taps "Generate one-time key"; the backend returns plaintext exactly once in the HTTP response (TLS only) after Owner re-auth. The Owner hands it over via a separate secure channel; the app does not store it.
- Admin login: email → OTP → masked Super Key field (use a secure text input, no screenshot/autofill where possible). The key is sent to an Edge Function over HTTPS, compared against the Argon2id hash in constant time, and held in memory only.
- Auto-lock the admin app after a short inactivity period (e.g., 5 minutes); require Super Key re-entry.
- After 5 failed Super Key attempts, lock the credential for 15 minutes and notify the Owner; show the generic lock message.
- Offer biometric unlock (fingerprint/face) as a *convenience* to unlock the local app session, never as a replacement for the server-side Super Key check.
