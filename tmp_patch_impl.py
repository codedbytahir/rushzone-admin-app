#!/usr/bin/env python3
import os, sys, re

D = [d for d in os.listdir('/project/workspace') if d.startswith('rushzone')][0]
root = f'/project/workspace/{D}'

def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()

def write(p, s):
    with open(p, 'w', encoding='utf-8') as f:
        f.write(s)

# ---------- 1. admin-tournaments-create ----------
p = f'{root}/supabase/functions/admin-tournaments-create/index.ts'
s = read(p)
old = "      mode: body.mode ?? \"squad\",\n      map: body.map ?? null,"
new = "      mode: body.mode ?? \"squad\",\n      map: body.map ?? null,\n      cover_path: body.cover_path ?? null,"
assert old in s, 'create anchor missing'
s = s.replace(old, new, 1)
write(p, s)
print('OK create')

# ---------- 2. admin-tournaments-update ----------
p = f'{root}/supabase/functions/admin-tournaments-update/index.ts'
s = read(p)
old = 'const allowed = ["title","description","internal_notes","mode","map","rounds","capacity","entry_fee","prize_pool","prize_distribution","score_rules","rules_text","reg_open_at","reg_close_at","match_start_at","room_release_at","result_expected_at","free_slot_enabled","free_slot_trigger","status"];'
new = 'const allowed = ["title","description","internal_notes","mode","map","cover_path","rounds","capacity","entry_fee","prize_pool","prize_distribution","score_rules","rules_text","reg_open_at","reg_close_at","match_start_at","room_release_at","result_expected_at","free_slot_enabled","free_slot_trigger","status"];'
assert old in s, 'update anchor missing'
s = s.replace(old, new, 1)
write(p, s)
print('OK update')

# ---------- 3. BannerSlideshow ----------
p = f'{root}/src/components/BannerSlideshow.tsx'
s = read(p)
old = """  if (loading || width <= 0) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Text style={styles.placeholderText}>Loading carousel…</Text>
      </View>
    );
  }"""
new = """  if (loading || width <= 0) {
    return (
      <View style={[styles.placeholder, { height }]} onLayout={onLayout}>
        <Text style={styles.placeholderText}>Loading carousel…</Text>
      </View>
    );
  }"""
assert old in s, 'slideshow anchor missing'
s = s.replace(old, new, 1)
write(p, s)
print('OK slideshow')

# ---------- 4. tournaments.tsx ----------
p = f'{root}/app/(tabs)/tournaments.tsx'
s = read(p)

# 4a. imports
old = "import { View, Text, StyleSheet, Pressable, TextInput, Modal, ScrollView, ActivityIndicator, Switch } from 'react-native';"
new = "import { View, Text, StyleSheet, Pressable, TextInput, Modal, ScrollView, ActivityIndicator, Switch, Image, Platform } from 'react-native';"
assert old in s, 'import anchor missing'
s = s.replace(old, new, 1)

old = "import { api } from '../../src/lib/api';"
new = "import { api } from '../../src/lib/api';\nimport { supabase } from '../../src/lib/supabase';"
assert old in s, 'supabase import anchor missing'
s = s.replace(old, new, 1)

# 4b. state
old = "  const [formSavePreset, setFormSavePreset] = useState(false);"
new = "  const [formSavePreset, setFormSavePreset] = useState(false);\n  const [formCoverPath, setFormCoverPath] = useState('');\n  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);\n  const [uploadingCover, setUploadingCover] = useState(false);"
assert old in s, 'state anchor missing'
s = s.replace(old, new, 1)

# 4c. openCreateModal reset
old = "    setFormSavePreset(false);\n    setActiveModal('create');"
new = "    setFormSavePreset(false);\n    setFormCoverPath('');\n    setCoverPreviewUrl(null);\n    setActiveModal('create');"
assert old in s, 'create modal anchor missing'
s = s.replace(old, new, 1)

