# Rush Zone Control — Owner & Admin Mobile App Requirements

**Document status:** Development-ready MVP specification
**Application:** Rush Zone Control
**Platform:** React Native + Expo, Android-first, iOS-ready architecture
**Primary market:** Pakistan
**Primary language:** English-first
**Time zone:** Pakistan Standard Time (`Asia/Karachi`, PKT)
**Application audience:** Main Owner and Owner-approved operational Admins
**Related app:** Rush Zone Player App
**Authentication:** Staff sign in with **email OTP + individual Owner-issued Admin Super Key** (email OTP via Supabase Auth + free SMTP). A staff/contact WhatsApp phone number may be stored for operational contact but is not a login factor.

---

## 1. Product purpose

Rush Zone Control is the secure mobile operations application used to run the Rush Zone tournament business. It allows the Owner and permission-limited admins to create tournaments, manage individual registrations and internal rosters, release private rooms, enter official results, review manual top-ups/withdrawals, manage rewards, moderate players, control admin access, and inspect audit/reporting data.

### Operational promise

> Every tournament, result, coin movement, staff permission, and sensitive override is controlled by an authorized person and leaves an auditable history.

### Core principle

The Admin mobile app is not simply a set of hidden player screens. It is a separate, secured application with Owner-approved access, backend-enforced permissions, privileged re-authentication, private operational data, and audit controls.

---

## 2. Launch boundary and financial release gate

### Build and test now

Rush Zone Control may be built and closed-beta tested using:

- Test/non-redeemable coins.
- Test payment proof.
- Simulated top-up approval/rejection.
- Simulated withdrawal review/paid/rejected states.
- Test Owner/Admin accounts.

### Real-money feature flag

The following must remain disabled by server-controlled `cash_operations_enabled` until required approvals/policies exist:

- Real top-up instructions and approval.
- Real coin credit with cash value.
- Actual payout processing.
- Cash-equivalent withdrawals.
- Rewarded ads/paid reward attempts with cash-value reward.

The Owner must be able to see current cash-operation state and cannot enable it casually. Enabling/disabling it requires privileged Owner re-authentication and a permanent audit entry.

---

## 3. Roles and permission model

### 3.1 Main Owner

The Owner is the highest-privilege business account. Keep the number of Owner accounts very small.

**Owner-only controls:**

- Approve/suspend/reactivate/remove admin accounts.
- Generate, rotate, revoke Admin Super Keys and revoke admin sessions.
- Rotate own Owner Super Key through privileged confirmation.
- Create/manage roles and permission assignments.
- Configure official payment instructions, payout methods, wallet policy, limits, support link, feature flags, and policy versions.
- Enable/disable cash operations, withdrawals, reward campaigns, or maintenance mode.
- View all audit records, finance reports, and security alerts.
- Approve material tournament changes after registrations exist.
- Approve high-risk correction/override thresholds and dual-control rules.

### 3.2 Admin

An Admin has no implicit permission. An Admin only sees/does what the Owner has granted at backend level.

### 3.3 Suggested permission groups

| Group | Example capability | Typical user |
|---|---|---|
| Tournament Management | Create/edit/publish/cancel event, manage capacity/registrations | Tournament Manager |
| Room & Match Operations | Enter private room details, release room, internal roster allocation | Room Operations |
| Results | Enter kills/placement/points, save draft, review/publish/correct | Results Manager |
| Top-up Review | Open proof, review request, approve/reject top-up | Payment Reviewer |
| Withdrawal Operations | Review payout request, record payout reference, mark Paid/rejected | Withdrawal Operator |
| Rewards | Create/pause campaigns, configure caps/odds, inspect reward risk | Reward Manager |
| Player Support/Moderation | Search player, notes, restriction/ban/reactivation | Support Moderator |
| Notifications | Compose/send allowed operational or broadcast notification | Notification Manager |
| Reports | Read/export permitted financial/operational reports | Reports Viewer |
| Access Administration | Approve admins/manage roles/key issuance | Owner-only by default |

### 3.4 Permission enforcement rules

