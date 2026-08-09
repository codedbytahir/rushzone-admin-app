# 02 — Tournaments, Rooms & Results

## Tournament list
Search/filter by lifecycle, date, mode/map, admin creator, event type; show cover/title, PKT schedule, entry count/capacity, fee/prize summary (as permission allows), status, and a quick safe action.

## Create Tournament wizard (short steps)
**Step 1 — Event details:** title, description/internal notes, cover upload, mode (Solo/Duo/Squad/Custom), map, rounds, individual capacity, public rules.
**Step 2 — Pricing/prizes:** entry fee (integer coins), prize pool/public description, rank prize distribution/score table, kill/placement scoring, tie-breaker, and **free-slot promotion** settings (see below).
**Step 3 — Schedule/publication:** reg open/close (PKT), match start, expected result time, room release time, notification template; Save Draft / Review / Publish.

### Presets
Because daily tournaments repeat the same details, admins can save configurations as **presets** and create a new event from a preset in one tap (date/time are adjusted; all other settings carry over). Presets are listable/editable.

### Free-slot promotion
The player app highlights one "gold slot" whose holder gets a full entry-fee refund (joins free). The admin must configure and control this per tournament:
- **Enable/disable** free slot for the event.
- **Trigger mode:** automatically award when all slots are booked, or when the match starts (configurable).
- **Selection method:** server-side random selection among confirmed, non-cancelled registrations (the client only renders the result; admins cannot hand-pick a winner).
- **Refund action:** when triggered, the system creates an immutable `slot_refund` ledger credit and notifies the winner; every award is audited.
- Tournament detail/operations shows whether the free slot has been awarded, the winning slot number/player (as permission allows), and the linked refund transaction.

## Lifecycle
`Draft → Scheduled → Registration Open → Registration Full/Closed → Room Released → Live → Results Pending → Completed` (alternative: Cancelled).

## Editing rules
- Drafts: free edits (permitted staff).
- Published with zero registrations: edits allowed with audit record.
- After first registration: entry fees are snapshotted; price increases affect only future players (never re-debit earlier ones).
- Material schedule/prize/rule changes after entries exist require reason + Owner approval + notification to affected players + refund/cancellation option per policy.
- Cancel requires reason and a player outcome (refund, reschedule, manual review), all audited.

## Room operations
Authorized staff enter: Room ID, password, server/region, check-in/join instructions, release time, internal notes. Credentials are stored as restricted operational data; release requires confirmation (player count, release time, notification action); only eligible registered entrants receive access; every edit/release is audited; broad announcements never contain the password.

## Internal roster (Duo/Squad/custom)
Staff see confirmed entrants and assign them to internal roster/lobby groups (unassigned count, roster capacity, readiness). Players cannot edit membership. Roster assignment does not change entry fees without an approved workflow.

## Results Studio
The only workflow for official kills, placement, points, DQ, standings, winners, prizes, and stat updates.
- Open a Results-Pending event; see only registered eligible participants.
- Enter per-participant non-negative integer kills, placement, points, DQ/notes; save draft; preview scores/prizes.
- Publish when permission/reviewer conditions are met.

### Publish transaction (atomic/orchestrated server-side)
1. Lock official result data.
2. Calculate standings via configured score table/tie-breaker.
3. Create prize awards.
4. Create immutable wallet credits.
5. Update aggregated profile stats.
6. Set tournament lifecycle to Completed.
7. Create notifications.
8. Write audit event with publisher/reviewer.

### Corrections
Published results cannot be silently edited. Corrections require permission + mandatory reason + audit; changed prizes use compensating ledger adjustments (never direct balance edits); impacted players are notified per policy.
