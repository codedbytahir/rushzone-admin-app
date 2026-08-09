-- 0002_enums.sql
-- All enums shared by app + admin. Single source of truth for 01-database-schema.md §2

-- User & admin lifecycle
do $$ begin
  create type user_status as enum ('active','restricted','suspended','banned');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type admin_status as enum ('pending','active','suspended','revoked');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type key_status as enum ('pending','active','locked','revoked');
exception when duplicate_object then null;
end $$;

-- Tournament
do $$ begin
  create type tournament_status as enum (
    'draft','scheduled','registration_open','registration_full','registration_closed',
    'room_released','live','results_pending','completed','cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type reg_status as enum ('confirmed','cancelled','refunded');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type result_status as enum ('draft','published','corrected','void');
exception when duplicate_object then null;
end $$;

-- Wallet
do $$ begin
  create type ledger_direction as enum ('credit','debit','hold','release');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type ledger_type as enum (
    'topup_request','topup_approved','tournament_entry','tournament_refund','slot_refund',
    'prize_award','reward_cost','reward_award','streak_reward','withdrawal_requested',
    'withdrawal_paid','withdrawal_returned','admin_correction','referral_reward','coin_transfer');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type topup_status as enum ('pending','approved','rejected','expired');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type withdrawal_status as enum ('pending_review','approved','paid','rejected','cancelled');
exception when duplicate_object then null;
end $$;

-- Rewards
do $$ begin
  create type reward_source as enum ('ad','paid');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type reward_campaign_status as enum ('active','paused','ended');
exception when duplicate_object then null;
end $$;

-- Notifications
do $$ begin
  create type notif_type as enum (
    'security','registration_confirmed','room_released','tournament_reminder','tournament_changed',
    'result_published','prize_credited','topup_update','withdrawal_update','reward_result',
    'streak_milestone','referral_update','maintenance','broadcast');
exception when duplicate_object then null;
end $$;

-- Moderation
do $$ begin
  create type restriction_type as enum ('entry','rewards','wallet','suspend','ban');
exception when duplicate_object then null;
end $$;