- Backend checks permission for every protected command. Hiding a button is not authorization.
- Admin app fetches only permitted data fields; sensitive data is masked/minimized by role.
- Admin roles can be combined, but Owner should follow least privilege.
- Admin cannot approve/handle their own financial request.
- Recommended four-eyes rule: creator/reviewer/payer are different people for withdrawals above Owner-configured threshold.
- Role change, key change, finance decision, result change, tournament change, and user restriction must create audit events.

---

## 4. Secure Admin access and Super Key model

### 4.1 Objective

Admin access must be stronger than normal player access. Each approved admin receives a unique Owner-issued **Admin Super Key**. The Owner has an Owner Super Key and retains control over issuing, rotating, and revoking admin keys.

> A Super Key is individual to the account. It is never one shared password used by every admin.

### 4.2 Required login flow

For each new admin session and for sensitive re-authentication:

```text
Approved staff email/identity
→ Email OTP verification (one-time code via Supabase Auth + free SMTP)
→ individual Owner-issued Admin Super Key
→ backend checks approval, role, key status and risk state
→ permission-limited admin session
```

The app must return generic failure text, for example:

```text
Unable to verify admin access.
```

It must not reveal whether the email, OTP, account status, or Super Key failed.

### 4.3 Owner Super Key safety

- There must be no hard-coded/public/default Owner Super Key in mobile source code, app configuration, documentation, or seeded database data.
- At initial deployment, a secure bootstrap/recovery secret may exist outside the app in secret management; it forces initial Owner Super Key creation/rotation.
- Owner self-rotation requires current Owner Super Key plus OTP or a stronger approved recovery flow.
- Owner recovery is a special high-security process; it is not normal admin password reset.

### 4.4 Admin Super Key workflow

1. Owner reviews a pending admin identity.
2. Owner approves account and assigns role/permission set.
3. Owner selects **Generate one-time key**.
4. Backend generates a strong random key/passphrase.
5. Plaintext is displayed to Owner once only for secure handoff.
6. Owner delivers it through an approved secure channel.
7. Admin signs in using OTP plus Super Key.
8. Owner can rotate/revoke key at any time.

**Rules:**

- Admin cannot view, change, reset, or rotate their own Super Key.
- If lost/compromised, Admin asks Owner; Owner revokes old key and generates new key.
- Rotation/revocation immediately invalidates old key and active sessions.
- Do not transmit/store a plaintext Super Key in WhatsApp messages, screenshots, notes, source code, logs, notifications, or Markdown docs.

### 4.5 Storage and attack protection

- Store only secure `key_hash` using Argon2id where supported; bcrypt fallback is acceptable. Never store raw key.
- Store key version, credential status, issuer, timestamps, failed attempt count, locked-until state, and session-revocation time.
- Rate-limit by account, device, IP, and request pattern.
- Recommended: lock temporarily after 5 consecutive failed Super Key attempts.
- Notify Owner/security audit after lock/risk event.
- Require Super Key re-entry for sensitive Owner actions: role change, admin approval, key rotation, high-value withdrawal override, cash-operation enablement, and recovery action.

### 4.6 Required security audit events

```text
admin_super_key_generated
admin_super_key_rotated
admin_super_key_revoked
owner_super_key_rotated
admin_login_failed
admin_login_locked
admin_session_revoked
admin_approved
admin_suspended
role_permission_changed
```

Events never include raw Super Key, key hash, OTP, or secret fragments.

---

## 5. Visual design system

Rush Zone Control follows the same supplied editorial mountain-sunset design system as the Player App, adapted for operational clarity.

### 5.1 Design direction

- Warm canvas/cream screen surfaces for readable finance and table-like mobile data.
- Atmospheric mountain-sunset art only for access, priority, campaign, or featured event areas—not for every operational row.
- Orange primary actions; dark ink for firm secondary actions; orange-deep confirmation for high-risk actions.
- Cream-yellow panels for financial review, policy, warnings, and feature summaries.
- Editorial serif display headings; Inter/system sans for data, controls, labels, numbers, and forms.
- Cards use 12px radius; buttons/inputs use 8px radius; status badges may be pill-shaped.
- Include horizontal red → orange → yellow → cream sunset stripe above mobile bottom navigation on each Admin screen.

