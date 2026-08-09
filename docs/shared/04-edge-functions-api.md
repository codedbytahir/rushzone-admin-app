# 04 — Edge Functions / API Surface

All sensitive operations are exposed as versioned Supabase Edge Functions under `/functions/v1/`. They:
1. Verify the caller's JWT (Supabase Auth) from `Authorization: Bearer <jwt>`.
2. Use the **secret key** (`sb_secret_…`) server-side for elevated writes.
3. Enforce permission checks, idempotency, and atomic transactions.
4. Emit notifications and audit entries.

Reads of public/owned data can go through PostgREST with RLS using the **publishable key**.

Conventions:
- All requests accept an `Idempotency-Key` header for mutations.
- All times in responses are ISO 8601 UTC; clients render PKT.
- Errors use a stable shape: `{ error: { code, message, retryable } }`.

## 1. Auth & profile

| Function | Method | Purpose |
|---|---|---|
| `auth/signin-otp` | POST | Request email OTP (rate-limited) |
| `auth/verify-otp` | POST | Verify code (wraps Supabase verify) |
| `profile/me` | GET / PATCH | Read/update own profile |
| `profile/setup` | POST | Complete required profile (display name, FF UID, in-game name, WhatsApp phone) |
| `profile/stats` | GET | Aggregated official stats |
| `admin/assignments/me` | GET | Current admin's roles/permissions |

## 2. Tournaments (player side)

| Function | Purpose |
|---|---|
| `tournaments/list` | Published tournaments with filters/status |
| `tournaments/get` | Full tournament detail |
| `tournaments/register` | Atomic individual entry + debit + slot assignment |
| `tournaments/my` | Player's registrations grouped by lifecycle |
| `tournaments/room` | Returns room credentials only if registered and released |
| `tournaments/result` | Official result for the player |

## 3. Tournaments (admin side)

All require admin permission checks:

| Function | Purpose |
|---|---|
| `admin/tournaments/list` | All events incl. drafts, filters by creator/status |
| `admin/tournaments/create` | Wizard step save / publish |
| `admin/tournaments/update` | Edit (with material-change rules after entries exist) |
| `admin/tournaments/cancel` | Cancel with refund/reschedule outcome |
| `admin/tournaments/preset` | Save/apply daily preset templates |
| `admin/tournaments/entrants` | Entrant list + roster assignment |
| `admin/tournaments/assign-roster` | Assign player to roster/lobby |
| `admin/tournaments/set-room` | Save room credentials (restricted) |
| `admin/tournaments/release-room` | Release room to entrants + notify |
| `admin/tournaments/award-free-slot` | Trigger/refund free slot |

## 4. Results Studio (admin)

| Function | Purpose |
|---|---|
| `admin/results/get` | Draft results rows for an event |
| `admin/results/save-draft` | Save kills/placement/points/DQ |
| `admin/results/preview` | Compute standings/prizes preview |
| `admin/results/publish` | Lock, compute, credit prizes, update stats, complete event, notify |
| `admin/results/correct` | Audited correction with compensating ledger |

## 5. Wallet

| Function | Caller | Purpose |
|---|---|---|
| `wallet/me` | player | balances + summary |
| `wallet/history` | player | paginated ledger history |
| `wallet/topup/create` | player | submit manual top-up (payment method + TX reference) |
| `wallet/withdraw/create` | player | request withdrawal (hold balance) |
| `wallet/withdraw/cancel` | player | cancel pending request (release held) |
| `admin/topups/list` | admin | queue with filters |
| `admin/topups/review` | admin | approve (credit) / reject (reason) |
| `admin/withdrawals/list` | admin | queue |
| `admin/withdrawals/approve` | admin | optional approve step |
| `admin/withdrawals/mark-paid` | admin | record payout reference + finalize held (dual-control) |
| `admin/withdrawals/reject` | admin | reject + release held |
| `admin/wallet/correct` | owner | audited compensating correction |

## 6. Rewards

| Function | Caller | Purpose |
|---|---|---|
| `rewards/campaign` | player | active campaign, config, today's attempts |
| `rewards/attempt/ad` | player | request ad attempt (returns ad token config; result set after SSV) |
| `rewards/ssv-callback` | ad network | server-side verification callback (signed) |
| `rewards/attempt/paid` | player | atomic debit + server-selected result + credit |
| `rewards/history` | player | reward history |
| `admin/rewards/campaigns/*` | admin | CRUD, pause, weights/caps |
| `admin/rewards/dashboard` | admin | attempts, spend, validation failures, risk |

