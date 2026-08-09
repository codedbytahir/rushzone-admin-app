import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Image, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { PolicyLinks } from '../../src/components/PolicyLinks';
import { tokens } from '../../src/theme/tokens';
import { api } from '../../src/lib/api';
import { supabase } from '../../src/lib/supabase';
import { uploadToBucket, getSignedUrl } from '../../src/lib/upload';

export default function MoreScreen() {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sections State
  const [activeSection, setActiveSection] = useState<'admins' | 'content' | 'push' | 'audit' | 'rewards' | 'policies'>('admins');

  // Admins state
  const [admins, setAdmins] = useState<any[]>([]);

  // Content state
  const [banners, setBanners] = useState<any[]>([]);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementLink, setAnnouncementLink] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);

  // Push State
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushTarget, setPushTarget] = useState<'broadcast' | 'tournament' | 'user'>('broadcast');
  const [pushTargetId, setPushTargetId] = useState('');

  // Audit State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Rewards State
  const [streakFreezeProfile, setStreakFreezeProfile] = useState('');

  const [processing, setProcessing] = useState(false);

  const fetchSectionData = useCallback(async () => {
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      setSessionUser(sessionData.session?.user ?? null);

      if (activeSection === 'admins') {
        const res = await api.listAdmins();
        if (res.data) setAdmins(Array.isArray(res.data) ? res.data : res.data?.admins ?? []);
      } else if (activeSection === 'content') {
        const [banRes, annRes] = await Promise.all([
          api.listBanners(),
          api.getAnnouncement(),
        ]);
        if (banRes.data) setBanners(Array.isArray(banRes.data) ? banRes.data : banRes.data?.banners ?? []);
        if (annRes.data) {
          setAnnouncementText(annRes.data?.text ?? annRes.data?.announcement?.text ?? '');
          setAnnouncementLink(annRes.data?.link ?? annRes.data?.announcement?.link ?? '');
        }
      } else if (activeSection === 'audit') {
        const res = await api.queryAudit({ limit: 20 });
        if (res.data) setAuditLogs(Array.isArray(res.data) ? res.data : res.data?.logs ?? []);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load section');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeSection]);

  useEffect(() => {
    fetchSectionData();
  }, [fetchSectionData]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  // Admin Management Actions
  async function handleGenerateKey(assignmentId: string) {
    setProcessing(true);
    const res = await api.generateKey(assignmentId);
    setProcessing(false);
    if (res.error) {
      alert(`Error generating key: ${res.error.message}`);
    } else {
      alert(`Super Key Generated: ${res.data?.super_key}`);
      fetchSectionData();
    }
  }

  async function handleRotateKey(assignmentId: string) {
    setProcessing(true);
    const res = await api.rotateKey(assignmentId);
    setProcessing(false);
    if (res.error) {
      alert(`Error rotating key: ${res.error.message}`);
    } else {
      alert(`Key Rotated! New Super Key: ${res.data?.super_key}`);
      fetchSectionData();
    }
  }

  async function handleRevokeKey(assignmentId: string) {
    setProcessing(true);
    const res = await api.revokeKey(assignmentId);
    setProcessing(false);
    if (res.error) {
      alert(`Error revoking key: ${res.error.message}`);
    } else {
      alert('Key Revoked successfully');
      fetchSectionData();
    }
  }

  // Banner Upload Action
  async function handlePickAndUploadBanner() {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        try {
          const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
          const storagePath = `banners/banner_${Date.now()}_${cleanName}`;
          const { data, error } = await supabase.storage.from('banners').upload(storagePath, file, { upsert: true });

          if (error) {
            alert(`Upload failed: ${error.message}`);
          } else {
            const path = data.path;
            setBannerImage(path);

            // Get public URL or preview URL
            const { data: pubData } = supabase.storage.from('banners').getPublicUrl(path);
            setBannerPreviewUrl(pubData.publicUrl);
            alert('Banner image uploaded successfully!');
          }
        } catch (err: any) {
          alert(`Upload error: ${err.message}`);
        } finally {
          setUploadingImage(false);
        }
      };
      input.click();
    } else {
      alert('On native apps, select or paste the banner image storage path below');
    }
  }

  // Content Actions
  async function handleCreateBanner() {
    if (!bannerImage.trim()) {
      alert('Please upload an image or enter a valid banner storage path first');
      return;
    }
    setProcessing(true);
    const res = await api.createBanner({ image_path: bannerImage.trim(), link_url: bannerLink.trim() || undefined });
    setProcessing(false);
    if (res.error) {
      alert(`Banner creation error: ${res.error.message}`);
    } else {
      alert('Banner added to Home carousel successfully!');
      setBannerImage('');
      setBannerLink('');
      setBannerPreviewUrl(null);
      fetchSectionData();
    }
  }

  async function handleSaveAnnouncement() {
    setProcessing(true);
    const res = await api.updateAnnouncement({ text: announcementText.trim(), link: announcementLink.trim(), active: true });
    setProcessing(false);
    if (res.error) {
      alert(`Announcement error: ${res.error.message}`);
    } else {
      alert('Announcement updated globally!');
    }
  }

  // Push Action
  async function handleSendPush() {
    if (!pushTitle.trim() || !pushBody.trim()) {
      alert('Title and Body are required');
      return;
    }
    setProcessing(true);
    const res = await api.sendNotification({
      title: pushTitle.trim(),
      body: pushBody.trim(),
      broadcast: pushTarget === 'broadcast',
      confirm: pushTarget === 'broadcast' ? true : undefined,
      tournament_id: pushTarget === 'tournament' ? pushTargetId.trim() : undefined,
      profile_id: pushTarget === 'user' ? pushTargetId.trim() : undefined,
    });
    setProcessing(false);
    if (res.error) {
      alert(`Push Notification error: ${res.error.message}`);
    } else {
      alert('Push notification sent successfully!');
      setPushTitle('');
      setPushBody('');
    }
  }

  // Streaks Action
  async function handleGrantStreakFreeze() {
    if (!streakFreezeProfile.trim()) {
      alert('Player Profile ID is required');
      return;
    }
    setProcessing(true);
    const res = await api.grantStreakFreeze(streakFreezeProfile.trim());
    setProcessing(false);
    if (res.error) {
      alert(`Grant error: ${res.error.message}`);
    } else {
      alert('Streak Freeze item granted to player!');
      setStreakFreezeProfile('');
    }
  }

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        fetchSectionData();
      }}
    >
      {/* Header Profile Card */}
      <View style={styles.profileCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileTitle}>Admin Operations & System Hub</Text>
          <Text style={styles.profileSubtitle}>Logged in: {sessionUser?.email ?? 'Rush Zone Staff'}</Text>
        </View>
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Sign Out 🚪</Text>
        </Pressable>
      </View>

      {/* Navigation Sub-Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navRow}>
        {[
          { key: 'admins', label: '👑 Staff Admins' },
          { key: 'content', label: '🎨 Banners & Announcements' },
          { key: 'push', label: '🔔 Push Notifications' },
          { key: 'rewards', label: '🎁 Rewards & Streaks' },
          { key: 'audit', label: '📜 Audit Logs' },
          { key: 'policies', label: '🌐 Policy Links' },
        ].map((it) => (
          <Pressable
            key={it.key}
            onPress={() => setActiveSection(it.key as any)}
            style={[styles.navTab, activeSection === it.key && styles.navTabActive]}
          >
            <Text style={[styles.navTabText, activeSection === it.key && styles.navTabTextActive]}>
              {it.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* SECTION 1: Admins */}
      {activeSection === 'admins' && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Owner & Admin Access Control</Text>
          <Text style={styles.sectionSubtitle}>Manage staff assignments, Super Keys, and permission authorizations</Text>

          {loading ? (
            <ActivityIndicator color={tokens.color.primary} />
          ) : admins.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No admin assignments found or insufficient permission</Text>
            </View>
          ) : (
            admins.map((a) => (
              <View key={a.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{a.email ?? a.assignment_id ?? 'Admin Staff'}</Text>
                  <Text style={styles.itemSubtitle}>Key Version: v{a.key_version ?? 1} · Roles: {(a.role_keys ?? ['admin']).join(', ')}</Text>
                </View>
                <View style={styles.actionRow}>
                  <Pressable style={styles.smallBtn} onPress={() => handleGenerateKey(a.id)}>
                    <Text style={styles.smallBtnText}>Generate Key</Text>
                  </Pressable>
                  <Pressable style={[styles.smallBtn, { backgroundColor: tokens.color.ink }]} onPress={() => handleRotateKey(a.id)}>
                    <Text style={styles.smallBtnText}>Rotate Key</Text>
                  </Pressable>
                  <Pressable style={[styles.smallBtn, { backgroundColor: tokens.color.danger }]} onPress={() => handleRevokeKey(a.id)}>
                    <Text style={styles.smallBtnText}>Revoke</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* SECTION 2: Content & Banners */}
      {activeSection === 'content' && (
        <View style={{ gap: tokens.space.md }}>
          {/* Announcement Banner */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Global Announcement Nudge</Text>

            <Text style={styles.inputLabel}>Announcement Text</Text>
            <TextInput value={announcementText} onChangeText={setAnnouncementText} placeholder="e.g. Free Fire Season 5 Tournament Registration is OPEN!" style={styles.input} />

            <Text style={styles.inputLabel}>Target Deep Link / URL</Text>
            <TextInput value={announcementLink} onChangeText={setAnnouncementLink} placeholder="e.g. rushzonecontrol://tournaments" style={styles.input} />

            <Pressable style={styles.primaryBtn} onPress={handleSaveAnnouncement} disabled={processing}>
              <Text style={styles.primaryBtnText}>Update Announcement</Text>
            </Pressable>
          </View>

          {/* Home Banners with Image Upload */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Home Screen Carousel Banners</Text>
            <Text style={styles.sectionSubtitle}>Upload image file to public 'banners' storage bucket and link to promotional screens</Text>

            <View style={styles.uploadRow}>
              <Pressable style={styles.uploadBtn} onPress={handlePickAndUploadBanner} disabled={uploadingImage}>
                {uploadingImage ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.uploadBtnText}>📁 Upload Banner Image File</Text>
                )}
              </Pressable>
            </View>

            {bannerPreviewUrl && (
              <View style={styles.previewBox}>
                <Text style={styles.inputLabel}>Image Preview:</Text>
                <Image source={{ uri: bannerPreviewUrl }} style={styles.bannerPreview} resizeMode="contain" />
              </View>
            )}

            <Text style={styles.inputLabel}>Banner Storage Path</Text>
            <TextInput value={bannerImage} onChangeText={setBannerImage} placeholder="e.g. banners/banner_1718293.webp" style={styles.input} />

            <Text style={styles.inputLabel}>Target Link URL (Optional)</Text>
            <TextInput value={bannerLink} onChangeText={setBannerLink} placeholder="e.g. https://rushzone.pk/promo" style={styles.input} />

            <Pressable style={styles.primaryBtn} onPress={handleCreateBanner} disabled={processing}>
              {processing ? <ActivityIndicator color="white" /> : <Text style={styles.primaryBtnText}>+ Publish Banner to App Carousel</Text>}
            </Pressable>

            {banners.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.subTitle}>Active Banners ({banners.length})</Text>
                {banners.map((b) => (
                  <View key={b.id} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{b.image_path}</Text>
                      {b.link_url && <Text style={styles.itemSubtitle}>Link: {b.link_url}</Text>}
                    </View>
                    <Pressable
                      style={[styles.smallBtn, { backgroundColor: tokens.color.danger }]}
                      onPress={async () => {
                        await api.deleteBanner(b.id);
                        alert('Banner deleted!');
                        fetchSectionData();
                      }}
                    >
                      <Text style={styles.smallBtnText}>Delete</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {/* SECTION 3: Push Notifications */}
      {activeSection === 'push' && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Push Notification Broadcaster</Text>
          <Text style={styles.sectionSubtitle}>Send high-priority push notifications to registered mobile devices</Text>

          <Text style={styles.inputLabel}>Notification Scope</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginVertical: 6 }}>
            {(['broadcast', 'tournament', 'user'] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setPushTarget(t)}
                style={[styles.targetBadge, pushTarget === t && styles.targetBadgeActive]}
              >
                <Text style={[styles.targetBadgeText, pushTarget === t && styles.targetBadgeTextActive]}>
                  {t.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          {pushTarget !== 'broadcast' && (
            <>
              <Text style={styles.inputLabel}>
                {pushTarget === 'tournament' ? 'Tournament ID' : 'User Profile ID'}
              </Text>
              <TextInput value={pushTargetId} onChangeText={setPushTargetId} placeholder="Enter target ID..." style={styles.input} />
            </>
          )}

          <Text style={styles.inputLabel}>Notification Title *</Text>
          <TextInput value={pushTitle} onChangeText={setPushTitle} placeholder="e.g. Room Password Released!" style={styles.input} />

          <Text style={styles.inputLabel}>Message Body *</Text>
          <TextInput value={pushBody} onChangeText={setPushBody} placeholder="e.g. The room ID for your match is now available!" multiline style={[styles.input, { height: 80 }]} />

          <Pressable style={styles.primaryBtn} onPress={handleSendPush} disabled={processing}>
            {processing ? <ActivityIndicator color="white" /> : <Text style={styles.primaryBtnText}>Send Push Notification</Text>}
          </Pressable>
        </View>
      )}

      {/* SECTION 4: Rewards & Streaks */}
      {activeSection === 'rewards' && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Streaks & Reward Operations</Text>
          <Text style={styles.sectionSubtitle}>Grant support streak freezes and configure reward parameters</Text>

          <Text style={styles.inputLabel}>Grant Streak Freeze to Player</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <TextInput
              value={streakFreezeProfile}
              onChangeText={setStreakFreezeProfile}
              placeholder="Player Profile UUID..."
              style={[styles.input, { flex: 1 }]}
            />
            <Pressable style={styles.primaryBtn} onPress={handleGrantStreakFreeze} disabled={processing}>
              <Text style={styles.primaryBtnText}>Grant Freeze</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* SECTION 5: Audit Logs */}
      {activeSection === 'audit' && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>System Audit Logs</Text>
          <Text style={styles.sectionSubtitle}>Immutable historical log of administrative actions</Text>

          {loading ? (
            <ActivityIndicator color={tokens.color.primary} />
          ) : auditLogs.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No audit entries recorded yet</Text>
            </View>
          ) : (
            auditLogs.map((a, idx) => (
              <View key={a.id ?? idx} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{a.action ?? 'Action'}</Text>
                  <Text style={styles.itemSubtitle}>Actor: {a.actor_id ?? 'System'} · Entity: {a.entity_type ?? 'N/A'}</Text>
                </View>
                <Text style={{ fontSize: 11, color: tokens.color.secondary }}>{a.created_at?.substring(0, 10)}</Text>
              </View>
            ))
          )}
        </View>
      )}

      {/* SECTION 6: Policy Links */}
      {activeSection === 'policies' && (
        <View style={{ gap: tokens.space.md }}>
          <PolicyLinks />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.space.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space.sm,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.color.ink,
  },
  profileSubtitle: {
    fontSize: 13,
    color: tokens.color.secondary,
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: tokens.color.danger,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: tokens.radius.button,
  },
  logoutBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 13,
  },
  navRow: {
    flexDirection: 'row',
    gap: 8,
  },
  navTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.surface,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  navTabActive: {
    backgroundColor: tokens.color.primary,
    borderColor: tokens.color.primary,
  },
  navTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.color.secondary,
  },
  navTabTextActive: {
    color: 'white',
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
  sectionCard: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.space.lg,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: tokens.space.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: tokens.color.ink,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: tokens.color.secondary,
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: tokens.color.ink,
    marginBottom: 6,
  },
  emptyBox: {
    padding: tokens.space.md,
    alignItems: 'center',
    backgroundColor: tokens.color.canvas,
    borderRadius: tokens.radius.input,
  },
  emptyText: {
    color: tokens.color.secondary,
    fontSize: 13,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  actionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  smallBtn: {
    backgroundColor: tokens.color.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radius.button,
  },
  smallBtnText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: tokens.color.secondary,
    marginTop: 8,
  },
  input: {
    backgroundColor: tokens.color.canvas,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.input,
    padding: 10,
    color: tokens.color.ink,
    fontSize: 14,
  },
  uploadRow: {
    marginVertical: 8,
  },
  uploadBtn: {
    backgroundColor: tokens.color.ink,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: tokens.radius.button,
    alignItems: 'center',
  },
  uploadBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 13,
  },
  previewBox: {
    marginVertical: 6,
  },
  bannerPreview: {
    width: '100%',
    height: 180,
    borderRadius: tokens.radius.card,
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: tokens.color.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: tokens.radius.button,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  targetBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.canvas,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  targetBadgeActive: {
    backgroundColor: tokens.color.ink,
    borderColor: tokens.color.ink,
  },
  targetBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.color.secondary,
  },
  targetBadgeTextActive: {
    color: 'white',
  },
});
