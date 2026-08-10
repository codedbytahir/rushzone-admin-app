// src/types/api.ts — Typed response shapes for the admin app's edge function calls.
// Field names mirror the backend (app.* tables / edge function responses).

export interface Tournament {
  id: string;
  title: string;
  description?: string | null;
  internal_notes?: string | null;
  cover_path?: string | null;
  mode: string;
  map?: string | null;
  rounds: number;
  capacity: number;
  entry_fee: number;
  prize_pool: number;
  prize_distribution?: unknown[];
  score_rules?: Record<string, unknown>;
  rules_text?: string | null;
  status: string;
  reg_open_at?: string | null;
  reg_close_at?: string | null;
  match_start_at?: string | null;
  room_release_at?: string | null;
  result_expected_at?: string | null;
  is_preset?: boolean;
  preset_key?: string | null;
  free_slot_enabled?: boolean;
  free_slot_trigger?: 'slots_full' | 'match_start';
  free_slot_number?: number | null;
  free_slot_awarded_at?: string | null;
  created_by?: string | null;
  published_at?: string | null;
  created_at?: string;
  entry_count?: number;
}

export interface TopupRequest {
  id: string;
  profile_id: string;
  method: string;
  amount_coins: number;
  reference: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  proof_path?: string | null;
  risk_flag?: string | null;
  risk_flags?: unknown[];
  reject_reason?: string | null;
  reviewed_at?: string | null;
  created_at?: string;
  whatsapp_masked?: string | null;
}

export interface WithdrawalRequest {
  id: string;
  profile_id: string;
  method: string;
  account?: string | null;
  account_snapshot?: string | null;
  amount_coins: number;
  status: 'pending_review' | 'approved' | 'paid' | 'rejected' | 'cancelled';
  payout_ref?: string | null;
  reject_reason?: string | null;
  risk_flag?: string | null;
  second_reviewer?: string | null;
  created_at?: string;
  whatsapp_masked?: string | null;
}

export interface ReportSummary {
  tournaments: { total: number; active?: number };
  registrations: { confirmed: number; cancelled: number; refunded: number };
  topups: { pending: number; approved_amount: number };
  withdrawals: { pending_review: number; paid_amount: number; held_amount: number };
  wallet: { liability: number; held: number; ledger_entries: number };
  prizes: { total_awarded: number };
  rewards: { total_coins: number };
}

export interface PlayerSearchResult {
  id: string;
  display_name: string;
  app_uid?: string;
  ff_uid?: string;
  in_game_name?: string;
  whatsapp_phone_masked?: string | null;
  status: string;
  created_at?: string;
}

export interface PlayerStats {
  tournaments_joined: number;
  completed_events: number;
  wins: number;
  top_placements: number;
  total_kills: number;
  total_prize_coins: number;
}

export interface PlayerWallet {
  balances: { available_balance: number; held_balance: number } | null;
  ledger: unknown[];
}

export interface PlayerDetail {
  profile: {
    id: string;
    display_name: string;
    email?: string;
    app_uid?: string;
    ff_uid?: string;
    in_game_name?: string;
    whatsapp_phone_masked?: string | null;
    status: string;
    created_at?: string;
  } | null;
  stats: PlayerStats | null;
  registrations: unknown[];
  results: unknown[];
  notes: { id: string; body: string; author_id?: string | null; created_at?: string }[];
  restrictions: unknown[];
  risk_flags: unknown[];
  wallet: PlayerWallet | null;
}

export interface AuditLogEntry {
  id: number;
  action: string;
  actor_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  reason?: string | null;
  created_at: string;
}

export interface Entrant {
  id: string;
  profile_id: string;
  status: string;
  slot_number?: number | null;
  roster_id?: string | null;
  display_name?: string;
  app_uid?: string;
  in_game_name?: string;
  ff_uid?: string;
  whatsapp_masked?: string | null;
  roster_label?: string | null;
}

export interface ResultRow {
  id: string;
  profile_id: string;
  display_name?: string;
  kills: number;
  placement?: number | null;
  points: number;
  is_dq: boolean;
  prize_coins: number;
  status: string;
}

export interface Roster {
  id: string;
  tournament_id: string;
  label: string;
  capacity: number;
  member_count?: number;
}