### 5.2 Mobile operation principles

- Target 390 × 844 Android viewport with responsive Expo layout.
- Design essential tasks for one-hand use and short operational sessions.
- Priority queue cards must be obvious without excessive color/noise.
- Sensitive review pages use full-screen detail views and sticky decision actions at bottom.
- Require confirmation sheet/dialog for irreversible actions: publish results, approve top-up, mark withdrawal Paid, ban player, revoke key, enable money operations.
- Do not overload the small screen with a desktop-style dense table; use expandable cards/lists and drill-in details.

---

## 6. Application navigation

### 6.1 Bottom navigation

```text
Dashboard · Tournaments · Finance · Players · More
```

### 6.2 More menu

Permission-filtered More menu may include:

- Rewards.
- Notifications.
- Reports & Audit.
- Admin Access (Owner only by default).
- System Settings (Owner/limited permission).
- Feature Flags (Owner only).
- Secure Sign Out.

### 6.3 Main route map

```text
Splash / Security Check
→ Staff Email Login
→ Email OTP Verification
→ Admin Super Key
→ Permission-filtered Dashboard

Dashboard
→ Tournament Workspace
→ Finance Queue
→ Results Studio
→ Priority / Risk Detail

Tournaments
→ Create Tournament Wizard
→ Tournament Detail / Operations
→ Individual Entrants / Internal Roster
→ Private Room Release
→ Results Studio

Finance
→ Top-up Queue → Top-up Review Detail
→ Withdrawal Queue → Withdrawal Review Detail

Players
→ Player Profile / History
→ Internal Notes
→ Restriction / Ban Confirmation

More
→ Rewards Control
→ Notifications
→ Admin Access
→ Audit & Reports
→ Settings
```

---

## 7. Secure Admin Access screen

### 7.1 Required UI

- Owner/Admin email/approved identity field.
- Email OTP entry and resend control.
- Masked `Owner-issued Admin Super Key` input after email OTP step.
- Helper text: `This key is assigned and rotated only by the Rush Zone Owner.`
- Generic failed-access state.
- Temporary lock state: `Admin access temporarily locked. Contact the Owner.`
- Secure sign-out/session-expiry behavior.

### 7.2 Session rules

- Short-lived admin sessions with secure refresh strategy.
- Re-authentication after inactivity, sensitive action, Super Key rotation, role change, suspension, or backend risk signal.
- Owner may remotely revoke an admin session.
- Device must never store raw Super Key or raw OTP.

---

## 8. Dashboard requirements

### 8.1 Purpose

Dashboard summarizes operational work requiring attention. It is permission-filtered; for example, an event manager does not see payment proof queue if they lack finance permission.

### 8.2 Required cards/sections

Where permitted, show:

- Live/upcoming tournament count.
- Registration/capacity summary.
- Upcoming room-release action.
- Top-ups pending review and oldest pending age.
- Withdrawals pending review, held value, and near-SLA warning.
- Results pending publication.
- Reward risk flags.
- User moderation/security flags.
- Maintenance/cash-operation status.
- Priority list with deep links.

### 8.3 Priority ordering

Priority should favor:

1. Withdrawal near payout target/expiry.
2. Room release nearing scheduled time.
3. Results waiting for player/prize publication.
4. Pending payment proof needing timely review.
5. Security/abuse flags.
6. Normal operational metrics.

---

## 9. Tournament management

### 9.1 Tournament list

Tournaments list includes:

- Search/filter by lifecycle state, date, mode/map, admin creator, and event type.
- Cover thumbnail/title.
- Scheduled PKT time.
- Current entry count/capacity.
- Entry fee and prize summary as permission allows.
- Lifecycle status.
- Quick safe action/deep link.

### 9.2 Create Tournament mobile wizard

Use short mobile wizard steps rather than one overloaded form.

#### Step 1: Event details

- Title.
- Description/internal notes.
- Cover thumbnail upload.
- Mode: Solo/Duo/Squad/Custom.
- Map.
- Number of rounds.
- Individual capacity.
- Public rules.

#### Step 2: Pricing and prizes

- Entry fee in integer Rush Coins.
- Prize pool/public prize description.
- Rank prize distribution and/or score table.
- Kill/placement scoring rules.
- Tie-breaker rule.

