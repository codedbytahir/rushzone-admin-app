// types/database.types.ts — Generated via `supabase gen types typescript --local > types/database.types.ts`
// Foundation placeholder: real types are generated after `supabase start` + `supabase db reset`.
// This stub lets the app compile until the local DB is running.

// Run: supabase gen types typescript --project-ref <ref> > types/database.types.ts
// Or local: supabase gen types typescript --local > types/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: { Tables: Record<string, any>; Views: Record<string, any>; Functions: Record<string, any>; Enums: Record<string, any> };
  app: {
    Tables: {
      profiles: { Row: any; Insert: any; Update: any };
      wallet_accounts: { Row: { profile_id: string; available_balance: number; held_balance: number; version: number }; Insert: any; Update: any };
      wallet_ledger: { Row: any; Insert: any; Update: any };
      tournaments: { Row: any; Insert: any; Update: any };
      registrations: { Row: any; Insert: any; Update: any };
      rooms: { Row: any; Insert: any; Update: any };
      match_results: { Row: any; Insert: any; Update: any };
      prize_awards: { Row: any; Insert: any; Update: any };
      topup_requests: { Row: any; Insert: any; Update: any };
      withdrawal_requests: { Row: any; Insert: any; Update: any };
      reward_campaigns: { Row: any; Insert: any; Update: any };
      notifications: { Row: any; Insert: any; Update: any };
      banners: { Row: any; Insert: any; Update: any };
      settings: { Row: { key: string; value: Json }; Insert: any; Update: any };
    };
    Views: Record<string, any>;
    Functions: {
      wallet_credit: { Args: { p_profile_id: string; p_amount: number; p_type: string; p_reference_type: string; p_reference_id: string; p_idempotency_key: string }; Returns: number };
      wallet_debit: { Args: { p_profile_id: string; p_amount: number; p_type: string; p_reference_type: string; p_reference_id: string; p_idempotency_key: string }; Returns: number };
    };
    Enums: Record<string, any>;
  };
  admin: {
    Tables: {
      assignments: { Row: any; Insert: any; Update: any };
      roles: { Row: any; Insert: any; Update: any };
      permissions: { Row: any; Insert: any; Update: any };
      security_credentials: { Row: any; Insert: any; Update: any };
    };
    Views: Record<string, any>;
    Functions: Record<string, any>;
    Enums: Record<string, any>;
  };
  audit: {
    Tables: { logs: { Row: any; Insert: any; Update: any } };
    Views: Record<string, any>;
    Functions: Record<string, any>;
    Enums: Record<string, any>;
  };
};
