import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Image, ScrollView, ActivityIndicator, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { PolicyLinks } from '../../src/components/PolicyLinks';
import { BannerSlideshow } from '../../src/components/BannerSlideshow';
import { tokens } from '../../src/theme/tokens';
import { api } from '../../src/lib/api';
import { supabase } from '../../src/lib/supabase';
import { clearAdminSession } from '../../src/lib/adminSession';
import { useAdminSession } from '../../src/hooks/useAdminSession';
import { ConfirmDialog } from '../../src/components/ConfirmDialog';
import { Card, StatusBadge, EmptyState, AppButton, Row, FieldLabel, Avatar } from '../../src/components/ui';

type Section = 'admins' | 'content' | 'push' | 'audit' | 'rewards' | 'policies';

const SECTION_ICONS: Record<Section, React.ComponentProps<typeof Ionicons>['name']> = {
  admins: 'shield-checkmark-outline',
  content: 'image-outline',
  push: 'notifications-outline',
  audit: 'document-text-outline',
  rewards: 'gift-outline',
  policies: 'link-outline',
};

export default function MoreScreen() {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adminSession = useAdminSession();
  const isOwner = adminSession.isOwner;

  const [activeSection, setActiveSection] = useState<Section>(isOwner ? 'admins' : 'content');

  const [admins, setAdmins] = useState<any[]>([]);

  const [banners, setBanners] = useState<any[]>([]);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementLink, setAnnouncementLink] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const [editingBanner, setEditingBanner] = useState<any | null>(null);
  const [confirmDeleteBanner, setConfirmDeleteBanner] = useState<any | null>(null);

  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushTarget, setPushTarget] = useState<'broadcast' | 'tournament' | 'user'>('broadcast');
  const [pushTargetId, setPushTargetId] = useState('');

  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [streakFreezeProfile, setStreakFreezeProfile] = useState('');

  const [processing, setProcessing] = useState(false);
  const [confirmKeyAction, setConfirmKeyAction] = useState<{ type: 'generate' | 'rotate' | 'revoke'; id: string } | null>(null);
  const [approvingAdmin, setApprovingAdmin] = useState<any | null>(null);
  const [approveRoles, setApproveRoles] = useState<Record<string, boolean>>({});
  const [confirmRejectAdmin, setConfirmRejectAdmin] = useState<any | null>(null);
  const [generatedKey, setGeneratedKey] = useState<{ assignment_id: string; email: string; key: string } | null>(null);
  const [permAdmin, setPermAdmin] = useState<any | null>(null);
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [permSelection, setPermSelection] = useState<Record<string, boolean>>({});


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

  const ROLE_OPTIONS = [
    { key: 'tournament_manager', label: 'Tournament Manager' },
    { key: 'room_ops', label: 'Room & Match Ops' },
    { key: 'results_manager', label: 'Results Manager' },
    { key: 'topup_reviewer', label: 'Top-up Reviewer' },
    { key: 'withdrawal_operator', label: 'Withdrawal Ops' },
    { key: 'reward_manager', label: 'Reward Manager' },
    { key: 'engagement_manager', label: 'Engagement (Streaks & Referrals)' },
    { key: 'content_marketing', label: 'Content & Marketing' },
    { key: 'support_moderator', label: 'Support / Moderation' },
    { key: 'notification_manager', label: 'Notifications' },
    { key: 'reports_viewer', label: 'Reports Viewer' },
  ];

  function openApproveAdmin(a: any) {
    const roles: Record<string, boolean> = {};
    for (const r of a.roles ?? []) {
      const key = typeof r === 'string' ? r : r?.key;
      if (key) roles[key] = true;
    }
    setApproveRoles(roles);
    setApprovingAdmin(a);
  }

  async function handleApproveAdmin() {
    if (!approvingAdmin) return;
    setProcessing(true);
    const roleKeys = Object.entries(approveRoles).filter(([, on]) => on).map(([k]) => k);
    const res = await api.approveAdmin(approvingAdmin.id, roleKeys);
    setProcessing(false);
    if (res.error) {
      alert('Error approving admin: ' + res.error.message);
    } else {
      // Auto-issue a Super Key so the Owner can hand it over right away.
      const keyRes = await api.generateKey(approvingAdmin.id);
      if (keyRes.error) {
        alert('Admin approved! Now use "Generate" to issue their Super Key.');
      } else {
        setGeneratedKey({ assignment_id: approvingAdmin.id, email: approvingAdmin.email ?? 'Admin', key: keyRes.data?.super_key ?? '' });
      }
      setApprovingAdmin(null);
      setApproveRoles({});
      fetchSectionData();
    }
  }

  async function handleRejectAdmin() {
    if (!confirmRejectAdmin) return;
    setProcessing(true);
    const res = await api.rejectAdmin(confirmRejectAdmin.id);
    setProcessing(false);
    setConfirmRejectAdmin(null);
    if (res.error) {
      alert('Error rejecting admin: ' + res.error.message);
    } else {
      alert('Admin application rejected.');
      fetchSectionData();
    }
  }

  function adminStatusTone(status: string): 'success' | 'warn' | 'danger' | 'neutral' {
    if (status === 'active') return 'success';
    if (status === 'pending') return 'warn';
    if (status === 'rejected' || status === 'suspended' || status === 'revoked') return 'danger';
    return 'neutral';
  }

  function adminStatusLabel(a: any): string {
    const base = a.status ?? 'pending';
    const credStatus = a.credential?.status;
    if (a.is_owner) return 'Owner';
    if (credStatus && base === 'active') return `${base} · key ${credStatus}`;
    return base;
  }

  async function copyText(text: string) {
    try {
      if (Platform.OS === 'web') {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          alert('Super Key copied to clipboard — share it with the admin securely.');
          return;
        }
      }
      // Fallback: prompt shows the key for manual copy on native / non-secure web contexts
      alert('Super Key: ' + text + '\n\n(Copy it manually and hand it over securely.)');
    } catch {
      alert('Super Key: ' + text + '\n\n(Copy it manually and hand it over securely.)');
    }
  }

  async function openPermModal(a: any) {
    setPermAdmin(a);
    setPermSelection({});
    const res = await api.listPermissions();
    const perms = Array.isArray(res.data) ? res.data : res.data?.permissions ?? [];
    setAllPermissions(perms);
    // Pre-fill current permissions from the admin's roles
    const cur: Record<string, boolean> = {};
    for (const r of a.roles ?? []) {
      const rk = typeof r === 'string' ? r : r?.key;
      if (rk && rk !== 'custom_permissions') {
        for (const p of (r.permissions ?? [])) cur[p.key ?? p] = true;
      }
    }
    for (const p of (a.permissions ?? [])) cur[p] = true;
    setPermSelection(cur);
  }

  async function handleSavePermissions() {
    if (!permAdmin) return;
    setProcessing(true);
    const keys = Object.entries(permSelection).filter(([, on]) => on).map(([k]) => k);
    const res = await api.updateAdminPermissions(permAdmin.id, keys);
    setProcessing(false);
    if (res.error) {
      alert('Error updating permissions: ' + res.error.message);
    } else {
      alert('Permissions updated for ' + (permAdmin.email ?? 'admin'));
      setPermAdmin(null);
      fetchSectionData();
    }
  }

  async function handleLogout() {
    clearAdminSession();
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  async function runKeyAction(action: 'generate' | 'rotate' | 'revoke', assignmentId: string) {
    setProcessing(true);
    if (action === 'generate') await handleGenerateKey(assignmentId);
    if (action === 'rotate') await handleRotateKey(assignmentId);
    if (action === 'revoke') await handleRevokeKey(assignmentId);
    setProcessing(false);
  }

  async function handleGenerateKey(assignmentId: string) {
    setProcessing(true);
    const res = await api.generateKey(assignmentId);
    setProcessing(false);
    if (res.error) {
      alert(`Error generating key: ${res.error.message}`);
    } else {
      const target = admins.find((x: any) => x.id === assignmentId);
      setGeneratedKey({ assignment_id: assignmentId, email: target?.email ?? 'Admin', key: res.data?.super_key ?? '' });
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
      const target = admins.find((x: any) => x.id === assignmentId);
      setGeneratedKey({ assignment_id: assignmentId, email: target?.email ?? 'Admin', key: res.data?.super_key ?? '' });
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

  async function handleSaveBanner() {
    if (!bannerImage.trim()) {
      alert('Please upload an image or enter a valid banner storage path first');
      return;
    }
    setProcessing(true);
    const payload = { image_path: bannerImage.trim(), link_url: bannerLink.trim() || undefined };
    const res = editingBanner
      ? await api.updateBanner({ ...payload, id: editingBanner.id })
      : await api.createBanner(payload);
    setProcessing(false);
    if (res.error) {
      alert(`Banner error: ${res.error.message}`);
    } else {
      alert(editingBanner ? 'Banner updated successfully!' : 'Banner added to Home carousel successfully!');
      setEditingBanner(null);
      setBannerImage('');
      setBannerLink('');
      setBannerPreviewUrl(null);
      fetchSectionData();
    }
  }

  function startEditBanner(b: any) {
    setEditingBanner(b);
    setBannerImage(b.image_path ?? '');
    setBannerLink(b.link_url ?? '');
    setBannerPreviewUrl(b.image_path ? supabase.storage.from('banners').getPublicUrl(b.image_path).data.publicUrl : null);
  }

  function cancelEditBanner() {
    setEditingBanner(null);
    setBannerImage('');
    setBannerLink('');
    setBannerPreviewUrl(null);
  }

  async function toggleBannerActive(b: any) {
    const res = await api.updateBanner({ id: b.id, active: !b.active });
    if (res.error) {
      alert(`Error updating banner: ${res.error.message}`);
    } else {
      fetchSectionData();
    }
  }

  async function handleDeleteBanner() {
    if (!confirmDeleteBanner) return;
    setProcessing(true);
    const res = await api.deleteBanner(confirmDeleteBanner.id);
    setProcessing(false);
    setConfirmDeleteBanner(null);
    if (res.error) {
      alert(`Error deleting banner: ${res.error.message}`);
    } else {
      if (editingBanner?.id === confirmDeleteBanner.id) cancelEditBanner();
      alert('Banner deleted!');
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

  const sections = [
    ...(isOwner ? [{ key: 'admins' as Section, label: 'Staff Admins' }] : []),
    { key: 'content' as Section, label: 'Content & Banners' },
    { key: 'push' as Section, label: 'Push Notifications' },
    { key: 'rewards' as Section, label: 'Rewards & Streaks' },
    { key: 'audit' as Section, label: 'Audit Logs' },
    { key: 'policies' as Section, label: 'Policy Links' },
  ];

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        fetchSectionData();
      }}
    >
      {/* Profile card */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Row style={{ flex: 1, gap: tokens.space.md }}>
          <Avatar name={sessionUser?.email} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.profileTitle}>Admin Operations</Text>
            <Text style={styles.profileSubtitle}>{sessionUser?.email ?? 'Rush Zone Staff'}</Text>
          </View>
        </Row>
        <AppButton variant="danger" label="Sign Out" icon="log-out-outline" onPress={handleLogout} />
      </Card>

      {/* Section nav */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navRow}>
        {sections.map((it) => {
          const active = activeSection === it.key;
          return (
            <Pressable
              key={it.key}
              onPress={() => setActiveSection(it.key)}
              style={[styles.navTab, active && styles.navTabActive]}
            >
              <Ionicons name={SECTION_ICONS[it.key]} size={15} color={active ? tokens.color.onPrimary : tokens.color.secondary} />
              <Text style={[styles.navTabText, active && styles.navTabTextActive]}>{it.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Admins (owner only) */}
      {isOwner && activeSection === 'admins' && (
        <View style={{ gap: tokens.space.md }}>
          <Card>
            <Text style={styles.sectionTitle}>Owner & Admin Access Control</Text>
            <Text style={styles.sectionSubtitle}>Manage staff assignments, Super Keys, and permission authorizations</Text>

            {loading ? (
              <ActivityIndicator color={tokens.color.primary} style={{ marginVertical: 24 }} />
            ) : admins.length === 0 ? (
              <EmptyState icon="shield-checkmark-outline" title="No admin assignments" subtitle="Staff who sign up and verify will appear here for approval" />
            ) : (
              <View style={{ marginTop: tokens.space.sm }}>
                {admins.map((a) => {
                  const isPending = a.status === 'pending';
                  const roleNames = (a.roles ?? [])
                    .map((r: any) => (typeof r === 'string' ? r : r?.name ?? r?.key))
                    .filter(Boolean);
                  return (
                    <View key={a.id} style={styles.itemRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.itemTitle}>{a.email ?? 'Unverified staff'}</Text>
                          <StatusBadge label={adminStatusLabel(a)} tone={adminStatusTone(a.status)} />
                        </View>
                        {a.is_owner ? (
                          <Text style={styles.itemSubtitle}>Owner · full access</Text>
                        ) : (
                          <Text style={styles.itemSubtitle}>
                            {roleNames.length ? roleNames.join(', ') : 'No roles assigned'}
                            {a.credential?.key_version ? ` · Key v${a.credential.key_version}` : ''}
                          </Text>
                        )}
                      </View>
                      {isPending ? (
                        <Row style={{ gap: 6 }}>
                          <AppButton small label="Approve" icon="checkmark-circle-outline" onPress={() => openApproveAdmin(a)} />
                          <AppButton small variant="danger" label="Reject" icon="close-circle-outline" onPress={() => setConfirmRejectAdmin(a)} />
                        </Row>
                      ) : a.is_owner ? null : (
                        <Row style={{ gap: 6 }}>
                          <AppButton small label="Perms" icon="options-outline" onPress={() => openPermModal(a)} />
                          <AppButton small label="Generate" icon="key-outline" onPress={() => setConfirmKeyAction({ type: 'generate', id: a.id })} />
                          <AppButton small variant="secondary" label="Rotate" icon="refresh-outline" onPress={() => setConfirmKeyAction({ type: 'rotate', id: a.id })} />
                          <AppButton small variant="danger" label="Revoke" icon="trash-outline" onPress={() => setConfirmKeyAction({ type: 'revoke', id: a.id })} />
                        </Row>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </Card>
        </View>
      )}

      {/* Content */}
      {activeSection === 'content' && (
        <View style={{ gap: tokens.space.md }}>
          <Card>
            <Text style={styles.sectionTitle}>Global Announcement</Text>
            <FieldLabel>Announcement text</FieldLabel>
            <TextInput value={announcementText} onChangeText={setAnnouncementText} placeholder="e.g. Free Fire Season 5 Tournament Registration is OPEN!" placeholderTextColor={tokens.color.disabled} style={styles.input} />
            <FieldLabel>Target deep link / URL</FieldLabel>
            <TextInput value={announcementLink} onChangeText={setAnnouncementLink} placeholder="e.g. rushzonecontrol://tournaments" placeholderTextColor={tokens.color.disabled} style={styles.input} />
            <AppButton label="Update Announcement" icon="megaphone-outline" onPress={handleSaveAnnouncement} />
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Home Screen Carousel Banners</Text>
            <Text style={styles.sectionSubtitle}>Live preview — upload multiple images, each becomes a slide in the home carousel</Text>
            <BannerSlideshow height={150} />
            <Text style={styles.sectionSubtitle}>Upload an image to the public banners bucket and link it to a promotion</Text>

            <AppButton
              variant="secondary"
              label={uploadingImage ? 'Uploading…' : 'Upload Banner Image'}
              icon="cloud-upload-outline"
              loading={uploadingImage}
              onPress={handlePickAndUploadBanner}
            />

            {bannerPreviewUrl && (
              <View>
                <FieldLabel>Image preview</FieldLabel>
                <Image source={{ uri: bannerPreviewUrl }} style={styles.bannerPreview} resizeMode="contain" />
              </View>
            )}

            <FieldLabel>Banner storage path</FieldLabel>
            <TextInput value={bannerImage} onChangeText={setBannerImage} placeholder="e.g. banners/banner_1718293.webp" placeholderTextColor={tokens.color.disabled} style={styles.input} />

            <FieldLabel>Target link URL (optional)</FieldLabel>
            <TextInput value={bannerLink} onChangeText={setBannerLink} placeholder="e.g. https://rushzone.pk/promo" placeholderTextColor={tokens.color.disabled} style={styles.input} />

            <AppButton
              label={editingBanner ? 'Update Banner' : 'Publish Banner'}
              icon={editingBanner ? 'save-outline' : 'add-circle-outline'}
              loading={processing}
              onPress={handleSaveBanner}
            />
            {editingBanner && (
              <AppButton variant="ghost" label="Cancel edit" icon="close-circle-outline" onPress={cancelEditBanner} />
            )}

            {banners.length > 0 && (
              <View style={{ marginTop: tokens.space.sm }}>
                <Text style={styles.subTitle}>Active banners ({banners.length})</Text>
                {banners.map((b) => (
                  <View key={b.id} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{b.image_path}</Text>
                      {b.link_url && <Text style={styles.itemSubtitle}>Link: {b.link_url}</Text>}
                      <Text style={[styles.itemSubtitle, { color: b.active === false ? tokens.color.disabled : tokens.color.success }]}>
                        {b.active === false ? 'INACTIVE' : 'ACTIVE'}
                      </Text>
                    </View>
                    <View style={{ gap: 6 }}>
                      <Pressable
                        onPress={() => toggleBannerActive(b)}
                        style={[styles.iconBtn, { backgroundColor: b.active === false ? tokens.color.canvas : tokens.color.successSoft, borderColor: b.active === false ? tokens.color.border : tokens.color.success }]}
                      >
                        <Ionicons name={b.active === false ? 'eye-off-outline' : 'eye-outline'} size={15} color={b.active === false ? tokens.color.secondary : tokens.color.success} />
                      </Pressable>
                      <Pressable
                        onPress={() => startEditBanner(b)}
                        style={[styles.iconBtn, { backgroundColor: tokens.color.canvas, borderColor: tokens.color.border }]}
                      >
                        <Ionicons name="create-outline" size={15} color={tokens.color.ink} />
                      </Pressable>
                      <Pressable
                        onPress={() => setConfirmDeleteBanner(b)}
                        style={[styles.iconBtn, { backgroundColor: tokens.color.dangerSoft, borderColor: tokens.color.danger }]}
                      >
                        <Ionicons name="trash-outline" size={15} color={tokens.color.danger} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </View>
      )}

      {/* Push */}
      {activeSection === 'push' && (
        <Card>
          <Text style={styles.sectionTitle}>Push Notification Broadcaster</Text>
          <Text style={styles.sectionSubtitle}>Send high-priority push notifications to registered mobile devices</Text>

          <FieldLabel>Notification scope</FieldLabel>
          <Row style={{ gap: 8, marginVertical: 4 }}>
            {(['broadcast', 'tournament', 'user'] as const).map((t) => (
              <Pressable key={t} onPress={() => setPushTarget(t)} style={[styles.targetBadge, pushTarget === t && styles.targetBadgeActive]}>
                <Text style={[styles.targetBadgeText, pushTarget === t && styles.targetBadgeTextActive]}>{t.toUpperCase()}</Text>
              </Pressable>
            ))}
          </Row>

          {pushTarget !== 'broadcast' && (
            <>
              <FieldLabel>{pushTarget === 'tournament' ? 'Tournament ID' : 'User profile ID'}</FieldLabel>
              <TextInput value={pushTargetId} onChangeText={setPushTargetId} placeholder="Enter target ID…" placeholderTextColor={tokens.color.disabled} style={styles.input} />
            </>
          )}

          <FieldLabel>Notification title *</FieldLabel>
          <TextInput value={pushTitle} onChangeText={setPushTitle} placeholder="e.g. Room Password Released!" placeholderTextColor={tokens.color.disabled} style={styles.input} />

          <FieldLabel>Message body *</FieldLabel>
          <TextInput value={pushBody} onChangeText={setPushBody} placeholder="e.g. The room ID for your match is now available!" multiline placeholderTextColor={tokens.color.disabled} style={[styles.input, { height: 90 }]} />

          <AppButton label="Send Push Notification" icon="notifications-outline" loading={processing} onPress={handleSendPush} />
        </Card>
      )}

      {/* Rewards */}
      {activeSection === 'rewards' && (
        <Card>
          <Text style={styles.sectionTitle}>Streaks & Reward Operations</Text>
          <Text style={styles.sectionSubtitle}>Grant support streak freezes and configure reward parameters</Text>

          <FieldLabel>Grant streak freeze to player</FieldLabel>
          <Row style={{ gap: tokens.space.sm }}>
            <TextInput value={streakFreezeProfile} onChangeText={setStreakFreezeProfile} placeholder="Player profile UUID…" placeholderTextColor={tokens.color.disabled} style={[styles.input, { flex: 1 }]} />
            <AppButton label="Grant Freeze" icon="snow-outline" loading={processing} onPress={handleGrantStreakFreeze} />
          </Row>
        </Card>
      )}

      {/* Audit */}
      {activeSection === 'audit' && (
        <Card>
          <Text style={styles.sectionTitle}>System Audit Logs</Text>
          <Text style={styles.sectionSubtitle}>Immutable historical log of administrative actions</Text>

          {loading ? (
            <ActivityIndicator color={tokens.color.primary} style={{ marginVertical: 24 }} />
          ) : auditLogs.length === 0 ? (
            <EmptyState icon="document-text-outline" title="No audit entries yet" />
          ) : (
            <View style={{ marginTop: tokens.space.sm }}>
              {auditLogs.map((a, idx) => (
                <View key={a.id ?? idx} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{a.action ?? 'Action'}</Text>
                    <Text style={styles.itemSubtitle}>Actor: {a.actor_id ?? 'System'} · {a.entity_type ?? 'N/A'}</Text>
                  </View>
                  <Text style={styles.itemDate}>{a.created_at?.substring(0, 10)}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      )}

      {/* Policies */}
      {activeSection === 'policies' && (
        <PolicyLinks />
      )}

      <ConfirmDialog
        visible={confirmDeleteBanner !== null}
        title="Delete banner?"
        message="This removes the banner from the Home carousel immediately."
        confirmLabel="Delete"
        danger
        loading={processing}
        onCancel={() => setConfirmDeleteBanner(null)}
        onConfirm={handleDeleteBanner}
      />

      {/* Approve admin: pick roles */}
      <Modal visible={approvingAdmin !== null} transparent animationType="fade" onRequestClose={() => setApprovingAdmin(null)}>
        <View style={{ flex: 1, backgroundColor: tokens.color.backdrop, alignItems: 'center', justifyContent: 'center', padding: tokens.space.md }}>
          <View style={{ backgroundColor: tokens.color.surface, borderRadius: tokens.radius.card, borderWidth: 1, borderColor: tokens.color.border, padding: tokens.space.lg, width: '100%', maxWidth: 460, gap: tokens.space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: tokens.color.successSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="shield-checkmark" size={20} color={tokens.color.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: tokens.color.ink }}>Approve admin</Text>
                <Text style={{ fontSize: 13, color: tokens.color.secondary }}>{approvingAdmin?.email ?? 'Staff member'}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 14, color: tokens.color.secondary, marginTop: 6 }}>Assign permission roles. Each role maps to a set of capabilities (tournament management, finance, content, etc.).</Text>
            <View style={{ gap: 4, marginTop: 4 }}>
              {ROLE_OPTIONS.map((r) => {
                const on = !!approveRoles[r.key];
                return (
                  <Pressable
                    key={r.key}
                    onPress={() => setApproveRoles((prev) => ({ ...prev, [r.key]: !prev[r.key] }))}
                    style={[styles.approveRoleRow, { borderColor: on ? tokens.color.primary : tokens.color.border, backgroundColor: on ? tokens.color.creamPanel : tokens.color.canvas }]}
                  >
                    <Ionicons name={on ? 'checkbox' : 'square-outline'} size={18} color={on ? tokens.color.primary : tokens.color.secondary} />
                    <Text style={[styles.approveRoleText, on && { color: tokens.color.ink, fontWeight: '700' }]}>{r.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: tokens.space.sm, marginTop: tokens.space.md }}>
              <AppButton variant="ghost" label="Cancel" onPress={() => setApprovingAdmin(null)} disabled={processing} />
              <AppButton label="Approve & Assign" icon="checkmark-circle-outline" loading={processing} onPress={handleApproveAdmin} />
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={confirmRejectAdmin !== null}
        title="Reject admin application?"
        message={'This rejects ' + (confirmRejectAdmin?.email ?? 'this staff member') + "'s request for admin access. They will no longer be able to verify a Super Key."}
        confirmLabel="Reject"
        danger
        loading={processing}
        onCancel={() => setConfirmRejectAdmin(null)}
        onConfirm={handleRejectAdmin}
      />

      {/* Super Key handoff: owner copies and shares with the admin */}
      <Modal visible={generatedKey !== null} transparent animationType="fade" onRequestClose={() => setGeneratedKey(null)}>
        <View style={{ flex: 1, backgroundColor: tokens.color.backdrop, alignItems: 'center', justifyContent: 'center', padding: tokens.space.md }}>
          <View style={{ backgroundColor: tokens.color.surface, borderRadius: tokens.radius.card, borderWidth: 1, borderColor: tokens.color.border, padding: tokens.space.lg, width: '100%', maxWidth: 460, gap: tokens.space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: tokens.color.creamPanel, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="key" size={20} color={tokens.color.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: tokens.color.ink }}>Super Key ready</Text>
                <Text style={{ fontSize: 13, color: tokens.color.secondary }}>For {generatedKey?.email}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: tokens.color.secondary, lineHeight: 19 }}>
              This key is shown once. Copy it and hand it over securely — the admin enters it at sign-in. It can always be rotated later.
            </Text>
            <View style={{ backgroundColor: tokens.color.canvas, borderWidth: 1, borderColor: tokens.color.border, borderRadius: 10, padding: 14 }}>
              <Text selectable style={{ fontSize: 15, fontWeight: '700', color: tokens.color.ink, letterSpacing: 0.5, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{generatedKey?.key}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: tokens.space.sm, marginTop: tokens.space.sm }}>
              <AppButton variant="ghost" label="Close" onPress={() => setGeneratedKey(null)} />
              <AppButton label="Copy Key" icon="copy-outline" onPress={() => generatedKey && copyText(generatedKey.key)} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Per-admin permission toggles */}
      <Modal visible={permAdmin !== null} transparent animationType="fade" onRequestClose={() => setPermAdmin(null)}>
        <View style={{ flex: 1, backgroundColor: tokens.color.backdrop, alignItems: 'center', justifyContent: 'center', padding: tokens.space.md }}>
          <View style={{ backgroundColor: tokens.color.surface, borderRadius: tokens.radius.card, borderWidth: 1, borderColor: tokens.color.border, padding: tokens.space.lg, width: '100%', maxWidth: 480, gap: tokens.space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: tokens.color.creamPanel, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="options-outline" size={20} color={tokens.color.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: tokens.color.ink }}>Permissions</Text>
                <Text style={{ fontSize: 13, color: tokens.color.secondary }}>{permAdmin?.email ?? 'Admin'}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: tokens.color.secondary, lineHeight: 19 }}>
              Toggle exactly what this admin can do. Saved as a custom permission set on top of their named roles.
            </Text>
            <ScrollView style={{ maxHeight: 340 }}>
              <View style={{ gap: 4 }}>
                {allPermissions.map((p) => {
                  const key = p.key ?? p;
                  const label = p.name ?? key;
                  const on = !!permSelection[key];
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setPermSelection((prev) => ({ ...prev, [key]: !prev[key] }))}
                      style={[styles.approveRoleRow, { borderColor: on ? tokens.color.primary : tokens.color.border, backgroundColor: on ? tokens.color.creamPanel : tokens.color.canvas }]}
                    >
                      <Ionicons name={on ? 'checkbox' : 'square-outline'} size={18} color={on ? tokens.color.primary : tokens.color.secondary} />
                      <Text style={[styles.approveRoleText, on && { color: tokens.color.ink, fontWeight: '700' }]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: tokens.space.sm, marginTop: tokens.space.sm }}>
              <AppButton variant="ghost" label="Cancel" onPress={() => setPermAdmin(null)} disabled={processing} />
              <AppButton label="Save Permissions" icon="checkmark-circle-outline" loading={processing} onPress={handleSavePermissions} />
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={confirmKeyAction !== null}
        title={confirmKeyAction?.type === 'revoke' ? 'Revoke Super Key?' : confirmKeyAction?.type === 'rotate' ? 'Rotate Super Key?' : 'Generate Super Key?'}
        message={
          confirmKeyAction?.type === 'revoke'
            ? 'The current Super Key and all active admin sessions will be invalidated immediately.'
            : confirmKeyAction?.type === 'rotate'
            ? 'The old key will stop working and a new one will be shown once. Sessions are revoked.'
            : 'A new one-time Super Key will be generated. Copy it immediately — it is shown only once.'
        }
        confirmLabel={confirmKeyAction?.type === 'revoke' ? 'Revoke' : 'Continue'}
        danger={confirmKeyAction?.type === 'revoke'}
        loading={processing}
        onCancel={() => setConfirmKeyAction(null)}
        onConfirm={() => {
          if (!confirmKeyAction) return;
          const { type, id } = confirmKeyAction;
          setConfirmKeyAction(null);
          runKeyAction(type, id);
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  profileTitle: { fontSize: 17, fontWeight: '800', color: tokens.color.ink },
  profileSubtitle: { fontSize: 13, color: tokens.color.secondary, marginTop: 2 },
  navRow: { flexDirection: 'row', gap: 8 },
  navTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.surface,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  navTabActive: { backgroundColor: tokens.color.primary, borderColor: tokens.color.primary },
  navTabText: { fontSize: 13, fontWeight: '700', color: tokens.color.secondary },
  navTabTextActive: { color: tokens.color.onPrimary },
  errorBox: { backgroundColor: tokens.color.dangerSoft, borderWidth: 1, borderColor: tokens.color.danger, borderRadius: tokens.radius.card, padding: tokens.space.md },
  errorText: { color: tokens.color.danger, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: tokens.color.ink },
  sectionSubtitle: { fontSize: 13, color: tokens.color.secondary, marginBottom: 8 },
  subTitle: { fontSize: 14, fontWeight: '700', color: tokens.color.ink, marginBottom: 6 },
  input: {
    backgroundColor: tokens.color.canvas,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.input,
    padding: 10,
    color: tokens.color.ink,
    fontSize: 14,
  },
  bannerPreview: { width: '100%', height: 180, borderRadius: tokens.radius.card, marginTop: 4 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.border,
    gap: tokens.space.sm,
  },
  itemTitle: { fontSize: 14, fontWeight: '700', color: tokens.color.ink },
  itemSubtitle: { fontSize: 12, color: tokens.color.secondary, marginTop: 2 },
  itemDate: { fontSize: 11, color: tokens.color.secondary },
  approveRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  approveRoleText: { fontSize: 13, color: tokens.color.secondary, flex: 1 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.canvas,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  targetBadgeActive: { backgroundColor: tokens.color.primary, borderColor: tokens.color.primary },
  targetBadgeText: { fontSize: 11, fontWeight: '700', color: tokens.color.secondary },
  targetBadgeTextActive: { color: tokens.color.onPrimary },
});