#### Step 3: Schedule and publication

- Registration open/close timestamp in PKT.
- Match start time in PKT.
- Expected result publication time.
- Private room release time.
- Notification content/template.
- Save Draft / Review / Publish.

### 9.3 Lifecycle

```text
Draft
→ Scheduled
→ Registration Open
→ Registration Full / Registration Closed
→ Room Released
→ Live / In Progress
→ Results Pending
→ Completed

Alternative: Cancelled
```

### 9.4 Editing rules

- Drafts may be freely edited by permissioned staff.
- Published event with zero registration may be edited with audit record.
- After first confirmed registration, every player entry fee is snapshotted.
- Price increase affects only future players; never debit earlier player again.
- Material schedule/prize/rule change after entries exists requires reason, appropriate owner approval, notification to affected users, and refund/cancellation option based on policy.
- Cancel action requires reason and selected player outcome: refund, reschedule, or manual review.
- ALSO there should be preset system so they do not need to enter same details for every day tournament

---

## 10. Room operations and internal roster assignment

### 10.1 Room operation

Authorized staff can enter:

- Room ID.
- Room password.
- Server/region.
- Check-in/join instructions.
- Release time.
- Internal operational notes.

### 10.2 Release rules

- Credentials are saved as restricted operational data.
- Release shows confirmation: player count, release time, notification action.
- Only eligible registered entrants receive access after release.
- Every room edit/release is audited.
- Broad announcements must never include password/room credentials.

### 10.3 Individual roster assignment

For Duo/Squad/custom events in MVP:

- Player joins individually.
- Authorized staff see confirmed entrant list and may assign players to internal roster/lobby groups.
- Staff can see unassigned count, roster capacity, and roster readiness.
- Players cannot create/edit roster/team membership in MVP.
- Roster assignment does not alter entry fee without approved workflow.

---

## 11. Results Studio

### 11.1 Purpose

Results Studio is the only operational workflow for official participant kills, placement, points, disqualification status, standings, winners, prizes, and profile-stat updates.

### 11.2 Result entry

Authorized result staff can:

- Open a tournament in Results Pending.
- See registered eligible participants only.
- Enter per-participant kills as non-negative integer.
- Enter placement/rank and configured points.
- Set disqualification/notes where permitted.
- Save draft.
- Review score/prize preview.
- Publish official results if permission/reviewer conditions are satisfied.

### 11.3 Publication transaction

When published, backend must atomically or safely orchestrate:

1. Lock/mark official result data.
2. Calculate standings using configured score table/tie-breaker.
3. Create prize award records.
4. Create corresponding immutable wallet credits.
5. Update official aggregated profile stats.
6. Change tournament lifecycle to Completed.
7. Create notifications.
8. Write audit event with publisher/reviewer.

### 11.4 Correction rules

- Published results cannot be silently edited.
- Correction needs suitable permission, mandatory reason, and audit event.
- If prize amount changes, use compensating wallet ledger adjustment, not direct balance change.
- Result correction should notify impacted player(s) where policy/business requires.

---

## 12. Finance operations

### 12.1 Finance module permissions

Finance section is hidden/blocked unless staff has appropriate wallet permission. Finance roles should be separated where practical:

- Top-up review does not automatically grant withdrawal payout access.
- Support role does not automatically grant payment-proof access.
- Reports viewer may read aggregate data without individual payout detail.

### 12.2 Finance queue

Finance landing screen contains segmented queues:

```text
Top-ups · Withdrawals
```

Filters:

- Pending.
- Near SLA.
- Risk flag.
- Payment method.
- Amount band.
- Submission/request time.
- Assigned reviewer/status.

### 12.3 Manual top-up review

#### Queue data

- Player identity and masked contact.
- Requested coin amount.
- Method.
- External transaction reference.
- Submission timestamp.
- Status.
- Duplicate/reference/risk indicator.

#### Detail screen

- Request ID.
- Player profile summary permitted for reviewer.
- Method, requested amount, reference.
- Private payment proof via signed temporary access.
- Risk/reference alert.
- Approve button.
- Reject button requiring reason.

