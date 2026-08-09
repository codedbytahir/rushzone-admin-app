import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Modal, ScrollView, Image, ActivityIndicator, Platform } from 'react-native';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { tokens } from '../../src/theme/tokens';
import { api } from '../../src/lib/api';

export default function FinanceScreen() {
  const [activeTab, setActiveTab] = useState<'topups' | 'withdrawals'>('topups');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Topups state
  const [topups, setTopups] = useState<any[]>([]);
  const [topupStatus, setTopupStatus] = useState<string>('pending');

  // Withdrawals state
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalStatus, setWithdrawalStatus] = useState<string>('pending');

  // Modals & Action States
  const [activeModal, setActiveModal] = useState<'proof' | 'reject_topup' | 'mark_paid' | 'reject_withdrawal' | 'wallet_correct' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [loadingProof, setLoadingProof] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [payoutRef, setPayoutRef] = useState('');
  const [secondReviewer, setSecondReviewer] = useState('');
  const [processing, setProcessing] = useState(false);

  // Wallet Correction Form
  const [targetProfileId, setTargetProfileId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('500');
  const [adjustDirection, setAdjustDirection] = useState<'credit' | 'debit'>('credit');
  const [adjustReason, setAdjustReason] = useState('');

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      if (activeTab === 'topups') {
        const res = await api.listTopups({ status: topupStatus });
        if (res.data) setTopups(Array.isArray(res.data) ? res.data : res.data?.items ?? []);
        else if (res.error) setError(res.error.message);
      } else {
        const res = await api.listWithdrawals({ status: withdrawalStatus });
        if (res.data) setWithdrawals(Array.isArray(res.data) ? res.data : res.data?.items ?? []);
        else if (res.error) setError(res.error.message);
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

  // Top-up Actions
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

  // Withdrawal Actions
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
      {/* Top Header & Toolbar */}
      <View style={styles.topBar}>
        <View style={styles.topBarTitleGroup}>
          <Text style={styles.screenTitle}>Financial Queue & Wallet Control</Text>
          <Text style={styles.screenSubtitle}>Review payment proofs, approve withdrawals, and audit wallet ledger</Text>
        </View>
        <Pressable style={styles.adjustBtn} onPress={() => setActiveModal('wallet_correct')}>
          <Text style={styles.adjustBtnText}>💳 Manual Wallet Correction</Text>
        </Pressable>
      </View>

      {/* Primary Tab Switcher */}
      <View style={styles.mainTabs}>
        <Pressable
          style={[styles.mainTab, activeTab === 'topups' && styles.mainTabActive]}
          onPress={() => setActiveTab('topups')}
        >
          <Text style={[styles.mainTabText, activeTab === 'topups' && styles.mainTabTextActive]}>
            📥 Top-up Requests
          </Text>
        </Pressable>
        <Pressable
          style={[styles.mainTab, activeTab === 'withdrawals' && styles.mainTabActive]}
          onPress={() => setActiveTab('withdrawals')}
        >
          <Text style={[styles.mainTabText, activeTab === 'withdrawals' && styles.mainTabTextActive]}>
            📤 Withdrawal Requests
          </Text>
        </Pressable>
      </View>

      {/* Sub Filter */}
      <View style={styles.subFilterRow}>
        {activeTab === 'topups' ? (
          ['pending', 'approved', 'rejected'].map((st) => (
            <Pressable
              key={st}
              onPress={() => setTopupStatus(st)}
              style={[styles.subFilterTab, topupStatus === st && styles.subFilterTabActive]}
            >
              <Text style={[styles.subFilterTabText, topupStatus === st && styles.subFilterTabTextActive]}>
                {st.toUpperCase()}
              </Text>
            </Pressable>
          ))
        ) : (
          ['pending', 'approved', 'paid', 'rejected'].map((st) => (
            <Pressable
              key={st}
              onPress={() => setWithdrawalStatus(st)}
              style={[styles.subFilterTab, withdrawalStatus === st && styles.subFilterTabActive]}
            >
              <Text style={[styles.subFilterTabText, withdrawalStatus === st && styles.subFilterTabTextActive]}>
                {st.toUpperCase()}
              </Text>
            </Pressable>
          ))
        )}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Content List */}
      {loading ? (
        <ActivityIndicator color={tokens.color.primary} size="large" style={{ marginTop: 24 }} />
      ) : activeTab === 'topups' ? (
        topups.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Top-up Requests Found</Text>
            <Text style={styles.emptySubtitle}>Status: {topupStatus.toUpperCase()}</Text>
          </View>
        ) : (
          <View style={styles.listGrid}>
            {topups.map((t) => (
              <View key={t.id} style={styles.queueCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{t.method?.toUpperCase()} — 🪙 {t.amount_coins}</Text>
                    <Text style={styles.cardSubtitle}>Ref: {t.reference} · User: {t.profile_id}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: t.status === 'approved' ? '#E8F5E9' : t.status === 'rejected' ? '#FFEBEE' : tokens.color.creamPanel }]}>
                    <Text style={styles.statusBadgeText}>{(t.status ?? 'pending').toUpperCase()}</Text>
                  </View>
                </View>

                {t.risk_flag && (
                  <View style={styles.riskBadge}>
                    <Text style={styles.riskBadgeText}>⚠️ Risk Flag: {t.risk_flag}</Text>
                  </View>
                )}

                <View style={styles.cardActionsRow}>
                  {t.proof_path && (
                    <Pressable style={styles.secondaryBtn} onPress={() => viewProof(t)}>
                      <Text style={styles.secondaryBtnText}>🖼️ View Proof</Text>
                    </Pressable>
                  )}

                  {t.status === 'pending' && (
                    <>
                      <Pressable style={styles.approveBtn} onPress={() => handleApproveTopup(t)} disabled={processing}>
                        <Text style={styles.approveBtnText}>Approve & Credit</Text>
                      </Pressable>
                      <Pressable
                        style={styles.rejectBtn}
                        onPress={() => {
                          setSelectedItem(t);
                          setActionReason('');
                          setActiveModal('reject_topup');
                        }}
                      >
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            ))}
          </View>
        )
      ) : (
        withdrawals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Withdrawal Requests Found</Text>
            <Text style={styles.emptySubtitle}>Status: {withdrawalStatus.toUpperCase()}</Text>
          </View>
        ) : (
          <View style={styles.listGrid}>
            {withdrawals.map((w) => (
              <View key={w.id} style={styles.queueCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{w.method?.toUpperCase()} — 🪙 {w.amount_coins}</Text>
                    <Text style={styles.cardSubtitle}>Account: {w.account ?? 'N/A'} · User: {w.profile_id}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: w.status === 'paid' ? '#E8F5E9' : w.status === 'rejected' ? '#FFEBEE' : tokens.color.creamPanel }]}>
                    <Text style={styles.statusBadgeText}>{(w.status ?? 'pending').toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.cardActionsRow}>
                  {w.status === 'pending' && (
                    <Pressable style={styles.secondaryBtn} onPress={() => handleApproveWithdrawal(w)} disabled={processing}>
                      <Text style={styles.secondaryBtnText}>Approve</Text>
                    </Pressable>
                  )}

                  {(w.status === 'pending' || w.status === 'approved') && (
                    <Pressable
                      style={styles.approveBtn}
                      onPress={() => {
                        setSelectedItem(w);
                        setPayoutRef('');
                        setSecondReviewer('');
                        setActiveModal('mark_paid');
                      }}
                    >
                      <Text style={styles.approveBtnText}>Mark Paid</Text>
                    </Pressable>
                  )}

                  {w.status !== 'paid' && w.status !== 'rejected' && (
                    <Pressable
                      style={styles.rejectBtn}
                      onPress={() => {
                        setSelectedItem(w);
                        setActionReason('');
                        setActiveModal('reject_withdrawal');
                      }}
                    >
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </View>
        )
      )}

      {/* Modal: View Proof */}
      <Modal visible={activeModal === 'proof'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Payment Proof Attachment</Text>
            {loadingProof ? (
              <ActivityIndicator size="large" color={tokens.color.primary} style={{ marginVertical: 32 }} />
            ) : proofUrl ? (
              <Image source={{ uri: proofUrl }} style={styles.proofImage} resizeMode="contain" />
            ) : (
              <Text style={{ textAlign: 'center', color: tokens.color.secondary, marginVertical: 20 }}>
                No uploaded image found for this payment reference
              </Text>
            )}
            <Pressable style={styles.modalCancelBtn} onPress={() => setActiveModal(null)}>
              <Text style={styles.modalCancelText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal: Reject Top-up */}
      <Modal visible={activeModal === 'reject_topup'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: tokens.color.danger }]}>Reject Top-up Request</Text>

            <Text style={styles.inputLabel}>Reason for Rejection</Text>
            <TextInput
              value={actionReason}
              onChangeText={setActionReason}
              placeholder="e.g. Reference mismatch / Invalid transaction proof"
              style={styles.modalInput}
            />

            <View style={styles.modalBtnRow}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalSubmitBtn, { backgroundColor: tokens.color.danger }]} onPress={handleRejectTopup} disabled={processing}>
                {processing ? <ActivityIndicator color="white" /> : <Text style={styles.modalSubmitText}>Confirm Reject</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Mark Paid */}
      <Modal visible={activeModal === 'mark_paid'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Mark Withdrawal Paid</Text>
            <Text style={styles.modalSubtitle}>Amount: 🪙 {selectedItem?.amount_coins} · Account: {selectedItem?.account}</Text>

            <Text style={styles.inputLabel}>Payout Reference TRX ID / Bank Ref</Text>
            <TextInput
              value={payoutRef}
              onChangeText={setPayoutRef}
              placeholder="e.g. TRX-9402194812"
              style={styles.modalInput}
            />

            {selectedItem?.amount_coins >= 5000 && (
              <>
                <Text style={styles.inputLabel}>Second Reviewer ID (Required &gt; 5,000 coins)</Text>
                <TextInput
                  value={secondReviewer}
                  onChangeText={setSecondReviewer}
                  placeholder="e.g. owner_admin_uuid"
                  style={styles.modalInput}
                />
              </>
            )}

            <View style={styles.modalBtnRow}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalSubmitBtn, { backgroundColor: tokens.color.success }]} onPress={handleMarkPaid} disabled={processing}>
                {processing ? <ActivityIndicator color="white" /> : <Text style={styles.modalSubmitText}>Confirm Paid</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Reject Withdrawal */}
      <Modal visible={activeModal === 'reject_withdrawal'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: tokens.color.danger }]}>Reject Withdrawal Request</Text>

            <Text style={styles.inputLabel}>Rejection Reason</Text>
            <TextInput
              value={actionReason}
              onChangeText={setActionReason}
              placeholder="e.g. Account number invalid / Fraud suspicion"
              style={styles.modalInput}
            />

            <View style={styles.modalBtnRow}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalSubmitBtn, { backgroundColor: tokens.color.danger }]} onPress={handleRejectWithdrawal} disabled={processing}>
                {processing ? <ActivityIndicator color="white" /> : <Text style={styles.modalSubmitText}>Confirm Reject & Refund</Text>}
              </Pressable>
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

            <Text style={styles.inputLabel}>Target Player Profile ID (UUID)</Text>
            <TextInput
              value={targetProfileId}
              onChangeText={setTargetProfileId}
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              style={styles.modalInput}
            />

            <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Amount (Coins)</Text>
                <TextInput value={adjustAmount} onChangeText={setAdjustAmount} keyboardType="numeric" style={styles.modalInput} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Direction</Text>
                <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                  <Pressable
                    style={[styles.directionBtn, adjustDirection === 'credit' && styles.directionBtnActiveCredit]}
                    onPress={() => setAdjustDirection('credit')}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: adjustDirection === 'credit' ? 'white' : tokens.color.ink }}>Credit (+)</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.directionBtn, adjustDirection === 'debit' && styles.directionBtnActiveDebit]}
                    onPress={() => setAdjustDirection('debit')}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: adjustDirection === 'debit' ? 'white' : tokens.color.ink }}>Debit (-)</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <Text style={styles.inputLabel}>Audit Reason (min 5 chars)</Text>
            <TextInput
              value={adjustReason}
              onChangeText={setAdjustReason}
              placeholder="e.g. Compensation for tournament room crash"
              style={styles.modalInput}
            />

            <View style={styles.modalBtnRow}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSubmitBtn} onPress={handleWalletCorrection} disabled={processing}>
                {processing ? <ActivityIndicator color="white" /> : <Text style={styles.modalSubmitText}>Submit Correction</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
    gap: tokens.space.sm,
  },
  topBarTitleGroup: {
    gap: 4,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: tokens.color.ink,
  },
  screenSubtitle: {
    fontSize: 13,
    color: tokens.color.secondary,
  },
  adjustBtn: {
    backgroundColor: tokens.color.ink,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: tokens.radius.button,
  },
  adjustBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
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
    alignItems: 'center',
    borderRadius: tokens.radius.button,
  },
  mainTabActive: {
    backgroundColor: tokens.color.creamPanel,
  },
  mainTabText: {
    fontWeight: '700',
    fontSize: 14,
    color: tokens.color.secondary,
  },
  mainTabTextActive: {
    color: tokens.color.ink,
  },
  subFilterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  subFilterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.surface,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  subFilterTabActive: {
    backgroundColor: tokens.color.primary,
    borderColor: tokens.color.primary,
  },
  subFilterTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: tokens.color.secondary,
  },
  subFilterTabTextActive: {
    color: '#FFFFFF',
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
  emptyCard: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.space.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: tokens.color.ink,
  },
  emptySubtitle: {
    fontSize: 13,
    color: tokens.color.secondary,
    marginTop: 4,
  },
  listGrid: {
    gap: tokens.space.md,
  },
  queueCard: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.space.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: tokens.space.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.color.ink,
  },
  cardSubtitle: {
    fontSize: 12,
    color: tokens.color.secondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.color.ink,
  },
  riskBadge: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: tokens.color.coin,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.input,
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: tokens.color.ink,
  },
  cardActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.button,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: tokens.color.canvas,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.color.ink,
  },
  approveBtn: {
    backgroundColor: tokens.color.primary,
    borderRadius: tokens.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  approveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rejectBtn: {
    backgroundColor: tokens.color.danger,
    borderRadius: tokens.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space.md,
  },
  modalCard: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.space.lg,
    width: '100%',
    maxWidth: 500,
    gap: tokens.space.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.color.ink,
  },
  modalSubtitle: {
    fontSize: 13,
    color: tokens.color.secondary,
  },
  proofImage: {
    width: '100%',
    height: 300,
    borderRadius: tokens.radius.input,
    marginVertical: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: tokens.color.secondary,
    marginTop: 4,
  },
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
  directionBtnActiveCredit: {
    backgroundColor: tokens.color.success,
    borderColor: tokens.color.success,
  },
  directionBtnActiveDebit: {
    backgroundColor: tokens.color.danger,
    borderColor: tokens.color.danger,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: tokens.space.sm,
    marginTop: tokens.space.md,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: tokens.radius.button,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  modalCancelText: {
    color: tokens.color.secondary,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    backgroundColor: tokens.color.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: tokens.radius.button,
  },
  modalSubmitText: {
    color: 'white',
    fontWeight: '700',
  },
});
