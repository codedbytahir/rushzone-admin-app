import { supabase, callEdgeFunction } from "./supabase";
export const api = {
  verifySuperKey: async (superKey: string) => {
    const { data: session } = await supabase.auth.getSession();
    return callEdgeFunction<{ ok: boolean; assignment_id: string; is_owner: boolean; permissions: string[] }>("admin-auth-verify", { body: { super_key: superKey }, jwt: session.session?.access_token });
  },
  getMyAssignment: async () => callEdgeFunction<any>("admin-assignments-me"),
  bootstrapOwner: async (secret: string) => {
    const { data: session } = await supabase.auth.getSession();
    return fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/owner-bootstrap`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session?.access_token}`, "x-bootstrap-secret": secret }, body: JSON.stringify({ bootstrap_secret: secret }) }).then((r) => r.json());
  },
  listAdmins: async (status?: string) => callEdgeFunction<any>("owner-admins-list" + (status ? `?status=${status}` : "")),
  approveAdmin: async (assignment_id: string, role_keys: string[]) => callEdgeFunction<any>("owner-admins-approve", { body: { assignment_id, role_keys } }),
  generateKey: async (assignment_id: string) => callEdgeFunction<{ ok: boolean; super_key: string; key_version: number }>("owner-admins-generate-key", { body: { assignment_id } }),
  rotateKey: async (assignment_id: string) => callEdgeFunction<{ ok: boolean; super_key: string }>("owner-admins-rotate-key", { body: { assignment_id } }),
  revokeKey: async (assignment_id: string) => callEdgeFunction<any>("owner-admins-revoke-key", { body: { assignment_id } }),
  revokeSession: async (opts: { session_id?: string; assignment_id?: string }) => callEdgeFunction<any>("owner-admins-revoke-session", { body: opts }),
  listTournaments: async (params?: { status?: string; q?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams(params as any).toString();
    return callEdgeFunction<any>(`admin-tournaments-list${q ? `?${q}` : ""}`);
  },
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
  getVersion: async () => callEdgeFunction<{ min_version: string; latest_version: string; force_update: boolean; maintenance: boolean }>("app/version"),
};
