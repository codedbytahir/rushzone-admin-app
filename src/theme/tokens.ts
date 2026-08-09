// src/theme/tokens.ts — Design tokens per docs/shared/07-design-tokens.md
// Admin warm-cream variant of the mountain-sunset brand language.
//
// Note: React Native does not parse CSS-style font fallback lists
// ("PP Editorial Old", Georgia, serif). Fonts must be either a single
// family name loaded via expo-google-fonts, or a generic name the platform
// understands ("serif", "sans-serif"). We use platform generics here so the
// editorial serif + Inter/sans look is honored on iOS, Android and web
// without an extra asset dependency.

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
  // 4/8 spacing scale; use these instead of bare paddings so screens don't
  // feel cramped or inconsistent.
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const,
  // Per spec: min 44x44 touch targets.
  touchMin: 44,
  sunsetStripeHeight: 4,
  font: {
    // Editorial serif -> platform serif (Georgia on iOS).
    display: 'Georgia',
    // Inter/system sans -> platform sans-serif.
    ui: 'sans-serif',
    mono: 'monospace',
  },
  // Type scale tuned for a 390x844 mobile target.
  text: {
    display: { fontFamily: 'Georgia', fontSize: 28, lineHeight: 34, fontWeight: '700' },
    h1: { fontFamily: 'Georgia', fontSize: 22, lineHeight: 28, fontWeight: '700' },
    h2: { fontFamily: 'sans-serif', fontSize: 18, lineHeight: 24, fontWeight: '700' },
    body: { fontFamily: 'sans-serif', fontSize: 15, lineHeight: 22, fontWeight: '400' },
    label: { fontFamily: 'sans-serif', fontSize: 13, lineHeight: 18, fontWeight: '600' },
    caption: { fontFamily: 'sans-serif', fontSize: 12, lineHeight: 16, fontWeight: '400' },
  } as const,
} as const;

export type Tokens = typeof tokens;
export type ColorToken = keyof typeof tokens.color;
export type SpaceToken = keyof typeof tokens.space;