# 4d. openEditModal set cover
old = "    setFormRoomRelease(t.room_release_at?.substring(0, 16) ?? '');"
new = "    setFormRoomRelease(t.room_release_at?.substring(0, 16) ?? '');\n    setFormCoverPath(t.cover_path ?? '');\n    setCoverPreviewUrl(t.cover_path ? supabase.storage.from('tournament-thumbnails').getPublicUrl(t.cover_path).data.publicUrl : null);"
assert old in s, 'edit modal anchor missing'
s = s.replace(old, new, 1)

# 4e. upload handler before filteredList
old = "  const filteredList = tournaments.filter((t) => {"
new = """  async function handlePickCover() {
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

  const filteredList = tournaments.filter((t) => {"""
assert old in s, 'handler anchor missing'
s = s.replace(old, new, 1)

# 4f. update payload cover_path
old = "        free_slot_enabled: formFreeSlot,\n        free_slot_trigger: formFreeSlotTrigger,\n      };\n      const res = await api.updateTournament(updatePayload);"
new = "        free_slot_enabled: formFreeSlot,\n        free_slot_trigger: formFreeSlotTrigger,\n        cover_path: formCoverPath.trim() || undefined,\n      };\n      const res = await api.updateTournament(updatePayload);"
assert old in s, 'update payload anchor missing'
s = s.replace(old, new, 1)

# 4g. create payload cover_path
old = "        is_preset: formSavePreset,\n        preset_key: formSavePreset ? `preset-${Date.now()}` : undefined,\n      };"
new = "        is_preset: formSavePreset,\n        preset_key: formSavePreset ? `preset-${Date.now()}` : undefined,\n        cover_path: formCoverPath.trim() || undefined,\n      };"
assert old in s, 'create payload anchor missing'
s = s.replace(old, new, 1)

# 4h. card cover image
old = "            <Card key={t.id} style={{ gap: tokens.space.md }}>\n              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>"
new = """            <Card key={t.id} style={{ gap: tokens.space.md }}>
              {t.cover_path ? (
                <Image
                  source={{ uri: supabase.storage.from('tournament-thumbnails').getPublicUrl(t.cover_path).data.publicUrl }}
                  style={styles.cardCover}
                  resizeMode="cover"
                />
              ) : null}
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>"""
assert old in s, 'card cover anchor missing'
s = s.replace(old, new, 1)

# 4i. thumbnail UI in create/edit modal (after mode/map row)
old = """                <View style={{ flex: 1 }}>
                  <FieldLabel>Map</FieldLabel>
                  <TextInput value={formMap} onChangeText={setFormMap} placeholder="e.g. Bermuda" placeholderTextColor={tokens.color.disabled} style={styles.modalInput} />
                </View>
              </View>
"""
new = """                <View style={{ flex: 1 }}>
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
"""
assert old in s, 'modal ui anchor missing'
s = s.replace(old, new, 1)

# 4j. modalCard maxHeight for mobile
old = """  modalCard: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.space.lg,
    width: '100%',
    maxWidth: 560,
    gap: tokens.space.xs,
  },"""
new = """  modalCard: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.space.lg,
    width: '100%',
    maxWidth: 560,
    maxHeight: '94%',
    gap: tokens.space.xs,
  },"""
assert old in s, 'modalCard anchor missing'
s = s.replace(old, new, 1)

# 4k. new styles after cardActionsRow
old = "  cardActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },"
new = """  cardActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cardCover: { width: '100%', height: 140, borderRadius: tokens.radius.input, backgroundColor: tokens.color.canvas },
  coverBox: { gap: tokens.space.sm },
  coverPreview: { width: '100%', height: 150, borderRadius: tokens.radius.card, backgroundColor: tokens.color.canvas },
  coverActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },"""
assert old in s, 'styles anchor missing'
s = s.replace(old, new, 1)

write(p, s)
print('OK tournaments')
print('ALL DONE')
