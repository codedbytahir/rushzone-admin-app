# 06 — Engagement & Content Controls

These admin functions back player-facing features that are not tournaments or finance: daily streaks, referrals, share-card analytics, and the content shown on the player Home screen. All changes are server-validated and audit-logged.

## 1. Streaks Control (Owner / Reward Manager)

### Configuration
Set the rules that govern the player streak system:
- **Milestone tiers** — list of (day count, coin reward), e.g. 3→10, 7→25, 14→60, 30→150. Add/edit/disable tiers (disabled tiers keep history but no longer award).
- **Freeze policy** — number of streak freezes granted per player (per week or one-time), whether freezes are enabled, and any support-grant allowance.
- **Qualifying actions** — toggle which events count as an active PKT day: rewarded-ad spin, paid spin, tournament registration, tournament goes live, result published. App-open is never a qualifying action.
- **Streak-at-risk prompt hour** — local PKT evening hour at which the player Home shows the "streak at risk" nudge (dismissible).

All changes require confirmation and write an audit entry; they never retroactively alter already-awarded milestones.

### Operations
- Search/inspect a player's streak: current, longest, total, heat-map, claimed milestones, freeze balance/history.
- **Grant a streak freeze** to a player (e.g., support resolution) with a mandatory reason and audit; no arbitrary coin grants from this screen (use audited wallet correction).
- A daily job (or event trigger) marks PKT days and awards milestone coins atomically; the dashboard shows pending/failed milestone grants.

### Dashboard tile
Shows active streaks distribution, longest streaks, total milestone coins awarded (period), and any streak job errors/risk flags.

## 2. Referrals Control (Owner / Support)

### Configuration
- **Reward amounts** — coins for referrer and for referred player.
- **Qualification trigger** — when the referred player's reward unlocks (sign-up only, after profile setup, or after their first qualifying action/tournament).
- **Caps** — per-referrer maximum rewards, global/daily limits.
- **Anti-fraud toggles** — block self-referral, same-device, duplicate/loop referrals; set risk thresholds.

### Review queue
- List referrals by status: pending, rewarded, held (risk), rejected.
- Show referrer, referred player, attribution code, qualification state, linked ledger entries, and risk metadata.
- Actions: approve a held reward (credits both via the ledger), reject (reason), or leave pending. Each action is audited and idempotent.
- The system auto-rewards clean attributions; suspicious ones are held for review rather than silently paid.

### Funnel/analytics
Referral sign-ups, qualification rate, coins awarded, top referrers (as permitted), and share-card/link attribution.

## 3. Share cards analytics (Reports)
- Read-only analytics from `card_share_events`: counts by card type (result, win, prize, streak, spin, referral, profile) and by channel (WhatsApp Status/chat, Instagram Stories/feed, other).
- Funnel: shares → referral sign-ups, where attributable. No recipient personal data is stored.

## 4. Content management (Marketing / Owner)

These drive specific player Home areas. Reachable from More → Content.

### Banners (image slider)
- Upload banner image to the public `banners` bucket (≤500 KB, recommended dimensions per design, compressed/WebP).
- Set optional click-through URL (empty URL = non-clickable banner).
- Set sort order, active toggle, and optional schedule (start/end in PKT).
- Only currently active, in-schedule banners are returned by the public `content/banners` endpoint.

### Announcement / promotion slot
- Compose title, body, optional link/deep link, active toggle, and schedule.
- There is one current announcement; publishing a new one replaces the previous (history retained/audited).

### Featured tournament
- Pin one published/upcoming tournament as the Home hero. If none is pinned, the player app falls back to the next upcoming featured/open tournament by its own rules.
- Pinning is audited; staff need tournament permission.

### Audit
Every create/update/delete/toggle records author, timestamp, changed fields, and reason where required.
