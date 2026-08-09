# 05 — UI, Quality & Acceptance

## Visual design
Rush Zone Control uses the **warm cream/light** operational palette (see `../shared/07-design-tokens.md`): cream canvas, orange primary actions, dark ink for firm secondary actions, deep-orange for high-risk confirmations, cream-yellow panels for finance/policy/warnings. Editorial serif headings; Inter/system sans for data, forms, numbers. Atmospheric sunset art only for access/campaign/featured areas, not every operational row. 12px cards, 8px buttons/inputs, pill status badges, and the red→orange→yellow→cream sunset stripe above the bottom nav on every screen.

## Mobile usability
- At least 44px touch targets.
- One decisive workflow per screen; expandable cards/lists, drill-in details — no dense desktop tables.
- Sticky decision bars on review screens; confirmation bottom sheets for irreversible actions.
- Show required-permission/unavailable states without exposing internal security detail.
- Status never indicated by color alone (icon/text labels).
- Intentional loading/empty/error/offline/retry states; PKT display of all times.

## Security
- HTTPS/TLS only; secure token storage; device/session risk signals where appropriate.
- Email OTP + Argon2id-hashed Super Key; rate limits and lockouts; owner re-auth for sensitive actions.
- Publishable key only in the app; secret key only in Edge Functions; no legacy anon/service_role JWTs.
- Private files served via short-lived signed URLs after permission checks; input/file validation (and malware scanning plan).

## Reliability
- Daily backups + restore test; error monitoring and structured logs; notification retry/failure monitoring; alerts on wallet discrepancy, finance SLA, repeated access failures, upload errors, unusual reward patterns; staging environment with cash operations disabled.

## MVP acceptance criteria
- [ ] Approved staff sign in only with email + email OTP + individual Owner-issued Super Key.
- [ ] Owner can approve admins, assign roles, generate/rotate/revoke Super Keys, and revoke sessions.
- [ ] Admins cannot change/reset their own Super Key; backend stores only the hash/metadata; no plaintext exposed/logged.
- [ ] Permission-filtered dashboard with prioritized queue.
- [ ] Authorized admin creates/publishes a tournament (PKT schedule, capacity, fee, prize, rules, room release) and can use/save presets.
- [ ] Staff assign individually registered users to internal Duo/Squad rosters.
- [ ] Staff release private room details only to eligible entrants.
- [ ] Results manager enters/publishes kills/results and creates prize credits via the ledger.
- [ ] Top-up reviewer approves/rejects without direct balance editing.
- [ ] Withdrawal operator reviews held requests, records payout reference, and marks Paid/Rejected with audit and dual control above threshold.
- [ ] Owner/reward manager configures/pauses campaigns with caps and risk visibility; emergency pause propagates immediately.
- [ ] Owner configures streak tiers/freezes/qualifying actions and referral rewards; staff can review held referrals and grant freeze exceptions, all audited.
- [ ] Staff can manage Home banners, the announcement slot, and the featured tournament, with audit history.
- [ ] Owner can set per-app min/latest versions, force-update, maintenance mode, policy URLs, support URL, and ad/SSV configuration.
- [ ] Free-slot promotion can be enabled per tournament, is awarded server-side with an audited `slot_refund` ledger credit, and is visible in tournament operations.
- [ ] Moderator applies reasoned restrictions according to permission.
- [ ] Owner inspects immutable audit log and reconciliation report.
- [ ] Cash operations stay feature-flagged until documented approval.
- [ ] Mobile UI follows the editorial sunset design system with the sunset stripe; app ships only the `sb_publishable_…` key.
