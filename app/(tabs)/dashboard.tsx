import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { tokens } from '../../src/theme/tokens';
import { api } from '../../src/lib/api';
import { Card, StatusBadge, EmptyState, AppButton, Coin, Row, SectionLabel, type IconName } from '../../src/components/ui';
import { BannerSlideshow } from '../../src/components/BannerSlideshow';
import type { ReportSummary, TopupRequest, WithdrawalRequest, Tournament } from '../../src/types/api';

type IonName = IconName;

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<ReportSummary | null>(null);
  const [topups, setTopups] = useState<TopupRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [reconcileResult, setReconcileResult] = useState<any>(null);
  const [reconciling, setReconciling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [repRes, topRes, witRes, tourRes] = await Promise.all([
        api.getReports(),
        api.listTopups({ status: 'pending', limit: 5 }),
        api.listWithdrawals({ status: 'pending_review', limit: 5 }),
        api.listTournaments({ limit: 5 }),
      ]);

      if (repRes.data) setReports(repRes.data);
      if (topRes.data) setTopups(Array.isArray(topRes.data) ? topRes.data : topRes.data?.items ?? []);
      if (witRes.data) setWithdrawals(Array.isArray(witRes.data) ? witRes.data : witRes.data?.items ?? []);
      if (tourRes.data) setTournaments(Array.isArray(tourRes.data) ? tourRes.data : tourRes.data?.tournaments ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRunReconciliation() {
    setReconciling(true);
    const res = await api.checkReconciliation();
    setReconciling(false);
    if (res.error) {
      alert(`Reconciliation error: ${res.error.message ?? 'Unknown'}`);
    } else {
      setReconcileResult(res.data);
      alert(`Reconciliation complete! Mismatches found: ${res.data?.mismatches?.length ?? 0}`);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={tokens.color.primary} />
        <Text style={styles.loadingText}>Loading overview…</Text>
      </View>
    );
  }

  const pendingTopupsCount = topups.length;
  const pendingWithdrawalsCount = withdrawals.length;
  const activeTournaments =
    reports?.tournaments?.active ??
    tournaments.filter((t) => t.status === 'live' || t.status === 'registration_open').length;
  const mismatchCount = reconcileResult?.mismatches?.length ?? 0;

  const metricCards: { label: string; value: string | number; sub: string; icon: IonName; color: string; onPress?: () => void; coin?: number }[] = [
    { label: 'Pending Top-ups', value: pendingTopupsCount, sub: 'Awaiting review', icon: 'arrow-down-circle', color: tokens.color.primary, onPress: () => router.push('/(tabs)/finance') },
    { label: 'Pending Withdrawals', value: pendingWithdrawalsCount, sub: 'Require payout confirmation', icon: 'arrow-up-circle', color: tokens.color.danger, onPress: () => router.push('/(tabs)/finance') },
    { label: 'Wallet Liability', value: '', sub: `Held: ${reports?.wallet?.held ?? 0} coins`, icon: 'wallet', color: tokens.color.coin, onPress: () => router.push('/(tabs)/finance'), coin: reports?.wallet?.liability ?? 0 },
    { label: 'Active Tournaments', value: activeTournaments, sub: `Total created: ${reports?.tournaments?.total ?? tournaments.length}`, icon: 'trophy', color: tokens.color.success, onPress: () => router.push('/(tabs)/tournaments') },
  ];

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}
    >
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Header banner */}
      <View style={styles.hero}>
        <View style={{ flex: 1, gap: 6 }}>
          <SectionLabel>Operations Overview</SectionLabel>
          <Text style={styles.heroTitle}>Rush Zone Control</Text>
          <Text style={styles.heroSubtitle}>Real-time operations and financial status</Text>
        </View>
        <View style={styles.heroRight}>
          <Row style={styles.heroBadges}>
            <StatusBadge label="Live backend" tone="success" />
            {reconcileResult && (
              <StatusBadge
                label={mismatchCount ? `Reconciled: ${mismatchCount} errors` : 'Ledger reconciled'}
                tone={mismatchCount ? 'danger' : 'success'}
              />
            )}
          </Row>
        </View>
      </View>

      {/* Home carousel slideshow (all active banners) */}
      <BannerSlideshow height={160} />

      {/* Metric grid */}
      <View style={styles.metricsGrid}>
        {metricCards.map((m) => (
          <Pressable
            key={m.label}
            style={({ pressed }) => [styles.metricCard, pressed && { opacity: 0.85 }]}
            onPress={m.onPress}
            disabled={!m.onPress}
          >
            <View style={[styles.metricIcon, { backgroundColor: tokens.color.canvas, borderColor: tokens.color.border }]}>
              <Ionicons name={m.icon} size={20} color={m.color} />
            </View>
            <Text style={styles.metricLabel}>{m.label}</Text>
            {m.coin !== undefined ? (
              <Coin amount={m.coin} size={24} />
            ) : (
              <Text style={[styles.metricValue, { color: m.color === tokens.color.coin ? tokens.color.ink : m.color }]}>{m.value}</Text>
            )}
            <Text style={styles.metricSubtext}>{m.sub}</Text>
          </Pressable>
        ))}
      </View>

      {/* Quick actions */}
      <Card>
        <Text style={styles.cardTitle}>Quick actions</Text>
        <View style={styles.actionRow}>
          <AppButton label="New Tournament" icon="add-circle" onPress={() => router.push('/(tabs)/tournaments')} />
          <AppButton label={`Review Top-ups (${pendingTopupsCount})`} variant="secondary" icon="arrow-down-circle-outline" onPress={() => router.push('/(tabs)/finance')} />
          <AppButton label={`Process Withdrawals (${pendingWithdrawalsCount})`} variant="secondary" icon="arrow-up-circle-outline" onPress={() => router.push('/(tabs)/finance')} />
          <AppButton label="Search Players" variant="secondary" icon="search-outline" onPress={() => router.push('/(tabs)/players')} />
          <AppButton label="Check Reconciliation" variant="outline" icon="sync-outline" loading={reconciling} onPress={handleRunReconciliation} />
        </View>
      </Card>

      {/* Priority queues */}
      <View style={styles.twoColumnGrid}>
        <View style={styles.queueColumn}>
          <View style={styles.queueHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="arrow-down-circle" size={18} color={tokens.color.primary} />
              <Text style={styles.cardTitle}>Top-up Queue</Text>
            </View>
            <Pressable onPress={() => router.push('/(tabs)/finance')}>
              <Text style={styles.linkText}>View all</Text>
            </Pressable>
          </View>
          {topups.length === 0 ? (
            <EmptyState icon="checkmark-circle-outline" title="No pending top-ups" subtitle="All caught up — nothing awaiting review" />
          ) : (
            <View style={styles.queueList}>
              {topups.map((it) => (
                <Row key={it.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{it.method.toUpperCase()}</Text>
                    <Text style={styles.itemSubtitle}>Ref: {it.reference}</Text>
                  </View>
                  <Coin amount={it.amount_coins} size={14} />
                  <AppButton small label="Review" onPress={() => router.push('/(tabs)/finance')} />
                </Row>
              ))}
            </View>
          )}
        </View>

        <View style={styles.queueColumn}>
          <View style={styles.queueHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="arrow-up-circle" size={18} color={tokens.color.danger} />
              <Text style={styles.cardTitle}>Withdrawal Queue</Text>
            </View>
            <Pressable onPress={() => router.push('/(tabs)/finance')}>
              <Text style={styles.linkText}>View all</Text>
            </Pressable>
          </View>
          {withdrawals.length === 0 ? (
            <EmptyState icon="checkmark-circle-outline" title="No pending withdrawals" subtitle="Nothing requires payout confirmation" />
          ) : (
            <View style={styles.queueList}>
              {withdrawals.map((it) => (
                <Row key={it.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{it.method.toUpperCase()}</Text>
                    <Text style={styles.itemSubtitle}>Account: {it.account ?? 'N/A'}</Text>
                  </View>
                  <Coin amount={it.amount_coins} size={14} />
                  <AppButton small label="Process" variant="danger" onPress={() => router.push('/(tabs)/finance')} />
                </Row>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Recent tournaments */}
      <Card>
        <View style={styles.queueHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="trophy" size={18} color={tokens.color.primary} />
            <Text style={styles.cardTitle}>Recent Tournaments</Text>
          </View>
          <Pressable onPress={() => router.push('/(tabs)/tournaments')}>
            <Text style={styles.linkText}>Manage all</Text>
          </Pressable>
        </View>
        {tournaments.length === 0 ? (
          <EmptyState icon="trophy-outline" title="No tournaments yet" subtitle="Create your first tournament from the Tournaments tab" />
        ) : (
          <View style={styles.queueList}>
            {tournaments.slice(0, 4).map((t) => (
              <Row key={t.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{t.title}</Text>
                  <Text style={styles.itemSubtitle}>
                    Entry <Coin amount={t.entry_fee ?? 0} size={11} /> · Prize <Coin amount={t.prize_pool ?? 0} size={11} /> · {t.capacity ?? 0} slots
                  </Text>
                </View>
                <StatusBadge label={t.status ?? 'draft'} tone={t.status === 'live' ? 'success' : 'primary'} />
              </Row>
            ))}
          </View>
        )}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.color.canvas, padding: tokens.space.md },
  loadingText: { marginTop: 12, color: tokens.color.secondary, fontWeight: '600' },
  errorBox: { backgroundColor: tokens.color.dangerSoft, borderWidth: 1, borderColor: tokens.color.danger, borderRadius: tokens.radius.card, padding: tokens.space.md },
  errorText: { color: tokens.color.danger, fontWeight: '600' },
  hero: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border,
    padding: tokens.space.lg,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
    gap: tokens.space.sm,
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: tokens.color.ink, letterSpacing: -0.4 },
  heroSubtitle: { fontSize: 14, color: tokens.color.secondary },
  heroRight: { alignItems: 'flex-end' },
  heroBadges: { flexWrap: 'wrap', justifyContent: 'flex-end' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.md },
  metricCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 230 : '46%',
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border,
    padding: tokens.space.lg,
    gap: 4,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricLabel: { fontSize: 12, fontWeight: '600', color: tokens.color.secondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  metricValue: { fontSize: 30, fontWeight: '800', color: tokens.color.ink, fontVariant: ['tabular-nums'] },
  metricSubtext: { fontSize: 12, color: tokens.color.secondary },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  cardTitle: { fontSize: 16, fontWeight: '700', color: tokens.color.ink },
  twoColumnGrid: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: tokens.space.md },
  queueColumn: {
    flex: 1,
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border,
    padding: tokens.space.lg,
    gap: tokens.space.sm,
  },
  queueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  queueList: { gap: 2 },
  linkText: { color: tokens.color.primary, fontWeight: '600', fontSize: 13 },
  itemRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: tokens.color.border },
  itemTitle: { fontSize: 14, fontWeight: '700', color: tokens.color.ink },
  itemSubtitle: { fontSize: 12, color: tokens.color.secondary, marginTop: 1 },
});