#### Approval action

Approval must:

- Require correct permission.
- Check request remains pending and external reference is not already approved unless override approved.
- Create immutable coin credit ledger entry.
- Save reviewer/action timestamp/reference.
- Notify player.
- Audit action.

Admin must never manually type a new player balance.

### 12.4 Manual withdrawal review

#### Queue data

- Player identity/eligibility state.
- Requested amount in coins/PKR wording.
- Held balance status.
- Masked payout method/account.
- Waiting time and 24-hour target indicator.
- Risk/verification/dual-control state.

#### Detail screen

- Request ID and player summary.
- Held amount.
- Masked payout details.
- Method.
- Payment reference entry field.
- Internal note/proof field as appropriate.
- Rejection/return option.
- Mark Paid option.

#### Status model

```text
Pending Review
→ Approved
→ Paid

Alternative:
Rejected / Cancelled → return held coins to available balance
```

#### Paid action requirements

- Require method, recipient snapshot, external payment reference, operator, and timestamp.
- Require dual approval/second reviewer when amount crosses Owner-configured threshold.
- Mark Paid finalizes held debit through ledger workflow.
- Do not permit editing completed payout record; use correction workflow if needed.
- Notify player and audit action.

---

## 13. Rewards Control

### 13.1 Campaign management

Authorized Reward Manager can create/edit/pause Spin Wheel campaigns with:

- Campaign type.
- Active date/time in PKT.
- Reward coin values.
- Weight/probability.
- Global cap.
- Per-user daily cap/cooldown.
- Rewarded-ad attempt option.
- Paid 5-coin attempt option.
- Active/paused/ended state.

### 13.2 Operational dashboard

Show:

- Active campaign count.
- Total attempts.
- Validated ad vs paid attempt ratio.
- Coins awarded and paid coins spent.
- Campaign/global cap usage.
- Ad validation failures.
- Rate-limit/fraud risk flags.

### 13.3 Emergency pause

Reward Manager or Owner with permission can immediately pause a campaign. Require confirmation and audit event. Player-side app must honor the backend pause state immediately.

### 13.4 Fairness controls

- Reward selection is server-side only.
- Admin UI configures rules, not individual player outcome.
- All attempt/reward/cost records link to campaign and wallet ledger.
- Do not give routine staff a "grant arbitrary reward coins" button. Exceptional compensation must use audited wallet correction permission.

---

## 14. Player support and moderation

### 14.1 Player search

Authorized staff can search by:

- Player display name.
- User ID.
- Free Fire UID.
- Masked/approved phone lookup.
- Tournament registration.
- Wallet request reference where allowed.

### 14.2 Player detail

Permission-aware detail may show:

- Profile/FF UID/in-game name.
- Registration and official-result history.
- Player stats.
- User status/risk flag.
- Internal support notes.
- Wallet history only to finance-authorized role.
- Payout/payment proof only to permitted role.

### 14.3 Restriction actions

Authorized staff can apply reasoned restriction:

- Restrict tournament entry.
- Restrict rewards.
- Restrict wallet operations.
- Suspend full account.
- Ban account.
- Reactivate where permitted.

Every restriction needs:

- Reason.
- Actor.
- Timestamp.
- Optional review/expiry state.
- Audit event.
- Appropriate user-facing effect/message based on policy.

---

## 15. Notifications and announcements

### 15.1 Admin notification actions

Permissioned staff can send:

- Registration confirmation template.
- Room-released notice.
- Match reminder.
- Result/prize notice.
- Top-up/withdrawal decision notice.
- Tournament change/cancellation/refund notice.
- Targeted tournament announcement.
- Approved broad maintenance/business announcement.

### 15.2 Security/content limits

- Never include room password in broad message.
- Never include OTP, full payout account, payment proof, or raw Super Key in notification.
- Store sender, target segment, content/template, send time, delivery outcome, and deep link in audit/notification history.
- Broadcast notifications require appropriate permission and confirmation.

---

## 16. Admin access management

### 16.1 Owner Admin Access module

Owner-only by default. It shows:

- Pending admin applications/invites.
- Approved/suspended/revoked admin list.
- Assigned roles and permission summary.
- Super Key status: Pending, Active, Locked, Revoked.
- Last-used timestamp, key version, session state; never actual Super Key.
- Recent access/security activity.

### 16.2 Owner actions

- Approve/reject admin.
- Assign/remove roles.
- Generate one-time Admin Super Key.
- Rotate key.
- Revoke key and active sessions.
- Suspend/reactivate admin.
- Change permission template.
- Revoke sessions after suspected compromise.

Every action requires confirmation, appropriate Owner re-authentication, and audit event.

---

## 17. Audit, reports, reconciliation, and settings

### 17.1 Audit log

Record actor, action, timestamp, impacted entity, reason, and before/after data where appropriate for:

- Admin approval/suspension/role/key change.
- Tournament create/publish/material update/cancel.
- Room save/release.
- Result draft/publish/correction.
- Top-up approval/rejection.
- Withdrawal approval/paid/rejection/cancellation.
- Prize/refund/reward/correction ledger activity.
- Player restriction/ban/reactivation.
- Reward campaign configuration/pause.
- Feature flag/cash operation change.

Routine staff must not edit or delete audit history.

### 17.2 Reports

Owner/authorized Reports Viewer can view/export as permitted:

- Tournament entries/capacity/completion/cancellation.
- Prize/revenue/refund summaries.
- Top-up states and approval performance.
- Withdrawal states, paid amounts, pending amounts, payout SLA.
- Current wallet liability/held balance summary.
- Reward campaign cost/activity.
- Admin action report.
- Player growth/activity as business needs.

### 17.3 Reconciliation

System/Owner requires reconciliation checks:

- Wallet account snapshot totals vs ledger totals.
- Top-up approval totals vs review records.
- Withdrawal held/paid/rejected states vs ledger state.
- Prize awards vs official results.
- Duplicate/failed idempotency events.

Flag discrepancy; do not silently "fix" balance. Use audited correction process.

### 17.4 Settings

Owner/permissioned setting categories:

- Official payment instructions/method activation.
- Withdrawal limits/fees/eligibility.
- Official WhatsApp support URL.
- Policy versions.
- Reward caps/cooldowns.
- Notification template defaults.
- Maintenance mode.
- Cash operations feature flag.
- High-value dual approval threshold.
- File retention policy reference.

---

## 18. Data model requirements

Control App uses protected backend entities including:

| Entity | Operational purpose |
|---|---|
| `roles`, `permissions`, `role_permissions` | Granular RBAC |
| `admin_assignments` | Admin state, approval, assigned roles |
| `admin_security_credentials` | Hashed Super Key/version/status/lock/session metadata only |
| `admin_audit_logs` | Immutable sensitive-action history |
| `tournaments` | Event config and lifecycle |
| `tournament_rounds` | Optional rounds/lobby setup |
| `registrations` | Individual entries, fee snapshot, roster assignment |
| `rosters`, `roster_members` | Internal Duo/Squad grouping only |
| `match_results` | Official kills/placement/points/result state |
| `prize_awards` | Official award linked to result and ledger |
| `wallet_accounts` | Available/held balance projection/verification |
| `wallet_ledger_entries` | Immutable money/coin history |
| `topup_requests` | Manual proof/review state |
| `withdrawal_requests` | Held funds, payout state/reference/reviewer |
| `reward_campaigns`, `reward_items`, `reward_attempts` | Reward configuration and fairness history |
| `notifications` | User/admin delivery and inbox history |
| `risk_flags` | Fraud, support, moderation context |
| `policy_consents` | Player agreement history |

### Data security rules

- Client app never receives raw Super Key/hash, raw service-role credential, or unrestricted financial table access.
- Sensitive file paths are private and served through short-lived signed access after permission check.
- Use integer smallest unit for coins/PKR representation.
- Store UTC timestamps; display PKT.
- Financial/audit records use append-only or correction history; no silent hard delete.

---

## 19. Backend/API requirements

### 19.1 Server-authoritative commands

All of the following go through protected backend/Edge Function/API command layer, not direct mobile table mutation:

