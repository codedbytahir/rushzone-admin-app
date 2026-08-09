# 01 — Navigation & Dashboard

## Bottom navigation
`Dashboard · Tournaments · Finance · Players · More`

## More menu (permission-filtered)
Rewards · Streaks · Referrals · Content (Banners/Announcement/Featured) · Notifications · Reports & Audit · Admin Access (Owner-only default) · System Settings (Owner/limited) · Feature Flags (Owner-only) · Sign Out.

## Routes
```
Splash / Security Check / Maintenance / Force-update
→ Staff Email Login → Email OTP → Admin Super Key → Dashboard

Dashboard → Tournament Workspace / Finance Queue / Results Studio / Priority & Risk

Tournaments
→ Create Tournament Wizard (details → pricing/prizes → schedule/publication)
→ Tournament Detail / Operations
→ Individual Entrants / Internal Roster
→ Private Room Release
→ Results Studio

Finance  (Top-ups | Withdrawals tabs)
→ Top-up Queue → Top-up Review Detail
→ Withdrawal Queue → Withdrawal Review Detail

Players
→ Player Profile / History → Internal Notes → Restriction / Ban confirmation

More
→ Rewards Control
→ Streaks Control
→ Referrals Control
→ Content (Banners · Announcement · Featured Tournament)
→ Notifications
→ Admin Access
→ Audit & Reports
→ Settings (Payment & Wallet · Policies & Support · Ads/SSV · Streaks · Referrals · Release & Maintenance)
```

### Content management route (drives the player Home screen)
- **Banners:** upload/remove/reorder banner images, set optional click-through URL, schedule start/end, toggle active. Maps to the player Home image slider.
- **Announcement slot:** compose the Home announcement/promotion text + optional link (with active/inactive and schedule).
- **Featured tournament:** pin which published/upcoming tournament appears as the Home hero card.
- All changes are audit-logged with author and timestamp.

## Login screen
- Email field; email OTP entry + resend; masked Super Key input after OTP step.
- Helper: `This key is assigned and rotated only by the Rush Zone Owner.`
- Generic failed state; lock state `Admin access temporarily locked. Contact the Owner.`; secure sign-out/expiry.

## Dashboard (permission-filtered)
Where permitted, show: live/upcoming count, registration/capacity summary, upcoming room-release action, top-ups pending review (oldest age), withdrawals pending review + held value + near-SLA warning, results pending publication, reward risk flags, moderation/security flags, maintenance/cash-ops/app-version status, and a prioritized deep-link list.

Additional summary tiles where the role allows:
- **Engagement:** daily active streaks, longest streak, milestone rewards paid today/this week.
- **Referrals:** pending attributions to review, rewards paid.
- **Content:** currently active banners, current announcement, pinned featured tournament.
- **Growth:** share-card events by channel/type (from `card_share_events`), new sign-ups.

**Priority order:** (1) withdrawal near payout target, (2) room release near scheduled time, (3) results waiting for publication, (4) pending payment proof, (5) security/abuse flags, (6) normal metrics.

## Operational UI principles
- 390×844 target; one-hand, short sessions; expandable cards not dense desktop tables.
- Sensitive review pages are full-screen detail views with sticky bottom decision actions.
- Confirmation sheets for irreversible actions: publish results, approve top-up, mark withdrawal Paid, ban player, revoke key, enable money operations.
- Show why an action is unavailable without exposing internal security detail.
- Theme is the **warm cream/light** Control palette (see `../shared/07-design-tokens.md`) for long finance/table sessions, with the sunset stripe above the nav on every screen.
