// src/theme/tokens.ts — Design tokens per docs/shared/07-design-tokens.md (Admin warm cream variant)

export const tokens = {
  color: {
    canvas: '#FFFDF6',
    surface: '#FFFFFF',
    creamPanel: '#FFF0C3',
    ink: '#172016',
    secondary: '#5B4E3C',
    primary: '#ED5A1F',
    primaryPressed: '#C24716',
    coin: '#F4B826',
    success: '#39754B',
    danger: '#B23A2E',
    border: '#DED3B9',
    disabled: '#A99C82',
    // sunset stripe (red -> orange -> gold -> cream) above bottom nav on every admin screen
    sunset: ['#C8493B', '#ED5A1F', '#F4B826', '#FFF0C3'] as const,
  },
  radius: {
    card: 12,
    button: 8,
    input: 8,
    pill: 999,
  },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  font: {
    display: '"PP Editorial Old", Georgia, serif', // fallback per spec
    ui: 'Inter, system-ui, -apple-system, sans-serif',
  },
  touchMin: 44,
  sunsetStripeHeight: 4,
} as const;

export type Tokens = typeof tokens;