- Admin Super Key verify/generate/rotate/revoke.
- Role assignment/approval/revocation.
- Tournament publish/cancel/material edit.
- Room credential release.
- Registration roster assignment.
- Result publication/correction.
- Wallet debit/credit/refund/prize/hold/release.
- Top-up approval/rejection.
- Withdrawal paid/rejection/cancellation.
- Reward outcome.
- Feature-flag change.

### 19.2 Supabase recommendation

Recommended MVP backend: Supabase/PostgreSQL with:

- Supabase Auth or approved OTP integration.
- PostgreSQL relational schema.
- Row Level Security as defense-in-depth.
- Edge Functions/server actions for sensitive commands.
- Private Supabase Storage buckets.
- Push notification queue/worker.
- Service-role credentials kept only in secured server environment.

### 19.3 Idempotency and atomicity

Financial/event operations must accept idempotency keys and prevent duplicate effects from retry/tap/network failure. Use database transactions/locking where relevant.

---

## 20. Security, quality, and operational requirements

### 20.1 Security

- HTTPS/TLS only.
- Secure mobile token storage.
- Device/session risk signals where appropriate.
- OTP and Super Key rate limits.
- Super Key hash only, never plaintext.
- API authorization checks for every admin action.
- Private storage/signed URL for payment/KYC files.
- Input/file validation and malware/content scanning plan where feasible.
- Owner re-authentication for sensitive action.

### 20.2 Reliability

- Daily backups and restoration test.
- Error monitoring and structured logs.
- Notification job retry/failure monitoring.
- Alert on wallet ledger discrepancy, finance queue SLA, repeated access failure, upload error, and unusual reward pattern.
- Staging environment with cash operations disabled.

### 20.3 Mobile usability

- At least 44px touch targets.
- One mobile screen per decisive workflow; do not force desktop tables into phone view.
- Confirmation bottom sheets for high-risk actions.
- Show required permission/why an action is unavailable without exposing internal security detail.
- Ensure colors are not only status indicator; include text/icons.

---

## 21. MVP acceptance criteria

Rush Zone Control MVP is complete when:

- [ ] Approved staff can sign in only with approved email, email OTP, and individual Owner-issued Super Key.
- [ ] Owner can approve admin, assign role, generate/rotate/revoke Super Key, and revoke session.
- [ ] Admin cannot change/reset their own Super Key.
- [ ] Backend stores only Super Key hash/metadata; no plaintext key is exposed/logged.
- [ ] Dashboard is permission-filtered and shows priority queue work.
- [ ] Authorized admin can create/publish a tournament with PKT schedule, capacity, fee, prize, rules, and room release time.
- [ ] Authorized staff can assign individually registered users to internal rosters for Duo/Squad events.
- [ ] Authorized staff can release private room details only to eligible entrants.
- [ ] Authorized results manager can enter/publish official kills/results and create prize credits through ledger.
- [ ] Top-up reviewer can approve/reject manual proof without direct balance edit.
- [ ] Withdrawal operator can review held request, record payout reference, and mark Paid/rejected with audit history.
- [ ] Owner/reward manager can configure/pause reward campaigns with caps and risk visibility.
- [ ] Moderator can apply reasoned player restrictions according to permission.
- [ ] Owner can inspect immutable audit log and reconciliation report.
- [ ] Cash operations stay feature-flagged until documented release approval.
- [ ] Mobile UI follows the editorial mountain-sunset design system and includes sunset stripe above navigation.

---

## 22. Out of scope for MVP

- Automated payment-provider checkout/payout API.
- Player-created team/captain management.
- Automated Free Fire result ingestion.
- Full real-time chat/support desk.
- Advanced live stream control.
- Custom role-builder beyond practical permission templates, unless Owner requests it.
- AI decision-making for money, moderation, result verification, or payouts.

---

## 23. Phase-2 candidates

- Approved provider API/webhook integration for payment collection/payout.
- Stronger KYC/withdrawal verification vendor.
- Web admin console sharing same secure backend/RBAC.
- Player-created teams/captain tools.
- Full bracket/multi-round standings.
- More advanced dispute management/support ticket system.
- Urdu localization.
- Rich operational analytics and scheduled reports.
- Additional Owner recovery controls/hardware/passkey support.
