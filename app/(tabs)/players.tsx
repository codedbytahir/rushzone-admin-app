import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { tokens } from '../../src/theme/tokens';
import { api } from '../../src/lib/api';
import { Card, ScreenHeader, StatusBadge, EmptyState, AppButton, Row, FieldLabel, Avatar, statusTone } from '../../src/components/ui';
import type { PlayerSearchResult, PlayerDetail } from '../../src/types/api';

export default function PlayersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [players, setPlayers] = useState<PlayerSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDetail | null>(null);
  const [loadingPlayer, setLoadingPlayer] = useState(false);
  const [activeModal, setActiveModal] = useState<'detail' | 'note' | 'restrict' | null>(null);

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
      <ScreenHeader
        title="Player Search & Moderation"
        subtitle="Search players by name, phone, or UID to inspect stats, add internal notes, and manage restrictions"
      />

      <Card style={{ gap: tokens.space.sm }}>
        <FieldLabel>Player query</FieldLabel>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={tokens.color.disabled} style={{ position: 'absolute', left: 12, zIndex: 1 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by display name, WhatsApp, App UID, FF UID…"
              placeholderTextColor={tokens.color.disabled}
              onSubmitEditing={handleSearch}
              style={styles.searchInput}
            />
          </View>
          <AppButton label="Search" icon="search-outline" loading={searching} onPress={handleSearch} />
        </View>
      </Card>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {searched && (
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>Search results ({players.length})</Text>
          {players.length === 0 ? (
            <Card>
              <EmptyState icon="person-outline" title="No players found" subtitle="Try searching with a different name, phone, or ID" />
            </Card>
          ) : (
            <View style={styles.playersGrid}>
              {players.map((p) => (
                <Card key={p.id} style={{ gap: tokens.space.sm }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Row style={{ flex: 1, gap: tokens.space.md }}>
                      <Avatar name={p.display_name} size={44} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.playerName}>{p.display_name ?? 'Unnamed Player'}</Text>
                        <Text style={styles.playerMeta}>ID: {p.id}</Text>
                        <Text style={styles.playerMeta}>Phone: {p.whatsapp_phone_masked ?? 'Hidden / masked'}</Text>
                      </View>
                    </Row>
                    <StatusBadge label={p.status ?? 'active'} tone={statusTone(p.status)} />
                  </Row>
                  <AppButton variant="outline" label="Inspect & Moderate" icon="search-outline" onPress={() => openPlayerDetail(p.id)} />
                </Card>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Modal: Player detail */}
      <Modal visible={activeModal === 'detail'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCardLarge}>
            {loadingPlayer ? (
              <ActivityIndicator color={tokens.color.primary} size="large" style={{ marginVertical: 32 }} />
            ) : selectedPlayer ? (
              <ScrollView style={{ maxHeight: 500 }}>
                <View style={styles.profileHeader}>
                  <Row style={{ gap: tokens.space.md }}>
                    <Avatar name={selectedPlayer.profile?.display_name} size={52} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.modalTitle}>{selectedPlayer.profile?.display_name ?? 'Player Detail'}</Text>
                      <Text style={styles.modalSubtitle}>ID: {selectedPlayer.profile?.id}</Text>
                      <Text style={styles.modalSubtitle}>Phone: {selectedPlayer.profile?.whatsapp_phone_masked ?? 'Masked'}</Text>
                    </View>
                  </Row>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Main wallet</Text>
                    <Text style={styles.statValue}>{selectedPlayer.wallet?.balances?.available_balance ?? 0}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Held wallet</Text>
                    <Text style={styles.statValue}>{selectedPlayer.wallet?.balances?.held_balance ?? 0}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Tournaments</Text>
                    <Text style={styles.statValue}>{selectedPlayer.stats?.tournaments_joined ?? 0}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Wins</Text>
                    <Text style={styles.statValue}>{selectedPlayer.stats?.wins ?? 0}</Text>
                  </View>
                </View>

                <View style={styles.moderationRow}>
                  <AppButton
                    label="Restrict / Ban"
                    variant="danger"
                    icon="ban-outline"
                    onPress={() => setActiveModal('restrict')}
                  />
                  {selectedPlayer.profile?.status !== 'active' && (
                    <AppButton
                      label="Lift Restriction"
                      icon="checkmark-circle-outline"
                      onPress={() => handleRestrictPlayer(true)}
                    />
                  )}
                  <AppButton
                    label="Add Internal Note"
                    variant="secondary"
                    icon="add-circle-outline"
                    onPress={() => setActiveModal('note')}
                  />
                </View>

                <Text style={styles.subSectionTitle}>Internal staff notes</Text>
                {(!selectedPlayer.notes || selectedPlayer.notes.length === 0) ? (
                  <Text style={styles.emptyFeedText}>No internal notes for this player yet.</Text>
                ) : (
                  selectedPlayer.notes.map((n: any, idx: number) => (
                    <View key={idx} style={styles.noteBox}>
                      <Text style={styles.noteBody}>{n.body}</Text>
                      <Text style={styles.noteMeta}>By: {n.author_id ?? 'Staff'} · {n.created_at?.substring(0, 10)}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            ) : null}

            <AppButton variant="ghost" label="Close" onPress={() => setActiveModal(null)} />
          </View>
        </View>
      </Modal>

      {/* Modal: Add note */}
      <Modal visible={activeModal === 'note'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Internal Staff Note</Text>
            <Text style={styles.modalSubtitle}>Visible only to Rush Zone admins.</Text>

            <TextInput
              value={noteText}
              onChangeText={setNoteText}
              placeholder="e.g. Verified WhatsApp identity manually on 2026-08-09."
              placeholderTextColor={tokens.color.disabled}
              multiline
              numberOfLines={4}
              style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
            />

            <View style={styles.modalBtnRow}>
              <AppButton variant="ghost" label="Back" onPress={() => setActiveModal('detail')} />
              <AppButton label="Save Note" icon="save-outline" loading={processing} onPress={handleAddNote} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Restrict */}
      <Modal visible={activeModal === 'restrict'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: tokens.color.danger }]}>Restrict / Ban Player</Text>

            <FieldLabel>Restriction type</FieldLabel>
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

            <FieldLabel>Reason (min 5 chars)</FieldLabel>
            <TextInput
              value={restrictReason}
              onChangeText={setRestrictReason}
              placeholder="e.g. Multiple account registration violation"
              placeholderTextColor={tokens.color.disabled}
              style={styles.modalInput}
            />

            <View style={styles.modalBtnRow}>
              <AppButton variant="ghost" label="Back" onPress={() => setActiveModal('detail')} />
              <AppButton label="Apply Restriction" variant="danger" icon="ban-outline" loading={processing} onPress={() => handleRestrictPlayer(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: tokens.space.sm },
  searchBox: { flex: 1, justifyContent: 'center' },
  searchInput: {
    backgroundColor: tokens.color.canvas,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.input,
    paddingLeft: 36,
    paddingRight: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: tokens.color.ink,
  },
  errorBox: { backgroundColor: tokens.color.dangerSoft, borderWidth: 1, borderColor: tokens.color.danger, borderRadius: tokens.radius.card, padding: tokens.space.md },
  errorText: { color: tokens.color.danger, fontWeight: '600' },
  resultsSection: { gap: tokens.space.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: tokens.color.ink },
  playersGrid: { gap: tokens.space.md },
  playerName: { fontSize: 15, fontWeight: '700', color: tokens.color.ink },
  playerMeta: { fontSize: 12, color: tokens.color.secondary },
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
  modalCardLarge: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.space.lg,
    width: '100%',
    maxWidth: 620,
    gap: tokens.space.md,
  },
  profileHeader: { gap: 2, marginBottom: tokens.space.sm },
  modalTitle: { fontSize: 19, fontWeight: '800', color: tokens.color.ink, letterSpacing: -0.3 },
  modalSubtitle: { fontSize: 13, color: tokens.color.secondary },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
    backgroundColor: tokens.color.canvas,
    padding: tokens.space.md,
    borderRadius: tokens.radius.input,
    marginBottom: tokens.space.md,
  },
  statBox: { flex: 1, minWidth: 110, gap: 2 },
  statLabel: { fontSize: 11, color: tokens.color.secondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: 14, fontWeight: '700', color: tokens.color.ink, fontVariant: ['tabular-nums'] },
  moderationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm, marginBottom: tokens.space.md },
  subSectionTitle: { fontSize: 14, fontWeight: '700', color: tokens.color.ink, marginBottom: 6 },
  emptyFeedText: { fontSize: 13, color: tokens.color.secondary, fontStyle: 'italic' },
  noteBox: {
    backgroundColor: tokens.color.canvas,
    borderRadius: tokens.radius.input,
    padding: 10,
    borderWidth: 1,
    borderColor: tokens.color.border,
    marginBottom: 6,
  },
  noteBody: { fontSize: 13, color: tokens.color.ink },
  noteMeta: { fontSize: 11, color: tokens.color.secondary, marginTop: 4 },
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
  typeBadgeActive: { backgroundColor: tokens.color.danger, borderColor: tokens.color.danger },
  typeBadgeText: { fontSize: 11, fontWeight: '700', color: tokens.color.secondary },
  typeBadgeTextActive: { color: tokens.color.onPrimary },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: tokens.space.sm, marginTop: tokens.space.md, flexWrap: 'wrap' },
});
