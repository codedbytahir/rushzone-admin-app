# 03 — Finance, Rewards & Moderation

## Finance module
Hidden/blocked without wallet permission; roles separated where practical (top-up review ≠ withdrawal payout; support ≠ payment proof; reports may be aggregate-only).

### Finance queue
Segmented **Top-ups · Withdrawals** with filters: Pending, Near SLA, Risk flag, Payment method, Amount band, Submission time, Assigned reviewer/status.

### Top-up review
- Queue row: player identity (masked contact), coin amount, method, external reference, submission time, status, duplicate/reference/risk indicator.
- Detail: request ID, permitted player summary, method/amount/reference, private payment proof via short-lived signed access if required (MVP uses payment reference only), risk/reference alert, Approve, Reject (reason required).
- Approve requires permission, must verify the request is still pending and the reference isn't already approved (unless permissioned override), then creates an immutable coin credit, records reviewer/timestamp/reference, notifies the player, and audits. **Admins never type a balance directly.**

### Withdrawal review
- Queue row: player/eligibility, coins/PKR amount, held status, masked payout method/account, wait time + 24-hour target indicator, risk/verification/dual-control state.
- Detail: request ID, held amount, masked payout details, method, payout-reference entry field, internal note/proof, Reject/return, Mark Paid.
- Status: `Pending Review → Approved → Paid`; `Rejected/Cancelled → return held coins to available`.
- Paid requires method, recipient snapshot, external payout reference, operator, timestamp; dual approval above Owner threshold; finalizes held via ledger; completed payouts are immutable (use correction workflow otherwise); notify + audit.

## Rewards Control
Campaign management (permissioned): type, active PKT window, reward coin values, weight/probability, global cap, per-user daily cap/cooldown, ad option, paid 5-coin option, active/paused/ended.
- Operational dashboard: active campaigns, total attempts, validated-ad vs paid ratio, coins awarded and paid coins spent, cap usage, ad-validation failures, rate-limit/fraud flags.
- Emergency pause (immediate, confirmed, audited; player app honors backend pause).
- Fairness: server-side selection only; UI configures rules, not individual outcomes; every attempt links to campaign and ledger; no arbitrary "grant coins" button for routine staff (exceptional compensation uses audited wallet-correction permission).

## Player support & moderation
- Search by display name, app UID, Free Fire UID, approved/masked phone, tournament registration, wallet reference (where allowed).
- Permission-aware detail: profile/FF UID/in-game name, registration/official-result history, stats, status/risk, internal notes; wallet history only to finance-authorized roles; payout/proof only to permitted roles.
- Restriction actions (reasoned, actor, timestamp, optional expiry, audit, user-facing effect): restrict entry, restrict rewards, restrict wallet ops, suspend, ban, reactivate.

## Notifications/announcements
Permissioned staff send from approved templates: registration, room release, reminder, result/prize, top-up/withdrawal decisions, tournament change/cancellation/refund, targeted tournament announcements, approved broadcast/maintenance. Never include room password, OTP, full payout account, payment proof, or Super Key. Store sender, target segment, template/content, send time, delivery outcome, deep link; broadcasts require permission + confirmation.
