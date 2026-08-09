# 06 — Notifications

## 1. Two channels

1. **In-app inbox (source of truth).** Every notification is persisted to `app.notifications` and shown in the app with unread/read state and PKT timestamps. Push delivery is treated as best-effort, not guaranteed.
2. **Push notifications** via Expo Notifications + FCM on Android. A failed/expired push token never blocks the in-app message.

## 2. Required types
Security, registration confirmed, room released, tournament reminder, tournament changed/cancelled/refunded, result published, prize credited, top-up update, withdrawal update, reward result, streak milestone/freeze/at-risk, referral update, maintenance, broadcast.

## 3. Rules
- Deep-link to safe targets only (tournament, wallet request, result, streak, referral, policy).
- Never include room password, OTP, raw payment reference, payout account, Super Key, or wallet balance in push/broadcast text.
- Targeted vs broadcast: broadcasts require permission + confirmation; record sender, segment, template, send time, delivery outcome.
- Templating: admin composes from approved templates; sensitive values are injected only into in-app detail views, not push copy.
- Rate-limit and quiet hours per player preference where configurable.

## 4. Implementation notes
- Store Expo push token per device in `auth`/profile-linked table; allow multiple devices.
- A worker (Edge Function cron / external queue) reads pending notifications and sends pushes; failures are logged and retried with backoff.
- Realtime subscription to `app.notifications` updates the inbox live.
