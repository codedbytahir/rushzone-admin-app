# Rush Zone Control — Owner & Admin App

The secure operations app for the Owner and approved admins (React Native + Expo, Android-first). It is a separate app from the Player, but uses the **same Supabase project and database** in `../shared/`.

Read in order:
- [00-purpose-and-security.md](00-purpose-and-security.md)
- [01-navigation-and-dashboard.md](01-navigation-and-dashboard.md)
- [02-tournaments-rooms-results.md](02-tournaments-rooms-results.md)
- [03-finance-rewards-moderation.md](03-finance-rewards-moderation.md)
- [04-admin-access-settings.md](04-admin-access-settings.md)
- [05-ui-audit-and-acceptance.md](05-ui-audit-and-acceptance.md)
- [06-engagement-content.md](06-engagement-content.md) — streaks, referrals, share analytics, banners/announcement/featured

Shared foundation (read first):
- [`../shared/02-auth-and-supabase-keys.md`](../shared/02-auth-and-supabase-keys.md) — email OTP + Super Key; **publishable key** rules
- [`../shared/01-database-schema.md`](../shared/01-database-schema.md)
- [`../shared/03-wallet-and-ledger.md`](../shared/03-wallet-and-ledger.md)
- [`../shared/04-edge-functions-api.md`](../shared/04-edge-functions-api.md)