## 7. Streaks

| Function | Caller | Purpose |
|---|---|---|
| `streaks/me` | player | current/longest/total, heat-map, next milestone, freezes |
| `streaks/claim` | player | claim a reached milestone (idempotent) |
| Internal `streaks/touch` | system | called after qualifying events to mark a PKT day / award tiers |
| `admin/streaks/config/get` | owner | milestone tiers, rewards, freeze policy, qualifying-action toggles |
| `admin/streaks/config/update` | owner | change tiers/coins/freeze grant (audited) |
| `admin/streaks/grant-freeze` | support | grant a streak freeze to a player (e.g., support resolution; audited) |

## 8. Referrals & share

| Function | Caller | Purpose |
|---|---|---|
| `referrals/me` | player | code, link, referrals count/state |
| `referrals/track` | system | attribute sign-up via code (idempotent) |
| `admin/referrals/config/get` | owner | reward amounts, qualifying trigger, caps, anti-fraud settings |
| `admin/referrals/config/update` | owner | change referral config (audited) |
| `admin/referrals/list` | support/owner | pending/rewarded/held referrals with risk flags |
| `admin/referrals/review` | support/owner | approve/hold/reject a suspicious referral (audited ledger effect) |
| `share/event` | player | record `card_share_events` for attribution |
| `admin/share/report` | reports | share-card funnel analytics by type/channel |

## 9. Content (home screen)

| Function | Caller | Purpose |
|---|---|---|
| `content/banners` | player | active banner slider images + optional links |
| `admin/content/banners/*` | marketing/owner | CRUD banners (upload image, set link, order, schedule, active) |
| `admin/content/announcement` | marketing/owner | set the Home announcement/promotion slot text/link (audited) |
| `admin/content/featured-tournament` | tournament/owner | pin which tournament is the Home featured hero |

## 10. Players / moderation (admin)

| Function | Purpose |
|---|---|
| `admin/players/search` | by name, app UID, FF UID, masked phone, registration, reference |
| `admin/players/get` | permission-aware detail + history + wallet (finance roles only) |
| `admin/players/note` | add internal note |
| `admin/players/restrict` | apply/release reasoned restriction |

## 11. Admin access management (Owner)

| Function | Purpose |
|---|---|
| `owner/admins/list` | pending/active/suspended/revoked |
| `owner/admins/approve` | approve + assign roles |
| `owner/admins/suspend` / `reactivate` / `remove` | lifecycle |
| `owner/admins/generate-key` | create one-time Super Key (plaintext once) |
| `owner/admins/rotate-key` | invalidate and issue new |
| `owner/admins/revoke-key` | invalidate key + sessions |
| `owner/admins/revoke-session` | sign out a device |
| `owner/roles/*` | roles/permissions templates |

## 12. Notifications, reports & audit

| Function | Caller | Purpose |
|---|---|---|
| `notifications/me` | player | player's inbox |
| `notifications/read` | player | mark read |
| `admin/notifications/send` | notifications | send templated/targeted/broadcast notification |
| `admin/audit/query` | owner/reports | immutable audit log |
| `admin/reports/*` | reports | reconciliation + operational reports |
| `admin/share/report` | reports | share-card funnel analytics (also listed in §8) |

## 13. Settings, content & release

| Function | Caller | Purpose |
|---|---|---|
| `admin/settings/get` | admin | feature flags, payment instructions, limits, support URL, policy URLs, streak config, ad config |
| `admin/settings/update` | owner | change settings (audited) |
| `admin/content/banners/*` | marketing/owner | banner CRUD (see §9) |
| `admin/content/announcement` | marketing/owner | Home announcement/promotion slot (see §9) |
| `admin/content/featured-tournament` | tournament/owner | pin Home featured tournament (see §9) |
| `admin/release/version` | owner | set `min_version`, `latest_version`, `force_update` for each app |
| `admin/release/maintenance` | owner | toggle maintenance mode + message (audited) |
| `admin/ads/config` | owner | set ad-mediation provider keys/IDs, SSV callback secrets, enable/disable ad attempts |

## 14. Version & maintenance (public)
- `app/version` returns `{ min_version, latest_version, force_update, maintenance, message }`; both apps check on launch and resume.
