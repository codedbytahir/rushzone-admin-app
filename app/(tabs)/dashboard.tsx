import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { tokens } from '../../src/theme/tokens';
import { api } from '../../src/lib/api';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<any>(null);
  const [topups, setTopups] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [reconcileResult, setReconcileResult] = useState<any>(null);
  const [reconciling, setReconciling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [repRes, topRes, witRes, tourRes] = await Promise.all([
        api.getReports(),
        api.listTopups({ status: 'pending', limit: 5 }),
        api.listWithdrawals({ status: 'pending', limit: 5 }),
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
        <Text style={styles.loadingText}>Loading Dashboard metrics...</Text>
      </View>
    );
  }

  const pendingTopupsCount = topups.length;
  const pendingWithdrawalsCount = withdrawals.length;

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

      {/* Header Banner */}
      <View style={styles.headerCard}>
        <View style={styles.headerMain}>
          <Text style={styles.headerTitle}>Rush Zone Control</Text>
          <Text style={styles.headerSubtitle}>Real-time Operations & Financial Overview</Text>
        </View>
        <View style={styles.statusBadgeGroup}>
          <View style={[styles.statusBadge, { backgroundColor: '#E8F5E9', borderColor: tokens.color.success }]}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: tokens.color.success }}>● Live Backend</Text>
          </View>
          {reconcileResult && (
            <View style={[styles.statusBadge, { backgroundColor: reconcileResult?.mismatches?.length ? '#FFEBEE' : '#E8F5E9' }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: reconcileResult?.mismatches?.length ? tokens.color.danger : tokens.color.success }}>
                Reconciled: {reconcileResult?.mismatches?.length ?? 0} errors
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Primary Metrics Grid */}
      <View style={styles.metricsGrid}>
        <Pressable style={styles.metricCard} onPress={() => router.push('/(tabs)/finance')}>
          <Text style={styles.metricLabel}>Pending Top-ups</Text>
          <Text style={[styles.metricValue, { color: pendingTopupsCount > 0 ? tokens.color.primary : tokens.color.ink }]}>
            {pendingTopupsCount}
          </Text>
          <Text style={styles.metricSubtext}>Awaiting review</Text>
        </Pressable>

        <Pressable style={styles.metricCard} onPress={() => router.push('/(tabs)/finance')}>
          <Text style={styles.metricLabel}>Pending Withdrawals</Text>
          <Text style={[styles.metricValue, { color: pendingWithdrawalsCount > 0 ? tokens.color.danger : tokens.color.ink }]}>
            {pendingWithdrawalsCount}
          </Text>
          <Text style={styles.metricSubtext}>Requires payout confirmation</Text>
        </Pressable>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Wallet Liability</Text>
          <Text style={styles.metricValue}>
            🪙 {reports?.wallet_accounts?.liability ?? reports?.liability ?? 0}
          </Text>
          <Text style={styles.metricSubtext}>Held: {reports?.wallet_accounts?.held ?? 0} coins</Text>
        </View>

        <Pressable style={styles.metricCard} onPress={() => router.push('/(tabs)/tournaments')}>
          <Text style={styles.metricLabel}>Active Tournaments</Text>
          <Text style={[styles.metricValue, { color: tokens.color.success }]}>
            {reports?.tournaments?.active ?? tournaments.filter((t) => t.status === 'live' || t.status === 'registration_open').length}
          </Text>
          <Text style={styles.metricSubtext}>Total created: {reports?.tournaments?.total ?? tournaments.length}</Text>
        </Pressable>
      </View>

      {/* Quick Action Toolbar */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtnPrimary} onPress={() => router.push('/(tabs)/tournaments')}>
            <Text style={styles.actionBtnTextPrimary}>+ Tournaments</Text>
          </Pressable>

          <Pressable style={styles.actionBtnSecondary} onPress={() => router.push('/(tabs)/finance')}>
            <Text style={styles.actionBtnTextSecondary}>Review Topups ({pendingTopupsCount})</Text>
          </Pressable>

          <Pressable style={styles.actionBtnSecondary} onPress={() => router.push('/(tabs)/finance')}>
            <Text style={styles.actionBtnTextSecondary}>Process Withdrawals ({pendingWithdrawalsCount})</Text>
          </Pressable>

          <Pressable style={styles.actionBtnSecondary} onPress={() => router.push('/(tabs)/players')}>
            <Text style={styles.actionBtnTextSecondary}>Search Players</Text>
          </Pressable>

          <Pressable style={styles.actionBtnOutline} onPress={handleRunReconciliation} disabled={reconciling}>
            {reconciling ? (
              <ActivityIndicator color={tokens.color.ink} size="small" />
            ) : (
              <Text style={styles.actionBtnTextOutline}>Check Reconciliation</Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Priority Queue Cards */}
      <View style={styles.twoColumnGrid}>
        {/* Topups Queue */}
        <View style={styles.cardColumn}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderTitle}>Top-up Requests Queue</Text>
            <Pressable onPress={() => router.push('/(tabs)/finance')}>
              <Text style={styles.linkText}>View All →</Text>
            </Pressable>
          </View>
          {topups.length === 0 ? (
            <View style={styles.emptyStateBox}>
              <Text style={styles.emptyStateText}>No pending top-up requests 🎉</Text>
            </View>
          ) : (
            topups.map((it) => (
              <View key={it.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{it.method.toUpperCase()} — 🪙 {it.amount_coins}</Text>
                  <Text style={styles.itemSubtitle}>Ref: {it.reference} · User: {it.profile_id?.substring(0, 8)}...</Text>
                </View>
                <Pressable
                  style={styles.smallActionBtn}
                  onPress={() => router.push('/(tabs)/finance')}
                >
                  <Text style={styles.smallActionText}>Review</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        {/* Withdrawals Queue */}
        <View style={styles.cardColumn}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderTitle}>Withdrawal SLA Queue</Text>
            <Pressable onPress={() => router.push('/(tabs)/finance')}>
              <Text style={styles.linkText}>View All →</Text>
            </Pressable>
          </View>
          {withdrawals.length === 0 ? (
            <View style={styles.emptyStateBox}>
              <Text style={styles.emptyStateText}>No pending withdrawal requests 🎉</Text>
            </View>
          ) : (
            withdrawals.map((it) => (
              <View key={it.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{it.method.toUpperCase()} — 🪙 {it.amount_coins}</Text>
                  <Text style={styles.itemSubtitle}>Account: {it.account ?? 'N/A'}</Text>
                </View>
                <Pressable
                  style={[styles.smallActionBtn, { backgroundColor: tokens.color.ink }]}
                  onPress={() => router.push('/(tabs)/finance')}
                >
                  <Text style={styles.smallActionText}>Process</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Tournaments Snapshot */}
      <View style={styles.sectionCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeaderTitle}>Recent Tournaments</Text>
          <Pressable onPress={() => router.push('/(tabs)/tournaments')}>
            <Text style={styles.linkText}>Manage All →</Text>
          </Pressable>
        </View>
        {tournaments.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <Text style={styles.emptyStateText}>No tournaments created yet</Text>
          </View>
        ) : (
          tournaments.slice(0, 4).map((t) => (
            <View key={t.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{t.title}</Text>
                <Text style={styles.itemSubtitle}>
                  Fee: 🪙 {t.entry_fee_coins ?? 0} · Prize: 🪙 {t.prize_pool_coins ?? 0} · Players: {t.max_players}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: t.status === 'live' ? '#E8F5E9' : tokens.color.creamPanel }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: tokens.color.ink }}>
                  {(t.status ?? 'draft').toUpperCase()}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.canvas,
    padding: tokens.space.md,
  },
  loadingText: {
    marginTop: 12,
    color: tokens.color.secondary,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: tokens.color.danger,
    borderRadius: tokens.radius.card,
    padding: tokens.space.md,
  },
  errorText: {
    color: tokens.color.danger,
    fontWeight: '600',
  },
  headerCard: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.space.lg,
    borderWidth: 1,
    borderColor: tokens.color.border,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
    gap: tokens.space.sm,
  },
  headerMain: {
    gap: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: tokens.color.ink,
  },
  headerSubtitle: {
    fontSize: 14,
    color: tokens.color.secondary,
  },
  statusBadgeGroup: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.md,
  },
  metricCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 220 : '45%',
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.space.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.color.secondary,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: tokens.color.ink,
    marginVertical: 4,
  },
  metricSubtext: {
    fontSize: 12,
    color: tokens.color.secondary,
  },
  sectionCard: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.space.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: tokens.space.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: tokens.color.ink,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
  },
  actionBtnPrimary: {
    backgroundColor: tokens.color.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: tokens.radius.button,
  },
  actionBtnTextPrimary: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  actionBtnSecondary: {
    backgroundColor: tokens.color.creamPanel,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: tokens.radius.button,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  actionBtnTextSecondary: {
    color: tokens.color.ink,
    fontWeight: '600',
    fontSize: 13,
  },
  actionBtnOutline: {
    backgroundColor: tokens.color.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: tokens.radius.button,
    borderWidth: 1,
    borderColor: tokens.color.ink,
  },
  actionBtnTextOutline: {
    color: tokens.color.ink,
    fontWeight: '600',
    fontSize: 13,
  },
  twoColumnGrid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: tokens.space.md,
  },
  cardColumn: {
    flex: 1,
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.space.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: tokens.space.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: tokens.color.ink,
  },
  linkText: {
    color: tokens.color.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  emptyStateBox: {
    padding: tokens.space.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.canvas,
    borderRadius: tokens.radius.input,
  },
  emptyStateText: {
    color: tokens.color.secondary,
    fontSize: 13,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.border,
    gap: tokens.space.sm,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: tokens.color.ink,
  },
  itemSubtitle: {
    fontSize: 12,
    color: tokens.color.secondary,
    marginTop: 2,
  },
  smallActionBtn: {
    backgroundColor: tokens.color.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.button,
  },
  smallActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
