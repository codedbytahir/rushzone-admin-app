import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Modal, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { tokens } from '../../src/theme/tokens';
import { api } from '../../src/lib/api';

export default function PlayersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Player Detail & Moderation State
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [loadingPlayer, setLoadingPlayer] = useState(false);
  const [activeModal, setActiveModal] = useState<'detail' | 'note' | 'restrict' | null>(null);

  // Forms
  const [noteText, setNoteText] = useState('');
  const [restrictType, setRestrictType] = useState<'entry' | 'rewards' | 'wallet' | 'suspend' | 'ban'>('suspend');
  const [restrictReason, setRestrictReason] = useState('');
  const [processing, setProcessing] = useState(false);

  async function handleSearch() {
    if (searchQuery.trim().length < 2) {
      alert('Enter at least 2 characters to search');
      return;
    }
    setSearching(true);
    setError(null);
    setSearched(true);
    try {
      const res = await api.searchPlayers(searchQuery.trim());
      if (res.data) {
        setPlayers(Array.isArray(res.data) ? res.data : res.data?.profiles ?? []);
      } else if (res.error) {
        setError(res.error.message);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Search failed');
    } finally {
      setSearching(false);
    }
  }

  async function openPlayerDetail(profileId: string) {
    setActiveModal('detail');
    setLoadingPlayer(true);
    try {
      const res = await api.getPlayer(profileId);
      if (res.data) {
        setSelectedPlayer(res.data);
      } else {
        alert(res.error?.message ?? 'Failed to load profile');
        setActiveModal(null);
      }
    } catch (err: any) {
      alert(err.message ?? 'Error fetching profile');
      setActiveModal(null);
    } finally {
      setLoadingPlayer(false);
    }
  }

  async function handleAddNote() {
    if (!selectedPlayer?.profile?.id || !noteText.trim()) {
      alert('Note content is required');
      return;
    }
    setProcessing(true);
    const res = await api.addPlayerNote(selectedPlayer.profile.id, noteText.trim());
    setProcessing(false);
    if (res.error) {
      alert(`Error adding note: ${res.error.message}`);
    } else {
      alert('Internal note added successfully!');
      setNoteText('');
      setActiveModal('detail');
      openPlayerDetail(selectedPlayer.profile.id);
    }
  }

  async function handleRestrictPlayer(lift = false) {
    if (!selectedPlayer?.profile?.id) return;
    if (!lift && restrictReason.trim().length < 5) {
      alert('Reason must be at least 5 characters');
      return;
    }
    setProcessing(true);
    const res = await api.restrictPlayer({
      profile_id: selectedPlayer.profile.id,
      type: restrictType,
      reason: restrictReason.trim(),
      lift,
    });
    setProcessing(false);
    if (res.error) {
      alert(`Restriction error: ${res.error.message}`);
    } else {
      alert(lift ? 'Restriction lifted!' : 'Player restriction applied successfully!');
      setActiveModal('detail');
      openPlayerDetail(selectedPlayer.profile.id);
    }
  }

  return (
    <ScreenContainer scrollable>
      {/* Search Header */}
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>Player Search & Moderation</Text>
        <Text style={styles.screenSubtitle}>Search players by name, phone, or UID to inspect stats, add internal notes, and manage bans/restrictions</Text>
      </View>

      <View style={styles.searchCard}>
        <Text style={styles.cardLabel}>Player Query</Text>
        <View style={styles.searchRow}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by display name, WhatsApp, App UID, FF UID..."
            placeholderTextColor={tokens.color.disabled}
            onSubmitEditing={handleSearch}
            style={styles.searchInput}
          />
          <Pressable style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
            {searching ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.searchBtnText}>Search</Text>
            )}
          </Pressable>
        </View>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Results List */}
      {searched && (
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>
            Search Results ({players.length})
          </Text>

          {players.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Players Found</Text>
              <Text style={styles.emptySubtitle}>Try searching with a different name, phone, or ID</Text>
            </View>
          ) : (
            <View style={styles.playersGrid}>
              {players.map((p) => (
                <View key={p.id} style={styles.playerCard}>
                  <View style={styles.cardMain}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{(p.display_name ?? 'P')[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.playerName}>{p.display_name ?? 'Unnamed Player'}</Text>
                      <Text style={styles.playerId}>ID: {p.id}</Text>
                      <Text style={styles.playerPhone}>Phone: {p.whatsapp_phone_masked ?? 'Hidden / Masked'}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            p.status === 'banned' || p.status === 'suspended'
                              ? '#FFEBEE'
                              : p.status === 'restricted'
                              ? tokens.color.creamPanel
                              : '#E8F5E9',
                        },
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>{(p.status ?? 'active').toUpperCase()}</Text>
                    </View>
                  </View>

                  <Pressable style={styles.inspectBtn} onPress={() => openPlayerDetail(p.id)}>
                    <Text style={styles.inspectBtnText}>Inspect & Moderate →</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Modal: Player Detail & Moderation */}
      <Modal visible={activeModal === 'detail'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCardLarge}>
            {loadingPlayer ? (
              <ActivityIndicator color={tokens.color.primary} size="large" style={{ marginVertical: 32 }} />
            ) : selectedPlayer ? (
              <ScrollView style={{ maxHeight: 500 }}>
                {/* Header Info */}
                <View style={styles.profileHeader}>
                  <Text style={styles.modalTitle}>{selectedPlayer.profile?.display_name ?? 'Player Detail'}</Text>
                  <Text style={styles.modalSubtitle}>ID: {selectedPlayer.profile?.id}</Text>
                  <Text style={styles.modalSubtitle}>Phone: {selectedPlayer.whatsapp_phone_masked ?? 'Masked'}</Text>
                </View>

                {/* Stats & Wallet */}
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Main Wallet</Text>
                    <Text style={styles.statValue}>🪙 {selectedPlayer.wallet?.balance ?? 0}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Held Wallet</Text>
                    <Text style={styles.statValue}>🪙 {selectedPlayer.wallet?.held_balance ?? 0}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total Matches</Text>
                    <Text style={styles.statValue}>{selectedPlayer.profile_stats?.total_matches ?? 0}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Wins</Text>
                    <Text style={styles.statValue}>{selectedPlayer.profile_stats?.total_wins ?? 0}</Text>
                  </View>
                </View>

                {/* Moderation Controls */}
                <View style={styles.moderationRow}>
                  <Pressable
                    style={[styles.modBtn, { backgroundColor: tokens.color.danger }]}
                    onPress={() => setActiveModal('restrict')}
                  >
                    <Text style={styles.modBtnText}>Restrict / Ban Player</Text>
                  </Pressable>

                  {selectedPlayer.profile?.status !== 'active' && (
                    <Pressable
                      style={[styles.modBtn, { backgroundColor: tokens.color.success }]}
                      onPress={() => handleRestrictPlayer(true)}
                    >
                      <Text style={styles.modBtnText}>Lift Restriction (Unban)</Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={[styles.modBtn, { backgroundColor: tokens.color.ink }]}
                    onPress={() => setActiveModal('note')}
                  >
                    <Text style={styles.modBtnText}>+ Add Internal Note</Text>
                  </Pressable>
                </View>

                {/* Internal Notes Feed */}
                <Text style={styles.subSectionTitle}>Internal Staff Notes</Text>
                {(!selectedPlayer.internal_notes || selectedPlayer.internal_notes.length === 0) ? (
                  <Text style={styles.emptyFeedText}>No internal notes for this player yet.</Text>
                ) : (
                  selectedPlayer.internal_notes.map((n: any, idx: number) => (
                    <View key={idx} style={styles.noteBox}>
                      <Text style={styles.noteBody}>{n.body}</Text>
                      <Text style={styles.noteMeta}>By: {n.author_id ?? 'Staff'} · {n.created_at?.substring(0, 10)}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            ) : null}

            <Pressable style={styles.modalCancelBtn} onPress={() => setActiveModal(null)}>
              <Text style={styles.modalCancelText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal: Add Note */}
      <Modal visible={activeModal === 'note'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Internal Staff Note</Text>
            <Text style={styles.modalSubtitle}>This note is visible ONLY to Rush Zone admins.</Text>

            <TextInput
              value={noteText}
              onChangeText={setNoteText}
              placeholder="e.g. Verified WhatsApp identity manually on 2026-08-09."
              multiline
              numberOfLines={4}
              style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
            />

            <View style={styles.modalBtnRow}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setActiveModal('detail')}>
                <Text style={styles.modalCancelText}>Back</Text>
              </Pressable>
              <Pressable style={styles.modalSubmitBtn} onPress={handleAddNote} disabled={processing}>
                {processing ? <ActivityIndicator color="white" /> : <Text style={styles.modalSubmitText}>Save Note</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Restrict / Ban */}
      <Modal visible={activeModal === 'restrict'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: tokens.color.danger }]}>Restrict / Ban Player</Text>

            <Text style={styles.inputLabel}>Restriction Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 }}>
              {(['suspend', 'ban', 'entry', 'rewards', 'wallet'] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setRestrictType(t)}
                  style={[styles.typeBadge, restrictType === t && styles.typeBadgeActive]}
                >
                  <Text style={[styles.typeBadgeText, restrictType === t && styles.typeBadgeTextActive]}>
                    {t.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.inputLabel}>Reason (required min 5 chars)</Text>
            <TextInput
              value={restrictReason}
              onChangeText={setRestrictReason}
              placeholder="e.g. Multiple account registration violation"
              style={styles.modalInput}
            />

            <View style={styles.modalBtnRow}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setActiveModal('detail')}>
                <Text style={styles.modalCancelText}>Back</Text>
              </Pressable>
              <Pressable style={[styles.modalSubmitBtn, { backgroundColor: tokens.color.danger }]} onPress={() => handleRestrictPlayer(false)} disabled={processing}>
                {processing ? <ActivityIndicator color="white" /> : <Text style={styles.modalSubmitText}>Apply Restriction</Text>}
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
  searchCard: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.space.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: tokens.space.xs,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.color.ink,
  },
  searchRow: {
    flexDirection: 'row',
    gap: tokens.space.sm,
    marginTop: 4,
  },
  searchInput: {
    flex: 1,
    backgroundColor: tokens.color.canvas,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: tokens.color.ink,
  },
  searchBtn: {
    backgroundColor: tokens.color.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: tokens.radius.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
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
  resultsSection: {
    gap: tokens.space.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: tokens.color.ink,
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
  playersGrid: {
    gap: tokens.space.sm,
  },
  playerCard: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.space.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: tokens.space.sm,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tokens.color.creamPanel,
    borderWidth: 1,
    borderColor: tokens.color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.color.ink,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '700',
    color: tokens.color.ink,
  },
  playerId: {
    fontSize: 12,
    color: tokens.color.secondary,
  },
  playerPhone: {
    fontSize: 12,
    color: tokens.color.secondary,
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
  inspectBtn: {
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.button,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: tokens.color.canvas,
  },
  inspectBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.color.ink,
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
  modalCardLarge: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.space.lg,
    width: '100%',
    maxWidth: 600,
    gap: tokens.space.md,
  },
  profileHeader: {
    gap: 2,
    marginBottom: tokens.space.sm,
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
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.xs,
    backgroundColor: tokens.color.canvas,
    padding: tokens.space.sm,
    borderRadius: tokens.radius.input,
    marginBottom: tokens.space.sm,
  },
  statBox: {
    flex: 1,
    minWidth: 110,
  },
  statLabel: {
    fontSize: 11,
    color: tokens.color.secondary,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: tokens.color.ink,
  },
  moderationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.xs,
    marginBottom: tokens.space.md,
  },
  modBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: tokens.radius.button,
  },
  modBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: tokens.color.ink,
    marginBottom: 6,
  },
  emptyFeedText: {
    fontSize: 13,
    color: tokens.color.secondary,
    fontStyle: 'italic',
  },
  noteBox: {
    backgroundColor: tokens.color.canvas,
    borderRadius: tokens.radius.input,
    padding: 10,
    borderWidth: 1,
    borderColor: tokens.color.border,
    marginBottom: 6,
  },
  noteBody: {
    fontSize: 13,
    color: tokens.color.ink,
  },
  noteMeta: {
    fontSize: 11,
    color: tokens.color.secondary,
    marginTop: 4,
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
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.canvas,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  typeBadgeActive: {
    backgroundColor: tokens.color.danger,
    borderColor: tokens.color.danger,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.color.secondary,
  },
  typeBadgeTextActive: {
    color: 'white',
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
