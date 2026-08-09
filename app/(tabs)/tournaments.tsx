import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Modal, ScrollView, ActivityIndicator, Platform, Switch } from 'react-native';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { tokens } from '../../src/theme/tokens';
import { api } from '../../src/lib/api';

export default function TournamentsScreen() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [activeModal, setActiveModal] = useState<'create' | 'edit' | 'room' | 'entrants' | 'results' | 'cancel' | 'presets' | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form States for Create/Edit Tournament
  const [formTitle, setFormTitle] = useState('');
  const [formMode, setFormMode] = useState<'solo' | 'duo' | 'squad'>('solo');
  const [formMap, setFormMap] = useState('Bermuda');
  const [formCapacity, setFormCapacity] = useState('48');
  const [formEntryFee, setFormEntryFee] = useState('100');
  const [formPrizePool, setFormPrizePool] = useState('1000');
  const [formDescription, setFormDescription] = useState('');
  const [formRulesText, setFormRulesText] = useState('');
  const [formPublish, setFormPublish] = useState(true);

  // Room Form States
  const [roomId, setRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [roomInstructions, setRoomInstructions] = useState('');

  // Entrants & Results
  const [entrants, setEntrants] = useState<any[]>([]);
  const [resultsDraft, setResultsDraft] = useState<any[]>([]);
  const [cancelReason, setCancelReason] = useState('');
  const [presets, setPresets] = useState<any[]>([]);

  const fetchTournaments = useCallback(async () => {
    setError(null);
    try {
      const res = await api.listTournaments({
        status: statusFilter === 'all' ? undefined : statusFilter,
        q: searchQuery.trim() ? searchQuery.trim() : undefined,
      });
      if (res.data) {
        setTournaments(Array.isArray(res.data) ? res.data : res.data?.tournaments ?? []);
      } else if (res.error) {
        setError(res.error.message ?? 'Failed to load tournaments');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  function openCreateModal() {
    setSelectedTournament(null);
    setFormTitle('');
    setFormMode('solo');
    setFormMap('Bermuda');
    setFormCapacity('48');
    setFormEntryFee('100');
    setFormPrizePool('1000');
    setFormDescription('Rush Zone Tournament');
    setFormRulesText('No teaming, fair play enforced.');
    setFormPublish(true);
    setActiveModal('create');
  }

  function openEditModal(t: any) {
    setSelectedTournament(t);
    setFormTitle(t.title ?? '');
    setFormMode((t.mode ?? 'solo').toLowerCase() as any);
    setFormMap(t.map ?? 'Bermuda');
    setFormCapacity(String(t.capacity ?? t.max_players ?? 48));
    setFormEntryFee(String(t.entry_fee ?? t.entry_fee_coins ?? 0));
    setFormPrizePool(String(t.prize_pool ?? t.prize_pool_coins ?? 0));
    setFormDescription(t.description ?? '');
    setFormRulesText(t.rules_text ?? '');
    setFormPublish(t.status !== 'draft');
    setActiveModal('edit');
  }

  async function handleSaveTournament() {
    if (!formTitle.trim()) {
      alert('Tournament title is required');
      return;
    }
    const capacityNum = parseInt(formCapacity, 10);
    if (isNaN(capacityNum) || capacityNum <= 0) {
      alert('Valid capacity (number of slots) is required');
      return;
    }

    setSaving(true);
    if (selectedTournament) {
      const updatePayload = {
        id: selectedTournament.id,
        title: formTitle.trim(),
        mode: formMode,
        map: formMap.trim(),
        capacity: capacityNum,
        entry_fee: parseInt(formEntryFee, 10) || 0,
        prize_pool: parseInt(formPrizePool, 10) || 0,
        description: formDescription.trim() || undefined,
        rules_text: formRulesText.trim() || undefined,
      };
      const res = await api.updateTournament(updatePayload);
      setSaving(false);
      if (res.error) {
        alert(`Error updating tournament: ${res.error.message}`);
      } else {
        alert('Tournament updated successfully!');
        setActiveModal(null);
        fetchTournaments();
      }
    } else {
      const createPayload = {
        title: formTitle.trim(),
        mode: formMode,
        map: formMap.trim(),
        capacity: capacityNum,
        entry_fee: parseInt(formEntryFee, 10) || 0,
        prize_pool: parseInt(formPrizePool, 10) || 0,
        description: formDescription.trim() || undefined,
        rules_text: formRulesText.trim() || undefined,
        publish: formPublish,
      };
      const res = await api.createTournament(createPayload);
      setSaving(false);
      if (res.error) {
        alert(`Error creating tournament: ${res.error.message}`);
      } else {
        alert('Tournament created successfully!');
        setActiveModal(null);
        fetchTournaments();
      }
    }
  }

  async function openRoomModal(t: any) {
    setSelectedTournament(t);
    setRoomId(t.room_id ?? '');
    setRoomPassword(t.room_password ?? '');
    setRoomInstructions(t.instructions ?? '');
    setActiveModal('room');
  }

  async function handleSaveRoom() {
    if (!selectedTournament) return;
    setSaving(true);
    const res = await api.setRoom({
      tournament_id: selectedTournament.id,
      room_id: roomId.trim(),
      room_password: roomPassword.trim(),
      instructions: roomInstructions.trim(),
    });
    setSaving(false);
    if (res.error) {
      alert(`Error setting room: ${res.error.message}`);
    } else {
      alert('Room credentials saved successfully!');
      setActiveModal(null);
      fetchTournaments();
    }
  }

  async function handleReleaseRoom() {
    if (!selectedTournament) return;
    setSaving(true);
    const res = await api.releaseRoom(selectedTournament.id);
    setSaving(false);
    if (res.error) {
      alert(`Error releasing room: ${res.error.message}`);
    } else {
      alert('Room credentials released to confirmed entrants!');
      setActiveModal(null);
      fetchTournaments();
    }
  }

  async function openEntrantsModal(t: any) {
    setSelectedTournament(t);
    setActiveModal('entrants');
    setLoading(true);
    const res = await api.getEntrants(t.id);
    setLoading(false);
    if (res.data) {
      setEntrants(Array.isArray(res.data) ? res.data : res.data?.entrants ?? []);
    } else {
      setEntrants([]);
    }
  }

  async function openResultsModal(t: any) {
    setSelectedTournament(t);
    setActiveModal('results');
    setLoading(true);
    const res = await api.getResults(t.id);
    setLoading(false);
    if (res.data) {
      setResultsDraft(Array.isArray(res.data) ? res.data : res.data?.results ?? []);
    } else {
      setResultsDraft([]);
    }
  }

  async function handlePublishResults() {
    if (!selectedTournament) return;
    setSaving(true);
    const res = await api.publishResults(selectedTournament.id);
    setSaving(false);
    if (res.error) {
      alert(`Error publishing results: ${res.error.message}`);
    } else {
      alert('Tournament results published and prizes distributed!');
      setActiveModal(null);
      fetchTournaments();
    }
  }

  async function handleCancelTournament() {
    if (!selectedTournament || !cancelReason.trim()) {
      alert('Cancellation reason is required');
      return;
    }
    setSaving(true);
    const res = await api.cancelTournament(selectedTournament.id, cancelReason.trim(), 'refund_all');
    setSaving(false);
    if (res.error) {
      alert(`Error cancelling tournament: ${res.error.message}`);
    } else {
      alert('Tournament cancelled and fees refunded.');
      setActiveModal(null);
      fetchTournaments();
    }
  }

  async function openPresetsModal() {
    setActiveModal('presets');
    const res = await api.listPresets();
    if (res.data) {
      setPresets(Array.isArray(res.data) ? res.data : res.data?.presets ?? []);
    }
  }

  const filteredList = tournaments.filter((t) => {
    const matchesSearch = searchQuery.trim() === '' ||
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        fetchTournaments();
      }}
    >
      {/* Top Action Header */}
      <View style={styles.topBar}>
        <View style={styles.topBarTitleGroup}>
          <Text style={styles.screenTitle}>Tournament Operations</Text>
          <Text style={styles.screenSubtitle}>Create competitions, manage room details, entrants, and publish match prizes</Text>
        </View>
        <View style={styles.btnRow}>
          <Pressable style={styles.presetBtn} onPress={openPresetsModal}>
            <Text style={styles.presetBtnText}>⚡ Presets</Text>
          </Pressable>
          <Pressable style={styles.createBtn} onPress={openCreateModal}>
            <Text style={styles.createBtnText}>+ Create Tournament</Text>
          </Pressable>
        </View>
      </View>

      {/* Filter and Search Bar */}
      <View style={styles.filterCard}>
        <View style={styles.searchBox}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search tournament by title or ID..."
            placeholderTextColor={tokens.color.disabled}
            style={styles.searchInput}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabs}>
          {['all', 'draft', 'scheduled', 'registration_open', 'live', 'completed', 'cancelled'].map((st) => (
            <Pressable
              key={st}
              onPress={() => setStatusFilter(st)}
              style={[
                styles.filterTab,
                statusFilter === st && styles.filterTabActive,
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  statusFilter === st && styles.filterTabTextActive,
                ]}
              >
                {st.replace('_', ' ').toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Tournament Cards List */}
      {loading ? (
        <ActivityIndicator color={tokens.color.primary} size="large" style={{ marginTop: 24 }} />
      ) : filteredList.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No Tournaments Found</Text>
          <Text style={styles.emptySubtitle}>Click "+ Create Tournament" above to launch a new tournament</Text>
        </View>
      ) : (
        <View style={styles.tournamentsGrid}>
          {filteredList.map((t) => (
            <View key={t.id} style={styles.tournamentCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{t.title}</Text>
                  <Text style={styles.cardId}>ID: {t.id}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        t.status === 'live'
                          ? '#E8F5E9'
                          : t.status === 'registration_open' || t.status === 'scheduled'
                          ? tokens.color.creamPanel
                          : t.status === 'completed'
                          ? '#E0F2FE'
                          : t.status === 'cancelled'
                          ? '#FFEBEE'
                          : tokens.color.canvas,
                    },
                  ]}
                >
                  <Text style={styles.statusBadgeText}>{(t.status ?? 'draft').toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Entry Fee</Text>
                  <Text style={styles.statValue}>🪙 {t.entry_fee ?? t.entry_fee_coins ?? 0}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Prize Pool</Text>
                  <Text style={styles.statValue}>🪙 {t.prize_pool ?? t.prize_pool_coins ?? 0}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Capacity</Text>
                  <Text style={styles.statValue}>{t.capacity ?? t.max_players ?? 48} Slots</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Mode / Map</Text>
                  <Text style={styles.statValue}>{(t.mode ?? 'solo').toUpperCase()} / {t.map ?? 'Bermuda'}</Text>
                </View>
              </View>

              {/* Action Buttons Toolbar */}
              <View style={styles.cardActionsRow}>
                <Pressable style={styles.cardActionBtn} onPress={() => openEditModal(t)}>
                  <Text style={styles.cardActionText}>✏️ Edit</Text>
                </Pressable>

                <Pressable style={styles.cardActionBtn} onPress={() => openRoomModal(t)}>
                  <Text style={styles.cardActionText}>🔑 Room Details</Text>
                </Pressable>

                <Pressable style={styles.cardActionBtn} onPress={() => openEntrantsModal(t)}>
                  <Text style={styles.cardActionText}>👥 Entrants</Text>
                </Pressable>

                <Pressable style={styles.cardActionBtn} onPress={() => openResultsModal(t)}>
                  <Text style={styles.cardActionText}>🏆 Results</Text>
                </Pressable>

                {t.status !== 'cancelled' && t.status !== 'completed' && (
                  <Pressable
                    style={[styles.cardActionBtn, { borderColor: tokens.color.danger }]}
                    onPress={() => {
                      setSelectedTournament(t);
                      setActiveModal('cancel');
                    }}
                  >
                    <Text style={[styles.cardActionText, { color: tokens.color.danger }]}>Cancel</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Modal: Create / Edit Tournament */}
      <Modal visible={activeModal === 'create' || activeModal === 'edit'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {activeModal === 'create' ? 'Create New Tournament' : 'Edit Tournament'}
              </Text>
              <Text style={styles.modalSubtitle}>Configure mode, capacity, entry fee, and prize settings</Text>

              <Text style={styles.inputLabel}>Tournament Title *</Text>
              <TextInput
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="e.g. Free Fire Solo Blitz #10"
                style={styles.modalInput}
              />

              <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Game Mode *</Text>
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                    {(['solo', 'duo', 'squad'] as const).map((m) => (
                      <Pressable
                        key={m}
                        onPress={() => setFormMode(m)}
                        style={[styles.modeBadge, formMode === m && styles.modeBadgeActive]}
                      >
                        <Text style={[styles.modeBadgeText, formMode === m && styles.modeBadgeTextActive]}>
                          {m.toUpperCase()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Map</Text>
                  <TextInput value={formMap} onChangeText={setFormMap} placeholder="e.g. Bermuda" style={styles.modalInput} />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Capacity (Slots) *</Text>
                  <TextInput value={formCapacity} onChangeText={setFormCapacity} keyboardType="numeric" style={styles.modalInput} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Entry Fee (Coins)</Text>
                  <TextInput value={formEntryFee} onChangeText={setFormEntryFee} keyboardType="numeric" style={styles.modalInput} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Prize Pool (Coins)</Text>
                  <TextInput value={formPrizePool} onChangeText={setFormPrizePool} keyboardType="numeric" style={styles.modalInput} />
                </View>
              </View>

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput value={formDescription} onChangeText={setFormDescription} placeholder="e.g. Daily Competitive Battle" style={styles.modalInput} />

              <Text style={styles.inputLabel}>Rules & Guidelines</Text>
              <TextInput value={formRulesText} onChangeText={setFormRulesText} placeholder="e.g. Fair play enforced. Join 10 minutes early." multiline style={[styles.modalInput, { height: 70 }]} />

              {activeModal === 'create' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={styles.inputLabel}>Publish Immediately (Status: Scheduled)</Text>
                  <Switch value={formPublish} onValueChange={setFormPublish} trackColor={{ false: tokens.color.disabled, true: tokens.color.primary }} />
                </View>
              )}

              <View style={styles.modalBtnRow}>
                <Pressable style={styles.modalCancelBtn} onPress={() => setActiveModal(null)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalSubmitBtn} onPress={handleSaveTournament} disabled={saving}>
                  {saving ? <ActivityIndicator color="white" /> : <Text style={styles.modalSubmitText}>Save Tournament</Text>}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Room Credentials */}
      <Modal visible={activeModal === 'room'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Room ID & Password</Text>
            <Text style={styles.modalSubtitle}>Set credentials for: {selectedTournament?.title}</Text>

            <Text style={styles.inputLabel}>Room ID</Text>
            <TextInput value={roomId} onChangeText={setRoomId} placeholder="e.g. 8493021" style={styles.modalInput} />

            <Text style={styles.inputLabel}>Room Password</Text>
            <TextInput value={roomPassword} onChangeText={setRoomPassword} placeholder="e.g. 7789" style={styles.modalInput} />

            <Text style={styles.inputLabel}>Instructions / Notes</Text>
            <TextInput value={roomInstructions} onChangeText={setRoomInstructions} placeholder="e.g. Map: Bermuda. Join 10 mins early." style={styles.modalInput} />

            <View style={styles.modalBtnRow}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.modalCancelText}>Close</Text>
              </Pressable>
              <Pressable style={styles.modalSubmitBtn} onPress={handleSaveRoom} disabled={saving}>
                <Text style={styles.modalSubmitText}>Save Credentials</Text>
              </Pressable>
              <Pressable style={[styles.modalSubmitBtn, { backgroundColor: tokens.color.success }]} onPress={handleReleaseRoom} disabled={saving}>
                <Text style={styles.modalSubmitText}>Release Room</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Entrants */}
      <Modal visible={activeModal === 'entrants'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tournament Entrants</Text>
            <Text style={styles.modalSubtitle}>Registered players for: {selectedTournament?.title}</Text>
            <ScrollView style={{ maxHeight: 300, marginVertical: 12 }}>
              {entrants.length === 0 ? (
                <Text style={{ textAlign: 'center', color: tokens.color.secondary }}>No entrants registered yet</Text>
              ) : (
                entrants.map((e, idx) => (
                  <View key={e.id ?? idx} style={styles.entrantItem}>
                    <Text style={styles.entrantName}>{e.display_name ?? e.profile_id ?? `Entrant #${idx + 1}`}</Text>
                    <Text style={styles.entrantStatus}>{e.status ?? 'confirmed'}</Text>
                  </View>
                ))
              )}
            </ScrollView>
            <Pressable style={styles.modalCancelBtn} onPress={() => setActiveModal(null)}>
              <Text style={styles.modalCancelText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal: Results */}
      <Modal visible={activeModal === 'results'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Match Results & Prize Distribution</Text>
            <Text style={styles.modalSubtitle}>Publish results for: {selectedTournament?.title}</Text>
            <ScrollView style={{ maxHeight: 300, marginVertical: 12 }}>
              {resultsDraft.length === 0 ? (
                <Text style={{ textAlign: 'center', color: tokens.color.secondary }}>No results draft available. Publish will evaluate standings automatically.</Text>
              ) : (
                resultsDraft.map((r, idx) => (
                  <View key={idx} style={styles.entrantItem}>
                    <Text style={styles.entrantName}>Rank #{r.placement ?? idx + 1} — {r.display_name ?? r.profile_id}</Text>
                    <Text style={styles.entrantStatus}>Kills: {r.kills ?? 0} | Prize: 🪙 {r.prize_coins ?? 0}</Text>
                  </View>
                ))
              )}
            </ScrollView>
            <View style={styles.modalBtnRow}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalSubmitBtn, { backgroundColor: tokens.color.primary }]} onPress={handlePublishResults} disabled={saving}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={styles.modalSubmitText}>Publish & Distribute</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Cancel */}
      <Modal visible={activeModal === 'cancel'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: tokens.color.danger }]}>Cancel Tournament</Text>
            <Text style={styles.modalSubtitle}>Reason will be logged and players will be refunded.</Text>

            <Text style={styles.inputLabel}>Cancellation Reason</Text>
            <TextInput value={cancelReason} onChangeText={setCancelReason} placeholder="e.g. Server maintenance / Low registration" style={styles.modalInput} />

            <View style={styles.modalBtnRow}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.modalCancelText}>Back</Text>
              </Pressable>
              <Pressable style={[styles.modalSubmitBtn, { backgroundColor: tokens.color.danger }]} onPress={handleCancelTournament} disabled={saving}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={styles.modalSubmitText}>Confirm Refund & Cancel</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Presets */}
      <Modal visible={activeModal === 'presets'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tournament Presets</Text>
            <ScrollView style={{ maxHeight: 300, marginVertical: 12 }}>
              {presets.length === 0 ? (
                <Text style={{ textAlign: 'center', color: tokens.color.secondary }}>No saved presets found</Text>
              ) : (
                presets.map((p, idx) => (
                  <View key={idx} style={styles.entrantItem}>
                    <Text style={styles.entrantName}>{p.name ?? `Preset #${idx + 1}`}</Text>
                    <Pressable
                      style={styles.smallBtn}
                      onPress={async () => {
                        await api.applyPreset(p.id);
                        alert('Preset applied!');
                        setActiveModal(null);
                        fetchTournaments();
                      }}
                    >
                      <Text style={styles.smallBtnText}>Apply</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>
            <Pressable style={styles.modalCancelBtn} onPress={() => setActiveModal(null)}>
              <Text style={styles.modalCancelText}>Close</Text>
            </Pressable>
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
  btnRow: {
    flexDirection: 'row',
    gap: tokens.space.sm,
  },
  presetBtn: {
    backgroundColor: tokens.color.creamPanel,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: tokens.radius.button,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  presetBtnText: {
    color: tokens.color.ink,
    fontWeight: '700',
    fontSize: 13,
  },
  createBtn: {
    backgroundColor: tokens.color.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: tokens.radius.button,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  filterCard: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.space.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: tokens.space.sm,
  },
  searchBox: {
    width: '100%',
  },
  searchInput: {
    backgroundColor: tokens.color.canvas,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: tokens.color.ink,
    fontSize: 14,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.canvas,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  filterTabActive: {
    backgroundColor: tokens.color.ink,
    borderColor: tokens.color.ink,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: tokens.color.secondary,
  },
  filterTabTextActive: {
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
  tournamentsGrid: {
    gap: tokens.space.md,
  },
  tournamentCard: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.space.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: tokens.space.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: tokens.color.ink,
  },
  cardId: {
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
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
    backgroundColor: tokens.color.canvas,
    padding: tokens.space.sm,
    borderRadius: tokens.radius.input,
  },
  statBox: {
    flex: 1,
    minWidth: 80,
  },
  statLabel: {
    fontSize: 11,
    color: tokens.color.secondary,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.color.ink,
  },
  cardActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardActionBtn: {
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.button,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: tokens.color.surface,
  },
  cardActionText: {
    fontSize: 12,
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
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalCard: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.space.lg,
    width: '100%',
    maxWidth: 550,
    gap: tokens.space.xs,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.color.ink,
  },
  modalSubtitle: {
    fontSize: 13,
    color: tokens.color.secondary,
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: tokens.color.secondary,
    marginTop: 6,
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
  modeBadge: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: tokens.radius.input,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.canvas,
  },
  modeBadgeActive: {
    backgroundColor: tokens.color.primary,
    borderColor: tokens.color.primary,
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.color.secondary,
  },
  modeBadgeTextActive: {
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
  entrantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.border,
  },
  entrantName: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.color.ink,
  },
  entrantStatus: {
    fontSize: 12,
    color: tokens.color.secondary,
  },
  smallBtn: {
    backgroundColor: tokens.color.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.button,
  },
  smallBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
});
