# 07 — Design Tokens (Shared Language)

Both apps share the **mountain-sunset** brand language. The Player App uses a dark espresso version; Rush Zone Control uses a warm light/cream version for long operational/finance sessions. They feel like one product but are tuned for their audience.

## Shared constants
- Cards 12px radius; buttons/inputs 8px radius; small badges may be pills.
- Minimum touch target 44×44px.
- Display: editorial serif (PP Editorial Old → Georgia/Times fallback).
- UI: Inter → system sans-serif.
- Sunset stripe motif above every bottom nav: `red → orange → gold → cream` (player fades into espresso; admin fades into cream).
- Status is never color-only; always pair with icon/label.

## Player App — dark espresso (only theme, no toggle)

| Token | Value |
|---|---|
| Canvas | `#1C140F` |
| Surface | `#261B14` |
| Surface raised | `#2F2219` |
| Inset panel | `#33251A` |
| Primary text | `#F6ECDC` |
| Secondary text | `#B9A488` |
| Disabled | `#7A6853` |
| Primary action | `#ED5A1F` |
| Primary pressed | `#C24716` |
| Coin / streak | `#F4B826` |
| Celebration glow | `#FFC46B` |
| Success | `#4F9A66` |
| Danger | `#C8493B` |
| Border | `#4A382A` |
| Divider | `#3A2B20` |

## Admin App — warm cream (operational clarity)

| Token | Value |
|---|---|
| Canvas | `#FFFDF6` |
| Surface / card | `#FFFFFF` with warm shadow |
| Cream panel | `#FFF0C3` |
| Ink / primary text | `#172016` |
| Secondary text | `#5B4E3C` |
| Primary action | `#ED5A1F` |
| Primary pressed | `#C24716` |
| Coin/highlight | `#F4B826` |
| Success | `#39754B` |
| Danger | `#B23A2E` |
| Border | `#DED3B9` |

Use the dark tokens in `user-app/`, light tokens in `admin-app/`. Reuse the same type scale and spacing system.
