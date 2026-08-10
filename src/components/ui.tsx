// src/components/ui.tsx — Shared design-system primitives for the admin console.
// Single source of truth for cards, buttons, badges, icons, and empty states so
// every screen looks consistent, spacious, and professional (no emoji icons).
import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '../theme/tokens';

/* ---------------------------------- Icon ---------------------------------- */

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

/* ---------------------------------- Coin ---------------------------------- */
// Gold coin + formatted number. Replaces the old emoji "🪙".
export function Coin({ amount, size = 14 }: { amount: number; size?: number }) {
  // Renders a single <Text> (gold dot glyph + number) so it can be nested
  // inside other Text components without violating RN's text-nesting rules.
  return (
    <Text style={[styles.coinText, { fontSize: size, color: tokens.color.coin }]}>
      {'● '}{amount.toLocaleString()}
    </Text>
  );
}

/* ---------------------------------- Card ---------------------------------- */

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable style={[styles.card, style]} onPress={onPress}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

/* ------------------------------ Screen header ------------------------------ */

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.headerText}>
        <Text style={styles.screenTitle}>{title}</Text>
        {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

/* -------------------------------- StatusBadge ------------------------------ */

type BadgeTone = 'success' | 'danger' | 'warn' | 'info' | 'neutral' | 'primary';

const badgeTones: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: tokens.color.successSoft, fg: tokens.color.success },
  danger: { bg: tokens.color.dangerSoft, fg: tokens.color.danger },
  warn: { bg: tokens.color.warnSoft, fg: tokens.color.coin },
  info: { bg: tokens.color.infoSoft, fg: '#9DC3E8' },
  neutral: { bg: tokens.color.creamPanel, fg: tokens.color.secondary },
  primary: { bg: tokens.color.creamPanel, fg: tokens.color.primary },
};

export function StatusBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: BadgeTone;
}) {
  const t = badgeTones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: t.fg }]} />
      <Text style={[styles.badgeText, { color: t.fg }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

// Map backend status strings -> badge tone.
export function statusTone(status?: string): BadgeTone {
  switch (status) {
    case 'live':
    case 'paid':
    case 'approved':
    case 'active':
    case 'completed':
    case 'registration_open':
      return 'success';
    case 'cancelled':
    case 'rejected':
    case 'banned':
    case 'suspended':
    case 'expired':
    case 'draft':
      return 'danger';
    case 'scheduled':
    case 'pending':
    case 'pending_review':
    case 'restricted':
      return 'warn';
    case 'closed':
    case 'inactive':
      return 'neutral';
    default:
      return 'neutral';
  }
}

/* -------------------------------- EmptyState ------------------------------- */

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  subtitle,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={26} color={tokens.color.disabled} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

/* --------------------------------- Buttons --------------------------------- */

type BtnVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
  small = false,
}: {
  label: string;
  onPress?: () => void;
  variant?: BtnVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  small?: boolean;
}) {
  const isDisabled = disabled || loading;
  const bg =
    variant === 'primary'
      ? tokens.color.primary
      : variant === 'danger'
      ? tokens.color.danger
      : variant === 'secondary'
      ? tokens.color.surfaceRaised
      : 'transparent';
  const border = variant === 'outline' || variant === 'ghost' ? tokens.color.border : 'transparent';
  const fg =
    variant === 'primary' || variant === 'danger'
      ? tokens.color.onPrimary
      : variant === 'ghost'
      ? tokens.color.secondary
      : tokens.color.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: bg, borderWidth: variant === 'ghost' ? 0 : 1, borderColor: border },
        pressed && !isDisabled && styles.btnPressed,
        isDisabled && styles.btnDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <View style={styles.btnInner}>
          {icon ? <Ionicons name={icon} size={small ? 14 : 16} color={fg} style={{ marginRight: 6 }} /> : null}
          <Text style={[styles.btnText, small && styles.btnTextSmall, { color: fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

/* --------------------------------- Avatar ---------------------------------- */

export function Avatar({ name, size = 40 }: { name?: string; size?: number }) {
  const letter = (name ?? '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.42 }]}>{letter}</Text>
    </View>
  );
}

/* ------------------------------- Section label ----------------------------- */

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

/* ------------------------------- Field label ------------------------------- */

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

/* ---------------------------------- List row ------------------------------- */

export function Row({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.row, style]}>{children}</View>;
}

/* ---------------------------------- Styles --------------------------------- */

const styles = StyleSheet.create({
  coinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  coinDot: {
    backgroundColor: tokens.color.coin,
  },
  coinText: {
    color: tokens.color.ink,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  card: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border,
    padding: tokens.space.lg,
    gap: tokens.space.sm,
  },
  headerRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.space.sm,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: tokens.color.ink,
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    fontSize: 14,
    color: tokens.color.secondary,
    lineHeight: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: tokens.radius.pill,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.space.xl,
    paddingHorizontal: tokens.space.lg,
    gap: 6,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.color.canvas,
    borderWidth: 1,
    borderColor: tokens.color.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: tokens.color.ink,
  },
  emptySubtitle: {
    fontSize: 13,
    color: tokens.color.secondary,
    textAlign: 'center',
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: tokens.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: tokens.touchMin,
  },
  btnSmall: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 34,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  btnTextSmall: {
    fontSize: 12,
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  avatar: {
    backgroundColor: tokens.color.creamPanel,
    borderWidth: 1,
    borderColor: tokens.color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: tokens.color.ink,
    fontWeight: '800',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.color.primary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: tokens.color.secondary,
    marginTop: 4,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
});
