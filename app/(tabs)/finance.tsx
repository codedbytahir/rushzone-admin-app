import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Modal, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { tokens } from '../../src/theme/tokens';
import { api } from '../../src/lib/api';
import { getAdminSession } from '../../src/lib/adminSession';
import { ConfirmDialog } from '../../src/components/ConfirmDialog';
import { Card, ScreenHeader, StatusBadge, EmptyState, AppButton, Coin, Row, FieldLabel, statusTone } from '../../src/components/ui';
import type { TopupRequest, WithdrawalRequest } from '../../src/types/api';

export default function FinanceScreen() {
  const [activeTab, setActiveTab] = useState<'topups' | 'withdrawals'>('topups');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [topups, setTopups] = useState<TopupRequest[]>([]);
  const [topupStatus, setTopupStatus] = useState<string>('pending');

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [withdrawalStatus, setWithdrawalStatus] = useState<string>('pending');

  const [activeModal, setActiveModal] = useState<'proof' | 'reject_topup' | 'mark_paid' | 'reject_withdrawal' | 'wallet_correct' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [loadingProof, setLoadingProof] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [payoutRef, setPayoutRef] = useState('');
  const [secondReviewer, setSecondReviewer] = useState('');
  const [processing, setProcessing] = useState(false);

  const [targetProfileId, setTargetProfileId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('500');
  const [adjustDirection, setAdjustDirection] = useState<'credit' | 'debit'>('credit');
  const [adjustReason, setAdjustReason] = useState('');
  const [confirmApproveTopup, setConfirmApproveTopup] = useState<TopupRequest | null>(null);

  const isOwner = getAdminSession().isOwner;

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      if (activeTab === 'topups') {
        const res = await api.listTopups({ status: topupStatus });
        setTopups(res.data ?? []);
        if (res.error) setError(res.error.message);
      } else {
        const res = await api.listWithdrawals({ status: withdrawalStatus === 'pending' ? 'pending_review' : withdrawalStatus });
        setWithdrawals(res.data ?? []);
        if (res.error) setError(res.error.message);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load finance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, topupStatus, withdrawalStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleApproveTopup(item: any) {
    setProcessing(true);
    const res = await api.reviewTopup(item.id, 'approve');
    setProcessing(false);
    if (res.error) {
      alert(`Approval error: ${res.error.message}`);
    } else {
      alert('Top-up request approved and wallet credited!');
      fetchData();
    }
  }

  async function handleRejectTopup() {
    if (!selectedItem || !actionReason.trim()) {
      alert('Rejection reason is required');
      return;
    }
    setProcessing(true);
    const res = await api.reviewTopup(selectedItem.id, 'reject', actionReason.trim());
    setProcessing(false);
    if (res.error) {
      alert(`Rejection error: ${res.error.message}`);
    } else {
      alert('Top-up request rejected.');
      setActiveModal(null);
      fetchData();
    }
  }

  async function handleApproveWithdrawal(item: any) {
    setProcessing(true);
    const res = await api.approveWithdrawal(item.id);
    setProcessing(false);
    if (res.error) {
      alert(`Approval error: ${res.error.message}`);
    } else {
      alert('Withdrawal request approved!');
      fetchData();
    }
  }

  async function handleMarkPaid() {
    if (!selectedItem || !payoutRef.trim()) {
      alert('Payout Reference Number is required');
      return;
    }
    setProcessing(true);
    const res = await api.markWithdrawalPaid(selectedItem.id, payoutRef.trim(), secondReviewer.trim() || undefined);
    setProcessing(false);
    if (res.error) {
      alert(`Error marking paid: ${res.error.message}`);
    } else {
      alert('Withdrawal marked as PAID successfully!');
      setActiveModal(null);
      fetchData();
    }
  }

  async function handleRejectWithdrawal() {
    if (!selectedItem || !actionReason.trim()) {
      alert('Rejection reason is required');
      return;
    }
    setProcessing(true);
    const res = await api.rejectWithdrawal(selectedItem.id, actionReason.trim());
    setProcessing(false);
    if (res.error) {
      alert(`Rejection error: ${res.error.message}`);
    } else {
      alert('Withdrawal request rejected and funds refunded to held balance.');
      setActiveModal(null);
      fetchData();
    }
  }

  async function viewProof(item: any) {
    setSelectedItem(item);
    setProofUrl(null);
    setActiveModal('proof');
    if (item.proof_path) {
      setLoadingProof(true);
      const res = await api.getSignedUrl('payment-proofs', item.proof_path, 300);
      setLoadingProof(false);
      if (res.data?.signedUrl) setProofUrl(res.data.signedUrl);
    }
  }

  async function handleWalletCorrection() {
    if (!targetProfileId.trim() || !adjustReason.trim()) {
      alert('Profile ID and Reason are required');
      return;
    }
    const amt = parseInt(adjustAmount, 10);
    if (isNaN(amt) || amt <= 0) {
      alert('Enter valid positive amount');
      return;
    }
    setProcessing(true);
    const res = await api.correctWallet({
      profile_id: targetProfileId.trim(),
      amount: amt,
      direction: adjustDirection,
      reason: adjustReason.trim(),
    });
    setProcessing(false);
    if (res.error) {
      alert(`Wallet correction error: ${res.error.message}`);
    } else {
      alert(`Successfully ${adjustDirection === 'credit' ? 'credited' : 'debited'} ${amt} coins!`);
      setActiveModal(null);
      fetchData();
    }
  }

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        fetchData();
      }}
    >
      <ScreenHeader
        title="Finance & Wallet"
        subtitle="Review payment proofs, approve withdrawals, and audit the wallet ledger"
        right={
          isOwner ? (
            <AppButton variant="secondary" label="Wallet Correction" icon="swap-vertical-outline" onPress={() => setActiveModal('wallet_correct')} />
          ) : undefined
        }
      />

      {/* Primary tab switcher */}
      <View style={styles.mainTabs}>
        <Pressable style={[styles.mainTab, activeTab === 'topups' && styles.mainTabActive]} onPress={() => setActiveTab('topups')}>
          <Ionicons name="arrow-down-circle" size={16} color={activeTab === 'topups' ? tokens.color.ink : tokens.color.secondary} />
          <Text style={[styles.mainTabText, activeTab === 'topups' && styles.mainTabTextActive]}>Top-up Requests</Text>
        </Pressable>
        <Pressable style={[styles.mainTab, activeTab === 'withdrawals' && styles.mainTabActive]} onPress={() => setActiveTab('withdrawals')}>
          <Ionicons name="arrow-up-circle" size={16} color={activeTab === 'withdrawals' ? tokens.color.ink : tokens.color.secondary} />
          <Text style={[styles.mainTabText, activeTab === 'withdrawals' && styles.mainTabTextActive]}>Withdrawal Requests</Text>
        </Pressable>
      </View>

      {/* Sub filter */}
      <View style={styles.subFilterRow}>
        {(activeTab === 'topups' ? ['pending', 'approved', 'rejected'] : ['pending', 'approved', 'paid', 'rejected']).map((st) => {
          const active = activeTab === 'topups' ? topupStatus === st : withdrawalStatus === st;
          return (
            <Pressable
              key={st}
              onPress={() => (activeTab === 'topups' ? setTopupStatus(st) : setWithdrawalStatus(st))}
              style={[styles.subFilterTab, active && styles.subFilterTabActive]}
            >
              <Text style={[styles.subFilterTabText, active && styles.subFilterTabTextActive]}>{st.toUpperCase()}</Text>
            </Pressable>
          );
        })}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={tokens.color.primary} size="large" style={{ marginTop: 32 }} />
      ) : activeTab === 'topups' ? (
        topups.length === 0 ? (
          <Card>
            <EmptyState icon="arrow-down-circle-outline" title="No top-up requests" subtitle={`Status: ${topupStatus.toUpperCase()}`} />
          </Card>
        ) : (
          <View style={styles.listGrid}>
            {topups.map((t) => (
              <Card key={t.id} style={{ gap: tokens.space.md }}>
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.cardTitle}>{t.method?.toUpperCase()}</Text>
                    <Text style={styles.cardSubtitle}>Ref: {t.reference} · User: {t.profile_id}</Text>
                  </View>
                  <Row style={{ gap: 8 }}>
                    <Coin amount={t.amount_coins} size={14} />
                    <StatusBadge label={t.status ?? 'pending'} tone={statusTone(t.status)} />
                  </Row>
                </Row>

                {t.risk_flag || (Array.isArray(t.risk_flags) && t.risk_flags.length > 0) ? (
                  <View style={styles.riskBadge}>
                    <Ionicons name="alert-circle" size={14} color={tokens.color.coin} />
                    <Text style={styles.riskBadgeText}>Risk flag: {t.risk_flag ?? String((t.risk_flags as unknown[])[0])}</Text>
                  </View>
                ) : null}

                <View style={styles.cardActionsRow}>
                  {t.proof_path && (
                    <AppButton small variant="outline" label="View Proof" icon="image-outline" onPress={() => viewProof(t)} />
                  )}
                  {t.status === 'pending' && (
                    <>
                      <AppButton small label="Approve & Credit" icon="checkmark-circle-outline" onPress={() => setConfirmApproveTopup(t)} />
                      <AppButton
                        small
                        variant="danger"
                        label="Reject"
                        icon="close-circle-outline"
                        onPress={() => {
                          setSelectedItem(t);
                          setActionReason('');
                          setActiveModal('reject_topup');
                        }}
                      />
                    </>
                  )}
                </View>
              </Card>
            ))}
          </View>
        )
      ) : withdrawals.length === 0 ? (
        <Card>
          <EmptyState icon="arrow-up-circle-outline" title="No withdrawal requests" subtitle={`Status: ${withdrawalStatus.toUpperCase()}`} />
        </Card>
      ) : (
        <View style={styles.listGrid}>
          {withdrawals.map((w) => (
            <Card key={w.id} style={{ gap: tokens.space.md }}>
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.cardTitle}>{w.method?.toUpperCase()}</Text>
                  <Text style={styles.cardSubtitle}>Account: {w.account ?? w.account_snapshot ?? 'N/A'} · User: {w.profile_id}</Text>
                </View>
                <Row style={{ gap: 8 }}>
                  <Coin amount={w.amount_coins} size={14} />
                  <StatusBadge label={w.status ?? 'pending'} tone={statusTone(w.status)} />
                </Row>
              </Row>

              <View style={styles.cardActionsRow}>
                {w.status === 'pending_review' && (
                  <AppButton small variant="outline" label="Approve" icon="checkmark-circle-outline" onPress={() => handleApproveWithdrawal(w)} />
                )}
                {(w.status === 'pending_review' || w.status === 'approved') && (
                  <AppButton
                    small
                    label="Mark Paid"
                    icon="checkmark-done-circle-outline"
                    onPress={() => {
                      setSelectedItem(w);
                      setPayoutRef('');
                      setSecondReviewer('');
                      setActiveModal('mark_paid');
                    }}
                  />
                )}
                {w.status !== 'paid' && w.status !== 'rejected' && (
                  <AppButton
                    small
                    variant="danger"
                    label="Reject"
                    icon="close-circle-outline"
                    onPress={() => {
                      setSelectedItem(w);
                      setActionReason('');
                      setActiveModal('reject_withdrawal');
                    }}
                  />
                )}
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Modal: View Proof */}
      <Modal visible={activeModal === 'proof'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Payment Proof</Text>
            {loadingProof ? (
              <ActivityIndicator size="large" color={tokens.color.primary} style={{ marginVertical: 32 }} />
            ) : proofUrl ? (
              <Image source={{ uri: proofUrl }} style={styles.proofImage} resizeMode="contain" />
            ) : (
              <EmptyState icon="image-outline" title="No proof image" subtitle="No uploaded image found for this payment reference" />
            )}
            <AppButton variant="ghost" label="Close" onPress={() => setActiveModal(null)} />
          </View>
        </View>
      </Modal>

      {/* Modal: Reject Top-up */}
      <Modal visible={activeModal === 'reject_topup'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: tokens.color.danger }]}>Reject Top-up</Text>
            <FieldLabel>Reason for rejection</FieldLabel>
            <TextInput
              value={actionReason}
              onChangeText={setActionReason}
              placeholder="e.g. Reference mismatch / Invalid transaction proof"
              placeholderTextColor={tokens.color.disabled}
              style={styles.modalInput}
            />
            <View style={styles.modalBtnRow}>
              <AppButton variant="ghost" label="Cancel" onPress={() => setActiveModal(null)} />
              <AppButton label="Confirm Reject" variant="danger" icon="close-circle-outline" loading={processing} onPress={handleRejectTopup} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Mark Paid */}
      <Modal visible={activeModal === 'mark_paid'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Mark Withdrawal Paid</Text>
            <Text style={styles.modalSubtitle}>Amount: <Coin amount={selectedItem?.amount_coins ?? 0} size={12} /> · Account: {selectedItem?.account}</Text>

            <FieldLabel>Payout reference (TRX / bank ref)</FieldLabel>
            <TextInput value={payoutRef} onChangeText={setPayoutRef} placeholder="e.g. TRX-9402194812" placeholderTextColor={tokens.color.disabled} style={styles.modalInput} />

            {selectedItem?.amount_coins >= 5000 && (
              <>
                <FieldLabel>Second reviewer (required over 5,000 coins)</FieldLabel>
                <TextInput value={secondReviewer} onChangeText={setSecondReviewer} placeholder="e.g. owner_admin_uuid" placeholderTextColor={tokens.color.disabled} style={styles.modalInput} />
              </>
            )}

            <View style={styles.modalBtnRow}>
              <AppButton variant="ghost" label="Cancel" onPress={() => setActiveModal(null)} />
              <AppButton label="Confirm Paid" icon="checkmark-done-circle-outline" loading={processing} onPress={handleMarkPaid} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Reject Withdrawal */}
      <Modal visible={activeModal === 'reject_withdrawal'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: tokens.color.danger }]}>Reject Withdrawal</Text>
            <FieldLabel>Rejection reason</FieldLabel>
            <TextInput
              value={actionReason}
              onChangeText={setActionReason}
              placeholder="e.g. Account number invalid / Fraud suspicion"
              placeholderTextColor={tokens.color.disabled}
              style={styles.modalInput}
            />
            <View style={styles.modalBtnRow}>
              <AppButton variant="ghost" label="Cancel" onPress={() => setActiveModal(null)} />
              <AppButton label="Confirm Reject & Refund" variant="danger" icon="close-circle-outline" loading={processing} onPress={handleRejectWithdrawal} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Manual Wallet Correction */}
      <Modal visible={activeModal === 'wallet_correct'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Manual Wallet Correction</Text>
            <Text style={styles.modalSubtitle}>Audit-logged administrative wallet credit or debit</Text>

            <FieldLabel>Target player profile ID (UUID)</FieldLabel>
            <TextInput value={targetProfileId} onChangeText={setTargetProfileId} placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000" placeholderTextColor={tokens.color.disabled} style={styles.modalInput} />

            <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
              <View style={{ flex: 1 }}>
                <FieldLabel>Amount (coins)</FieldLabel>
                <TextInput value={adjustAmount} onChangeText={setAdjustAmount} keyboardType="numeric" placeholderTextColor={tokens.color.disabled} style={styles.modalInput} />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel>Direction</FieldLabel>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  <Pressable style={[styles.directionBtn, adjustDirection === 'credit' && styles.directionBtnActiveCredit]} onPress={() => setAdjustDirection('credit')}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: adjustDirection === 'credit' ? tokens.color.onPrimary : tokens.color.ink }}>Credit (+)</Text>
                  </Pressable>
                  <Pressable style={[styles.directionBtn, adjustDirection === 'debit' && styles.directionBtnActiveDebit]} onPress={() => setAdjustDirection('debit')}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: adjustDirection === 'debit' ? tokens.color.onPrimary : tokens.color.ink }}>Debit (-)</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <FieldLabel>Audit reason (min 5 chars)</FieldLabel>
            <TextInput value={adjustReason} onChangeText={setAdjustReason} placeholder="e.g. Compensation for tournament room crash" placeholderTextColor={tokens.color.disabled} style={styles.modalInput} />

            <View style={styles.modalBtnRow}>
              <AppButton variant="ghost" label="Cancel" onPress={() => setActiveModal(null)} />
              <AppButton label="Submit Correction" icon="swap-vertical-outline" loading={processing} onPress={handleWalletCorrection} />
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={confirmApproveTopup !== null}
        title="Approve top-up?"
        message={`${confirmApproveTopup?.amount_coins ?? 0} coins will be credited to the player's wallet and cannot be undone.`}
        confirmLabel="Approve & Credit"
        loading={processing}
        onCancel={() => setConfirmApproveTopup(null)}
        onConfirm={() => {
          if (!confirmApproveTopup) return;
          const item = confirmApproveTopup;
          setConfirmApproveTopup(null);
          handleApproveTopup(item);
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  mainTabs: {
    flexDirection: 'row',
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: 4,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  mainTab: {
    flex: 1,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: tokens.radius.button,
  },
  mainTabActive: { backgroundColor: tokens.color.creamPanel },
  mainTabText: { fontWeight: '700', fontSize: 14, color: tokens.color.secondary },
  mainTabTextActive: { color: tokens.color.ink },
  subFilterRow: { flexDirection: 'row', gap: 8 },
  subFilterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.surface,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  subFilterTabActive: { backgroundColor: tokens.color.primary, borderColor: tokens.color.primary },
  subFilterTabText: { fontSize: 12, fontWeight: '700', color: tokens.color.secondary },
  subFilterTabTextActive: { color: tokens.color.onPrimary },
  errorBox: { backgroundColor: tokens.color.dangerSoft, borderWidth: 1, borderColor: tokens.color.danger, borderRadius: tokens.radius.card, padding: tokens.space.md },
  errorText: { color: tokens.color.danger, fontWeight: '600' },
  listGrid: { gap: tokens.space.md },
  cardTitle: { fontSize: 16, fontWeight: '800', color: tokens.color.ink },
  cardSubtitle: { fontSize: 12, color: tokens.color.secondary, marginTop: 2 },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: tokens.color.warnSoft,
    borderWidth: 1,
    borderColor: tokens.color.coin,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: tokens.radius.input,
  },
  riskBadgeText: { fontSize: 12, fontWeight: '600', color: tokens.color.ink },
  cardActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: tokens.color.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space.md,
  },
  modalCard: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.space.lg,
    width: '100%',
    maxWidth: 520,
    gap: tokens.space.xs,
  },
  modalTitle: { fontSize: 19, fontWeight: '800', color: tokens.color.ink, letterSpacing: -0.3 },
  modalSubtitle: { fontSize: 13, color: tokens.color.secondary, marginBottom: 4 },
  proofImage: { width: '100%', height: 300, borderRadius: tokens.radius.input, marginVertical: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.input,
    padding: 10,
    color: tokens.color.ink,
    fontSize: 14,
    backgroundColor: tokens.color.canvas,
  },
  directionBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: tokens.radius.input,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.canvas,
  },
  directionBtnActiveCredit: { backgroundColor: tokens.color.success, borderColor: tokens.color.success },
  directionBtnActiveDebit: { backgroundColor: tokens.color.danger, borderColor: tokens.color.danger },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: tokens.space.sm, marginTop: tokens.space.md, flexWrap: 'wrap' },
});

