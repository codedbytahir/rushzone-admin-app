import { supabase, callEdgeFunction } from "./supabase";

// Serialize query params, dropping undefined/null/empty values so URLs never
// end up with ?status=undefined&q=undefined.
function queryString(params?: Record<string, any>): string {
  if (!params) return "";
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const api = {
  verifySuperKey: async (superKey: string) => {
    const { data: session } = await supabase.auth.getSession();
    return callEdgeFunction<{ ok: boolean; assignment_id: string; is_owner: boolean; permissions: string[] }>("admin-auth-verify", { body: { super_key: superKey }, jwt: session.session?.access_token });
  },
  getMyAssignment: async () => callEdgeFunction<any>("admin-assignments-me"),
  requestAdminAccess: async (requested_role?: string) => callEdgeFunction<any>("admin-request-access", { body: { requested_role: requested_role ?? "" } }),
  listPermissions: async () => callEdgeFunction<any>("admin-permissions-list"),
  updateAdminPermissions: async (assignment_id: string, permission_keys: string[]) => callEdgeFunction<any>("admin-permissions-update", { body: { assignment_id, permission_keys } }),
  bootstrapOwner: async (secret: string) => {
    const { data: session } = await supabase.auth.getSession();
    return fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/owner-bootstrap`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session?.access_token}`, "x-bootstrap-secret": secret }, body: JSON.stringify({ bootstrap_secret: secret }) }).then((r) => r.json());
  },
  listAdmins: async (status?: string) => callEdgeFunction<any>("owner-admins-list" + (status ? `?status=${status}` : "")),
  approveAdmin: async (assignment_id: string, role_keys: string[]) => callEdgeFunction<any>("owner-admins-approve", { body: { assignment_id, role_keys } }),
  rejectAdmin: async (assignment_id: string) => callEdgeFunction<any>("owner-admins-reject", { body: { assignment_id } }),
  generateKey: async (assignment_id: string) => callEdgeFunction<{ ok: boolean; super_key: string; key_version: number }>("owner-admins-generate-key", { body: { assignment_id } }),
  rotateKey: async (assignment_id: string) => callEdgeFunction<{ ok: boolean; super_key: string }>("owner-admins-rotate-key", { body: { assignment_id } }),
  revokeKey: async (assignment_id: string) => callEdgeFunction<any>("owner-admins-revoke-key", { body: { assignment_id } }),
  revokeSession: async (opts: { session_id?: string; assignment_id?: string }) => callEdgeFunction<any>("owner-admins-revoke-session", { body: opts }),
  listTournaments: async (params?: { status?: string; q?: string; limit?: number; offset?: number }) =>
    callEdgeFunction<any>(`admin-tournaments-list${queryString(params)}`),
  createTournament: async (payload: any) => callEdgeFunction<any>("admin-tournaments-create", { body: payload }),
  updateTournament: async (payload: any) => callEdgeFunction<any>("admin-tournaments-update", { body: payload }),
  cancelTournament: async (id: string, reason: string, outcome?: string) => callEdgeFunction<any>("admin-tournaments-cancel", { body: { id, reason, outcome } }),
  listPresets: async () => callEdgeFunction<any>("admin-tournaments-preset?action=list"),
  savePreset: async (payload: any) => callEdgeFunction<any>("admin-tournaments-preset?action=save", { body: payload }),
  applyPreset: async (preset_id: string, overrides?: any) => callEdgeFunction<any>("admin-tournaments-preset?action=apply", { body: { preset_id, ...overrides } }),
  getEntrants: async (tournament_id: string) => callEdgeFunction<any>(`admin-tournaments-entrants?tournament_id=${tournament_id}`),
  assignRoster: async (registration_id: string, roster_id: string | null) => callEdgeFunction<any>("admin-tournaments-assign-roster", { body: { registration_id, roster_id } }),
  setRoom: async (payload: { tournament_id: string; room_id: string; room_password: string; server_region?: string; instructions?: string; release_at?: string }) => callEdgeFunction<any>("admin-tournaments-set-room", { body: payload }),
  releaseRoom: async (tournament_id: string) => callEdgeFunction<any>("admin-tournaments-release-room", { body: { tournament_id } }),
  getResults: async (tournament_id: string) => callEdgeFunction<any>(`admin-results-get?tournament_id=${tournament_id}`),
  saveResultsDraft: async (tournament_id: string, results: any[]) => callEdgeFunction<any>("admin-results-save-draft", { body: { tournament_id, results } }),
  previewResults: async (tournament_id: string) => callEdgeFunction<any>(`admin-results-preview?tournament_id=${tournament_id}`),
  publishResults: async (tournament_id: string) => callEdgeFunction<any>("admin-results-publish", { body: { tournament_id } }),
  correctResult: async (payload: { result_id: string; kills?: number; placement?: number; points?: number; prize_coins?: number; reason: string }) => callEdgeFunction<any>("admin-results-correct", { body: payload }),
  getRoom: async (tournament_id: string) => callEdgeFunction<any>(`tournaments-room?tournament_id=${tournament_id}`),
  createTopup: async (payload: { method: string; amount_coins: number; reference: string }) => callEdgeFunction<any>("wallet-topup-create", { body: payload }),
  listTopups: async (params?: { status?: string; method?: string; risk?: string; limit?: number; offset?: number }) =>
    callEdgeFunction<any>(`admin-topups-list${queryString(params)}`),
  reviewTopup: async (id: string, decision: "approve" | "reject", reason?: string, override?: boolean) => callEdgeFunction<any>("admin-topups-review", { body: { id, decision, reason, override } }),
  createWithdrawal: async (payload: { amount_coins: number; method: string; account: string }) => callEdgeFunction<any>("wallet-withdraw-create", { body: payload }),
  cancelWithdrawal: async (id: string) => callEdgeFunction<any>("wallet-withdraw-cancel", { body: { id } }),
  listWithdrawals: async (params?: { status?: string; limit?: number; offset?: number }) =>
    callEdgeFunction<any>(`admin-withdrawals-list${queryString(params)}`),
  approveWithdrawal: async (id: string) => callEdgeFunction<any>("admin-withdrawals-approve", { body: { id } }),
  markWithdrawalPaid: async (id: string, payout_ref: string, second_reviewer?: string) => callEdgeFunction<any>("admin-withdrawals-mark-paid", { body: { id, payout_ref, second_reviewer } }),
  rejectWithdrawal: async (id: string, reason: string) => callEdgeFunction<any>("admin-withdrawals-reject", { body: { id, reason } }),
  correctWallet: async (payload: { profile_id: string; amount: number; direction: "credit" | "debit"; reason: string }) => callEdgeFunction<any>("admin-wallet-correct", { body: payload }),
  listRewardCampaigns: async () => callEdgeFunction<any>("admin-rewards-campaigns"),
  getRewardCampaign: async (id: string) => callEdgeFunction<any>(`admin-rewards-campaigns?id=${id}`),
  createRewardCampaign: async (payload: any) => callEdgeFunction<any>("admin-rewards-campaigns", { body: { action: "create", ...payload } }),
  updateRewardCampaign: async (payload: any) => callEdgeFunction<any>("admin-rewards-campaigns", { body: { action: "update", ...payload } }),
  pauseRewardCampaign: async (id: string) => callEdgeFunction<any>("admin-rewards-campaigns", { body: { action: "pause", id } }),
  rewardDashboard: async () => callEdgeFunction<any>("admin-rewards-dashboard"),
  attemptPaidReward: async (campaign_id: string) => callEdgeFunction<any>("rewards-attempt-paid", { body: { campaign_id } }),
  getStreakConfig: async () => callEdgeFunction<any>("admin-streaks-config"),
  updateStreakConfig: async (config: any) => callEdgeFunction<any>("admin-streaks-config", { body: { config } }),
  grantStreakFreeze: async (profile_id: string) => callEdgeFunction<any>("admin-streaks-grant-freeze", { body: { profile_id } }),
  getReferralConfig: async () => callEdgeFunction<any>("admin-referrals-config"),
  updateReferralConfig: async (config: any) => callEdgeFunction<any>("admin-referrals-config", { body: { config } }),
  listReferrals: async (status?: string) => callEdgeFunction<any>("admin-referrals-list" + (status ? `?status=${status}` : "")),
  reviewReferral: async (id: string, decision: "approve" | "hold" | "reject") => callEdgeFunction<any>("admin-referrals-review", { body: { id, decision } }),
  recordShare: async (payload: { card_type: string; channel?: string; ref_type?: string; ref_id?: string }) => callEdgeFunction<any>("share-event", { body: payload }),
  shareReport: async () => callEdgeFunction<any>("admin-share-report"),
  searchPlayers: async (q: string) => callEdgeFunction<any>(`admin-players-search?q=${encodeURIComponent(q)}`),
  getPlayer: async (profile_id: string) => callEdgeFunction<any>(`admin-players-get?profile_id=${profile_id}`),
  addPlayerNote: async (profile_id: string, body: string) => callEdgeFunction<any>("admin-players-note", { body: { profile_id, body } }),
  restrictPlayer: async (payload: { profile_id: string; type: "entry" | "rewards" | "wallet" | "suspend" | "ban"; reason: string; expires_at?: string; lift?: boolean }) => callEdgeFunction<any>("admin-players-restrict", { body: payload }),
  listBanners: async () => callEdgeFunction<any>("admin-content-banners"),
  createBanner: async (payload: { image_path: string; link_url?: string; sort_order?: number; active?: boolean }) => callEdgeFunction<any>("admin-content-banners", { body: { action: "create", ...payload } }),
  updateBanner: async (payload: any) => callEdgeFunction<any>("admin-content-banners", { body: { action: "update", ...payload } }),
  deleteBanner: async (id: string) => callEdgeFunction<any>("admin-content-banners", { body: { action: "delete", id } }),
  getAnnouncement: async () => callEdgeFunction<any>("admin-content-announcement"),
  updateAnnouncement: async (payload: { text: string; link?: string; active: boolean }) => callEdgeFunction<any>("admin-content-announcement", { body: payload }),
  getFeatured: async () => callEdgeFunction<any>("admin-content-featured"),
  setFeatured: async (tournament_id: string | null) => callEdgeFunction<any>("admin-content-featured", { body: { tournament_id } }),
  sendNotification: async (payload: { title: string; body: string; type?: string; profile_id?: string; tournament_id?: string; broadcast?: boolean; confirm?: boolean; deep_link?: string }) => callEdgeFunction<any>("admin-notifications-send", { body: payload }),
  queryAudit: async (params?: { action?: string; actor_id?: string; entity_type?: string; limit?: number; offset?: number; since?: string }) =>
    callEdgeFunction<any>(`admin-audit-query${queryString(params)}`),
  getReports: async () => callEdgeFunction<any>("admin-reports"),
  getSettings: async (key?: string) => callEdgeFunction<any>(`admin-settings${key ? `?key=${key}` : ""}`),
  updateSetting: async (key: string, value: any) => callEdgeFunction<any>("admin-settings", { body: { key, value } }),
  getPolicyLinks: async () => callEdgeFunction<any>("admin-settings?key=policy_links"),
  savePolicyLinks: async (links: Array<{ id: string; label: string; url: string }>) => callEdgeFunction<any>("admin-settings", { body: { key: "policy_links", value: links } }),
  checkReconciliation: async () => callEdgeFunction<any>("admin-reconciliation"),
  getAppConfig: async () => callEdgeFunction<any>("app-config"),
  registerPushToken: async (token: string, platform?: string) => callEdgeFunction<any>("push-token-register", { body: { token, platform } }),
  getSignedUrl: async (bucket: string, path: string, expires?: number) => callEdgeFunction<any>(`storage-signed-url?bucket=${bucket}&path=${encodeURIComponent(path)}${expires ? `&expires=${expires}` : ""}`),
  getVersion: async () => callEdgeFunction<any>("app-version"),
};
