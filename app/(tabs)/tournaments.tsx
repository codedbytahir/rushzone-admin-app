import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Modal, ScrollView, ActivityIndicator, Switch, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { tokens } from '../../src/theme/tokens';
import { api } from '../../src/lib/api';
import { supabase } from '../../src/lib/supabase';
import { useAdminSession } from '../../src/hooks/useAdminSession';
import { ConfirmDialog } from '../../src/components/ConfirmDialog';
import { Card, ScreenHeader, StatusBadge, EmptyState, AppButton, Coin, Row, FieldLabel, statusTone } from '../../src/components/ui';
import type { Tournament, Entrant, ResultRow, Roster } from '../../src/types/api';

export default function TournamentsScreen() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [activeModal, setActiveModal] = useState<'create' | 'edit' | 'room' | 'entrants' | 'results' | 'cancel' | 'presets' | null>(null);
  const { permissions, isOwner } = useAdminSession();
  const can = (k: string) => isOwner || permissions.includes('*') || permissions.includes(k);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formMode, setFormMode] = useState<'solo' | 'duo' | 'squad'>('solo');
  const [formMap, setFormMap] = useState('Bermuda');
  const [formCapacity, setFormCapacity] = useState('48');
  const [formEntryFee, setFormEntryFee] = useState('100');
  const [formPrizePool, setFormPrizePool] = useState('1000');
  const [formDescription, setFormDescription] = useState('');
  const [formRulesText, setFormRulesText] = useState('');
  const [formPublish, setFormPublish] = useState(true);
  const [formRegOpen, setFormRegOpen] = useState('');
  const [formRegClose, setFormRegClose] = useState('');
  const [formMatchStart, setFormMatchStart] = useState('');
  const [formRoomRelease, setFormRoomRelease] = useState('');
  const [formFreeSlot, setFormFreeSlot] = useState(false);
  const [formFreeSlotTrigger, setFormFreeSlotTrigger] = useState<'slots_full' | 'match_start'>('slots_full');
  const [formSavePreset, setFormSavePreset] = useState(false);
  const [formCoverPath, setFormCoverPath] = useState('');
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [confirmPublishResults, setConfirmPublishResults] = useState(false);

  const [roomId, setRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [roomInstructions, setRoomInstructions] = useState('');

  const [entrants, setEntrants] = useState<Entrant[]>([]);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [resultsDraft, setResultsDraft] = useState<ResultRow[]>([]);
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
    setFormRegOpen('');
    setFormRegClose('');
    setFormMatchStart('');
    setFormRoomRelease('');
    setFormFreeSlot(false);
    setFormFreeSlotTrigger('slots_full');
    setFormSavePreset(false);
    setFormCoverPath('');
    setCoverPreviewUrl(null);
    setActiveModal('create');
  }

  function openEditModal(t: any) {
    setSelectedTournament(t);
    setFormTitle(t.title ?? '');
    setFormMode((t.mode ?? 'solo').toLowerCase() as any);
    setFormMap(t.map ?? 'Bermuda');
    setFormCapacity(String(t.capacity ?? 48));
    setFormEntryFee(String(t.entry_fee ?? 0));
    setFormPrizePool(String(t.prize_pool ?? 0));
    setFormDescription(t.description ?? '');
    setFormRulesText(t.rules_text ?? '');
    setFormPublish(t.status !== 'draft');
    setFormRegOpen(t.reg_open_at?.substring(0, 16) ?? '');
    setFormRegClose(t.reg_close_at?.substring(0, 16) ?? '');
    setFormMatchStart(t.match_start_at?.substring(0, 16) ?? '');
    setFormRoomRelease(t.room_release_at?.substring(0, 16) ?? '');
    setFormCoverPath(t.cover_path ?? '');
    setCoverPreviewUrl(t.cover_path ? supabase.storage.from('tournament-thumbnails').getPublicUrl(t.cover_path).data.publicUrl : null);
    setFormFreeSlot(t.free_slot_enabled ?? false);
    setFormFreeSlotTrigger(t.free_slot_trigger ?? 'slots_full');
    setFormSavePreset(false);
    setActiveModal('edit');
  }

  function pktToIso(value: string): string | undefined {
    const v = value.trim();
    if (!v) return undefined;
    const hasTz = /(Z|[+-]\d{2}:\d{2})$/.test(v);
    const parsed = new Date(hasTz ? v : v.replace(' ', 'T') + '+05:00');
    if (isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString();
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
        reg_open_at: pktToIso(formRegOpen),
        reg_close_at: pktToIso(formRegClose),
        match_start_at: pktToIso(formMatchStart),
        room_release_at: pktToIso(formRoomRelease),
        free_slot_enabled: formFreeSlot,
        free_slot_trigger: formFreeSlotTrigger,
        cover_path: formCoverPath.trim() || undefined,
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
        reg_open_at: pktToIso(formRegOpen),
        reg_close_at: pktToIso(formRegClose),
        match_start_at: pktToIso(formMatchStart),
        room_release_at: pktToIso(formRoomRelease),
        free_slot_enabled: formFreeSlot,
        free_slot_trigger: formFreeSlotTrigger,
        is_preset: formSavePreset,
        preset_key: formSavePreset ? `preset-${Date.now()}` : undefined,
        cover_path: formCoverPath.trim() || undefined,
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
      const rows = Array.isArray(res.data) ? res.data : res.data?.entrants ?? [];
      setEntrants(rows);
      setRosters(res.data?.rosters ?? []);
    } else {
      setEntrants([]);
      setRosters([]);
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

  function updateResultRow(idx: number, patch: Partial<ResultRow>) {
    setResultsDraft((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function handleSaveResultsDraft() {
    if (!selectedTournament) return;
    setSaving(true);
    const res = await api.saveResultsDraft(selectedTournament.id, resultsDraft);
    setSaving(false);
    if (res.error) {
      alert(`Error saving results draft: ${res.error.message}`);
    } else {
      alert('Results draft saved.');
    }
  }

  async function handlePreviewResults() {
    if (!selectedTournament) return;
    setSaving(true);
    const res = await api.previewResults(selectedTournament.id);
    setSaving(false);
    if (res.error) {
      alert(`Error previewing results: ${res.error.message}`);
    } else {
      const rows = res.data?.standings ?? res.data?.results ?? res.data?.preview ?? [];
      const summary = Array.isArray(rows)
        ? rows.slice(0, 10).map((r: any) => `#${r.placement ?? '?'} ${r.display_name ?? r.profile_id} — ${r.points ?? 0} pts · ${r.prize_coins ?? 0} coins`).join('\n')
        : '';
      alert(summary ? `Standings preview:\n${summary}` : 'No standings to preview yet.');
    }
  }

  async function handleAssignRoster(entrantId: string, rosterId: string | null) {
    const res = await api.assignRoster(entrantId, rosterId);
    if (res.error) {
      alert(`Roster assignment error: ${res.error.message}`);
    } else {
      if (selectedTournament) await openEntrantsModal(selectedTournament);
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

  async function handlePickCover() {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        setUploadingCover(true);
        try {
          const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
          const storagePath = `tournaments/cover_${Date.now()}_${cleanName}`;
          const { data, error } = await supabase.storage.from('tournament-thumbnails').upload(storagePath, file, { upsert: true });
          if (error) {
            alert(`Upload failed: ${error.message}`);
          } else {
            const path = data.path;
            setFormCoverPath(path);
            const { data: pubData } = supabase.storage.from('tournament-thumbnails').getPublicUrl(path);
            setCoverPreviewUrl(pubData.publicUrl);
            alert('Thumbnail uploaded!');
          }
        } catch (err: any) {
          alert(`Upload error: ${err.message}`);
        } finally {
          setUploadingCover(false);
        }
      };
      input.click();
    } else {
      alert('On native apps, paste the thumbnail storage path below (e.g. tournaments/cover_123.webp)');
    }
  }

  const filteredList = tournaments.filter((t) => {
    const matchesSearch = searchQuery.trim() === '' ||
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const STATUS_FILTERS = ['all', 'draft', 'scheduled', 'registration_open', 'live', 'completed', 'cancelled'];

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        fetchTournaments();
      }}
    >
      <ScreenHeader
        title="Tournament Operations"
        subtitle="Create competitions, manage rooms and entrants, publish results and prizes"
        right={
          <>
            {can('tournament.create') && (
              <AppButton label="New Tournament" icon="add-circle" onPress={openCreateModal} />
            )}
          </>
        }
      />

      {/* Filter bar */}
      <Card style={{ padding: tokens.space.md, gap: tokens.space.sm }}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={tokens.color.disabled} style={{ position: 'absolute', left: 12, zIndex: 1 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by title or ID…"
            placeholderTextColor={tokens.color.disabled}
            style={styles.searchInput}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabs}>
          {STATUS_FILTERS.map((st) => {
            const active = statusFilter === st;
            return (
              <Pressable
                key={st}
                onPress={() => setStatusFilter(st)}
                style={[styles.filterTab, active && styles.filterTabActive]}
              >
                <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                  {st === 'all' ? 'All' : st.replace('_', ' ').toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Card>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={tokens.color.primary} size="large" style={{ marginTop: 32 }} />
      ) : filteredList.length === 0 ? (
        <Card>
          <EmptyState icon="trophy-outline" title="No tournaments found" subtitle={searchQuery ? 'Try a different search' : 'Click “New Tournament” to launch your first competition'} />
        </Card>
      ) : (
        <View style={styles.tournamentsGrid}>
          {filteredList.map((t) => (
            <Card key={t.id} style={{ gap: tokens.space.md }}>
              {t.cover_path ? (
                <Image
                  source={{ uri: supabase.storage.from('tournament-thumbnails').getPublicUrl(t.cover_path).data.publicUrl }}
                  style={styles.cardCover}
                  resizeMode="cover"
                />
              ) : null}
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.cardTitle}>{t.title}</Text>
                  <Text style={styles.cardId}>ID: {t.id}</Text>
                </View>
                <StatusBadge label={t.status ?? 'draft'} tone={statusTone(t.status)} />
              </Row>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Entry fee</Text>
                  <Coin amount={t.entry_fee ?? 0} size={13} />
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Prize pool</Text>
                  <Coin amount={t.prize_pool ?? 0} size={13} />
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Capacity</Text>
                  <Text style={styles.statValue}>{t.capacity ?? 0}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Mode / Map</Text>
                  <Text style={styles.statValue}>{(t.mode ?? 'solo').toUpperCase()} / {t.map ?? 'Bermuda'}</Text>
                </View>
              </View>

              <View style={styles.cardActionsRow}>
                <AppButton small variant="outline" label="Edit" icon="create-outline" onPress={() => openEditModal(t)} />
                <AppButton small variant="outline" label="Room" icon="key-outline" onPress={() => openRoomModal(t)} />
                <AppButton small variant="outline" label="Entrants" icon="people-outline" onPress={() => openEntrantsModal(t)} />
                <AppButton small variant="outline" label="Results" icon="trophy-outline" onPress={() => openResultsModal(t)} />
                {t.status !== 'cancelled' && t.status !== 'completed' && (
                  <AppButton
                    small
                    variant="danger"
                    label="Cancel"
                    icon="close-circle-outline"
                    onPress={() => {
                      setSelectedTournament(t);
                      setActiveModal('cancel');
                    }}
                  />
                )}
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Modal: Create / Edit */}
      <Modal visible={activeModal === 'create' || activeModal === 'edit'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {activeModal === 'create' ? 'Create Tournament' : 'Edit Tournament'}
              </Text>
              <Text style={styles.modalSubtitle}>Configure mode, capacity, entry fee, and prize settings</Text>

              <FieldLabel>Tournament title *</FieldLabel>
              <TextInput value={formTitle} onChangeText={setFormTitle} placeholder="e.g. Free Fire Solo Blitz #10" placeholderTextColor={tokens.color.disabled} style={styles.modalInput} />

              <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
                <View style={{ flex: 1 }}>
                  <FieldLabel>Game mode *</FieldLabel>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    {(['solo', 'duo', 'squad'] as const).map((m) => (
                      <Pressable key={m} onPress={() => setFormMode(m)} style={[styles.chip, formMode === m && styles.chipActive]}>
                        <Text style={[styles.chipText, formMode === m && styles.chipTextActive]}>{m.toUpperCase()}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <FieldLabel>Map</FieldLabel>
                  <TextInput value={formMap} onChangeText={setFormMap} placeholder="e.g. Bermuda" placeholderTextColor={tokens.color.disabled} style={styles.modalInput} />
                </View>
              </View>

              <FieldLabel>Cover thumbnail</FieldLabel>
              {coverPreviewUrl ? (
                <View style={styles.coverBox}>
                  <Image source={{ uri: coverPreviewUrl }} style={styles.coverPreview} resizeMode="cover" />
                  <View style={styles.coverActions}>
                    <AppButton small variant="outline" label={uploadingCover ? 'Uploading…' : 'Replace'} icon="cloud-upload-outline" onPress={handlePickCover} loading={uploadingCover} />
                    <AppButton small variant="ghost" label="Remove" icon="trash-outline" onPress={() => { setFormCoverPath(''); setCoverPreviewUrl(null); }} />
                  </View>
                </View>
              ) : (
                <AppButton small variant="outline" label={uploadingCover ? 'Uploading…' : 'Upload Thumbnail'} icon="cloud-upload-outline" onPress={handlePickCover} loading={uploadingCover} />
              )}
              <TextInput value={formCoverPath} onChangeText={setFormCoverPath} placeholder="Or paste storage path e.g. tournaments/cover_123.webp" placeholderTextColor={tokens.color.disabled} style={styles.modalInput} />

              <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
                <View style={{ flex: 1 }}>
                  <FieldLabel>Capacity *</FieldLabel>
                  <TextInput value={formCapacity} onChangeText={setFormCapacity} keyboardType="numeric" placeholderTextColor={tokens.color.disabled} style={styles.modalInput} />
                </View>
                <View style={{ flex: 1 }}>
                  <FieldLabel>Entry fee</FieldLabel>
                  <TextInput value={formEntryFee} onChangeText={setFormEntryFee} keyboardType="numeric" placeholderTextColor={tokens.color.disabled} style={styles.modalInput} />
                </View>
                <View style={{ flex: 1 }}>
                  <FieldLabel>Prize pool</FieldLabel>
                  <TextInput value={formPrizePool} onChangeText={setFormPrizePool} keyboardType="numeric" placeholderTextColor={tokens.color.disabled} style={styles.modalInput} />
                </View>
              </View>

              <FieldLabel>Description</FieldLabel>
              <TextInput value={formDescription} onChangeText={setFormDescription} placeholder="e.g. Daily competitive battle" placeholderTextColor={tokens.color.disabled} style={styles.modalInput} />

              <FieldLabel>Rules & guidelines</FieldLabel>
              <TextInput value={formRulesText} onChangeText={setFormRulesText} placeholder="e.g. Fair play enforced. Join 10 minutes early." placeholderTextColor={tokens.color.disabled} multiline style={[styles.modalInput, { height: 70 }]} />

              <FieldLabel>Schedule (PKT — e.g. 2026-08-10 18:00)</FieldLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
                <TextInput value={formRegOpen} onChangeText={setFormRegOpen} placeholder="Reg open" placeholderTextColor={tokens.color.disabled} style={[styles.modalInput, { flex: 1, minWidth: 140 }]} />
                <TextInput value={formRegClose} onChangeText={setFormRegClose} placeholder="Reg close" placeholderTextColor={tokens.color.disabled} style={[styles.modalInput, { flex: 1, minWidth: 140 }]} />
                <TextInput value={formMatchStart} onChangeText={setFormMatchStart} placeholder="Match start" placeholderTextColor={tokens.color.disabled} style={[styles.modalInput, { flex: 1, minWidth: 140 }]} />
                <TextInput value={formRoomRelease} onChangeText={setFormRoomRelease} placeholder="Room release" placeholderTextColor={tokens.color.disabled} style={[styles.modalInput, { flex: 1, minWidth: 140 }]} />
              </View>

              <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={styles.switchLabel}>Free-slot promotion</Text>
                <Switch value={formFreeSlot} onValueChange={setFormFreeSlot} trackColor={{ false: tokens.color.disabled, true: tokens.color.primary }} />
              </Row>
              {formFreeSlot && (
                <Row style={{ gap: 6 }}>
                  {(['slots_full', 'match_start'] as const).map((tr) => (
                    <Pressable key={tr} onPress={() => setFormFreeSlotTrigger(tr)} style={[styles.chip, formFreeSlotTrigger === tr && styles.chipActive]}>
                      <Text style={[styles.chipText, formFreeSlotTrigger === tr && styles.chipTextActive]}>
                        {tr === 'slots_full' ? 'WHEN FULL' : 'AT MATCH START'}
                      </Text>
                    </Pressable>
                  ))}
                </Row>
              )}

              {activeModal === 'create' && (
                <>
                  <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={styles.switchLabel}>Publish immediately</Text>
                    <Switch value={formPublish} onValueChange={setFormPublish} trackColor={{ false: tokens.color.disabled, true: tokens.color.primary }} />
                  </Row>
                  <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={styles.switchLabel}>Save as reusable preset</Text>
                    <Switch value={formSavePreset} onValueChange={setFormSavePreset} trackColor={{ false: tokens.color.disabled, true: tokens.color.primary }} />
                  </Row>
                </>
              )}

              <View style={styles.modalBtnRow}>
                <AppButton variant="ghost" label="Cancel" onPress={() => setActiveModal(null)} />
                <AppButton label="Save Tournament" icon="checkmark-circle-outline" loading={saving} onPress={handleSaveTournament} />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Room */}
      <Modal visible={activeModal === 'room'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Room Credentials</Text>
            <Text style={styles.modalSubtitle}>{selectedTournament?.title}</Text>

            <FieldLabel>Room ID</FieldLabel>
            <TextInput value={roomId} onChangeText={setRoomId} placeholder="e.g. 8493021" placeholderTextColor={tokens.color.disabled} style={styles.modalInput} />

            <FieldLabel>Room password</FieldLabel>
            <TextInput value={roomPassword} onChangeText={setRoomPassword} placeholder="e.g. 7789" placeholderTextColor={tokens.color.disabled} style={styles.modalInput} />

            <FieldLabel>Instructions / notes</FieldLabel>
            <TextInput value={roomInstructions} onChangeText={setRoomInstructions} placeholder="e.g. Map: Bermuda. Join 10 mins early." placeholderTextColor={tokens.color.disabled} style={styles.modalInput} />

            <View style={styles.modalBtnRow}>
              <AppButton variant="ghost" label="Close" onPress={() => setActiveModal(null)} />
              <AppButton label="Save Credentials" icon="save-outline" loading={saving} onPress={handleSaveRoom} />
              <AppButton label="Release Room" variant="secondary" icon="send-outline" loading={saving} onPress={handleReleaseRoom} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Entrants */}
      <Modal visible={activeModal === 'entrants'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tournament Entrants</Text>
            <Text style={styles.modalSubtitle}>{selectedTournament?.title}</Text>
            <ScrollView style={{ maxHeight: 380, marginVertical: 12 }}>
              {entrants.length === 0 ? (
                <EmptyState icon="people-outline" title="No entrants registered yet" />
              ) : (
                <>
                  {rosters.length > 0 && (
                    <FieldLabel>Tap a roster group to assign an entrant</FieldLabel>
                  )}
                  {entrants.map((e, idx) => (
                    <View key={e.id ?? idx} style={styles.entrantItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.entrantName}>{e.display_name ?? e.profile_id ?? `Entrant #${idx + 1}`}</Text>
                        <Text style={styles.entrantStatus}>
                          Slot {e.slot_number ?? '—'} · {e.status ?? 'confirmed'}
                          {e.roster_label ? ` · ${e.roster_label}` : ''}
                        </Text>
                      </View>
                      {rosters.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' }}>
                          {rosters.map((ro) => (
                            <Pressable
                              key={ro.id}
                              onPress={() => handleAssignRoster(e.id, e.roster_id === ro.id ? null : ro.id)}
                              style={[styles.rosterChip, e.roster_id === ro.id && styles.rosterChipActive]}
                            >
                              <Text style={[styles.rosterChipText, e.roster_id === ro.id && styles.rosterChipTextActive]}>
                                {ro.label}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
            <AppButton variant="ghost" label="Close" onPress={() => setActiveModal(null)} />
          </View>
        </View>
      </Modal>

      {/* Modal: Results Studio */}
      <Modal visible={activeModal === 'results'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Results Studio</Text>
            <Text style={styles.modalSubtitle}>Enter kills, placement and points, then save a draft or publish prizes</Text>
            <ScrollView style={{ maxHeight: 380, marginVertical: 12 }}>
              {resultsDraft.length === 0 ? (
                <EmptyState icon="trophy-outline" title="No participants yet" />
              ) : (
                resultsDraft.map((r, idx) => (
                  <View key={r.id ?? idx} style={styles.resultRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entrantName}>{r.display_name ?? r.profile_id}</Text>
                      <Text style={styles.entrantStatus}>Prize: <Coin amount={r.prize_coins ?? 0} size={11} /></Text>
                    </View>
                    <TextInput
                      value={String(r.kills ?? 0)}
                      onChangeText={(v) => updateResultRow(idx, { kills: parseInt(v, 10) || 0 })}
                      keyboardType="numeric"
                      placeholder="Kills"
                      placeholderTextColor={tokens.color.disabled}
                      style={styles.resultInput}
                    />
                    <TextInput
                      value={r.placement ? String(r.placement) : ''}
                      onChangeText={(v) => updateResultRow(idx, { placement: v ? parseInt(v, 10) : null })}
                      keyboardType="numeric"
                      placeholder="Rank"
                      placeholderTextColor={tokens.color.disabled}
                      style={styles.resultInput}
                    />
                    <TextInput
                      value={String(r.points ?? 0)}
                      onChangeText={(v) => updateResultRow(idx, { points: parseInt(v, 10) || 0 })}
                      keyboardType="numeric"
                      placeholder="Pts"
                      placeholderTextColor={tokens.color.disabled}
                      style={styles.resultInput}
                    />
                  </View>
                ))
              )}
            </ScrollView>
            <View style={styles.modalBtnRow}>
              <AppButton variant="ghost" label="Close" onPress={() => setActiveModal(null)} />
              <AppButton variant="secondary" label="Save Draft" icon="save-outline" loading={saving} onPress={handleSaveResultsDraft} />
              <AppButton variant="outline" label="Preview" icon="eye-outline" loading={saving} onPress={handlePreviewResults} />
              {can('result.publish') && (
                <AppButton label="Publish Prizes" icon="trophy" loading={saving} onPress={() => setConfirmPublishResults(true)} />
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Cancel */}
      <Modal visible={activeModal === 'cancel'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: tokens.color.danger }]}>Cancel Tournament</Text>
            <Text style={styles.modalSubtitle}>Reason will be logged and players refunded.</Text>

            <FieldLabel>Cancellation reason</FieldLabel>
            <TextInput value={cancelReason} onChangeText={setCancelReason} placeholder="e.g. Server maintenance / low registration" placeholderTextColor={tokens.color.disabled} style={styles.modalInput} />

            <View style={styles.modalBtnRow}>
              <AppButton variant="ghost" label="Back" onPress={() => setActiveModal(null)} />
              <AppButton label="Confirm Refund & Cancel" variant="danger" icon="warning-outline" loading={saving} onPress={handleCancelTournament} />
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
                <EmptyState icon="bookmark-outline" title="No saved presets" />
              ) : (
                presets.map((p, idx) => (
                  <View key={idx} style={styles.entrantItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entrantName}>{p.title ?? p.name ?? `Preset #${idx + 1}`}</Text>
                      <Text style={styles.entrantStatus}>{p.mode?.toUpperCase()} · {p.map ?? 'Bermuda'}</Text>
                    </View>
                    <AppButton
                      small
                      label="Apply"
                      icon="play-circle-outline"
                      onPress={async () => {
                        const r = await api.applyPreset(p.id);
                        if (r.error) { alert(`Error applying preset: ${r.error.message}`); return; }
                        alert('Preset applied!');
                        setActiveModal(null);
                        fetchTournaments();
                      }}
                    />
                  </View>
                ))
              )}
            </ScrollView>
            <AppButton variant="ghost" label="Close" onPress={() => setActiveModal(null)} />
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={confirmPublishResults}
        title="Publish results & distribute prizes?"
        message="Official results will be locked, prizes credited to player wallets, profile stats updated, and the tournament marked completed. Corrections are audited and cannot be silently undone."
        confirmLabel="Publish & Distribute"
        danger
        loading={saving}
        onCancel={() => setConfirmPublishResults(false)}
        onConfirm={() => {
          setConfirmPublishResults(false);
          handlePublishResults();
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchBox: { justifyContent: 'center' },
  searchInput: {
    backgroundColor: tokens.color.canvas,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.input,
    paddingLeft: 36,
    paddingRight: 12,
    paddingVertical: 10,
    color: tokens.color.ink,
    fontSize: 14,
  },
  filterTabs: { flexDirection: 'row', gap: 8 },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.canvas,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  filterTabActive: { backgroundColor: tokens.color.primary, borderColor: tokens.color.primary },
  filterTabText: { fontSize: 12, fontWeight: '600', color: tokens.color.secondary },
  filterTabTextActive: { color: tokens.color.onPrimary },
  errorBox: { backgroundColor: tokens.color.dangerSoft, borderWidth: 1, borderColor: tokens.color.danger, borderRadius: tokens.radius.card, padding: tokens.space.md },
  errorText: { color: tokens.color.danger, fontWeight: '600' },
  tournamentsGrid: { gap: tokens.space.md },
  cardTitle: { fontSize: 16, fontWeight: '700', color: tokens.color.ink },
  cardId: { fontSize: 12, color: tokens.color.secondary },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
    backgroundColor: tokens.color.canvas,
    padding: tokens.space.md,
    borderRadius: tokens.radius.input,
  },
  statBox: { flex: 1, minWidth: 80, gap: 2 },
  statLabel: { fontSize: 11, color: tokens.color.secondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: 13, fontWeight: '700', color: tokens.color.ink },
  cardActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cardCover: { width: '100%', height: 140, borderRadius: tokens.radius.input, backgroundColor: tokens.color.canvas },
  coverBox: { gap: tokens.space.sm },
  coverPreview: { width: '100%', height: 150, borderRadius: tokens.radius.card, backgroundColor: tokens.color.canvas },
  coverActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: tokens.color.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space.md,
  },
  modalScrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  modalCard: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.space.lg,
    width: '100%',
    maxWidth: 560,
    maxHeight: '94%',
    gap: tokens.space.xs,
  },
  modalTitle: { fontSize: 19, fontWeight: '800', color: tokens.color.ink, letterSpacing: -0.3 },
  modalSubtitle: { fontSize: 13, color: tokens.color.secondary, marginBottom: 4 },
  modalInput: {
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.input,
    padding: 10,
    color: tokens.color.ink,
    fontSize: 14,
    backgroundColor: tokens.color.canvas,
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: tokens.radius.input,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.canvas,
  },
  chipActive: { backgroundColor: tokens.color.primary, borderColor: tokens.color.primary },
  chipText: { fontSize: 11, fontWeight: '700', color: tokens.color.secondary },
  chipTextActive: { color: tokens.color.onPrimary },
  switchLabel: { fontSize: 13, fontWeight: '600', color: tokens.color.ink },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: tokens.space.sm, marginTop: tokens.space.md, flexWrap: 'wrap' },
  entrantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.border,
    gap: 8,
  },
  entrantName: { fontSize: 13, fontWeight: '600', color: tokens.color.ink },
  entrantStatus: { fontSize: 12, color: tokens.color.secondary, marginTop: 1 },
  rosterChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.canvas,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  rosterChipActive: { backgroundColor: tokens.color.primary, borderColor: tokens.color.primary },
  rosterChipText: { fontSize: 10, fontWeight: '700', color: tokens.color.secondary },
  rosterChipTextActive: { color: tokens.color.onPrimary },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.border,
  },
  resultInput: {
    width: 56,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.input,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: tokens.color.ink,
    backgroundColor: tokens.color.canvas,
    fontSize: 13,
    textAlign: 'center',
  },
});
