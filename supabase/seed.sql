-- seed.sql — non-sensitive, re-runnable (on conflict do nothing)
-- Permissions, roles, settings defaults, sample campaign
-- NEVER seed Super Key hash, secret keys, or SMTP creds

-- 1. Permissions
insert into admin.permissions (key, name) values
  ('tournament.create', 'Create Tournament'),
  ('tournament.publish', 'Publish Tournament'),
  ('tournament.cancel', 'Cancel Tournament'),
  ('room.release', 'Release Room Credentials'),
  ('room.manage', 'Manage Room Details'),
  ('result.publish', 'Publish Results'),
  ('result.correct', 'Correct Results'),
  ('topup.review', 'Review Top-ups'),
  ('withdrawal.review', 'Review Withdrawals'),
  ('withdrawal.pay', 'Mark Withdrawal Paid'),
  ('rewards.manage', 'Manage Reward Campaigns'),
  ('streaks.manage', 'Manage Streaks'),
  ('referrals.review', 'Review Referrals'),
  ('content.manage', 'Manage Banners & Content'),
  ('players.restrict', 'Restrict / Moderate Players'),
  ('notifications.send', 'Send Notifications'),
  ('reports.view', 'View Reports & Audit'),
  ('admins.manage', 'Manage Admins & Roles'),
  ('settings.manage', 'Manage Settings'),
  ('cash_ops.toggle', 'Toggle Cash Operations'),
  ('audit.view', 'View Audit Logs')
on conflict (key) do nothing;

-- 2. Roles (suggested groups)
insert into admin.roles (key, name, is_owner) values
  ('tournament_manager', 'Tournament Management', false),
  ('room_ops', 'Room & Match Ops', false),
  ('results_manager', 'Results Manager', false),
  ('topup_reviewer', 'Top-up Reviewer', false),
  ('withdrawal_operator', 'Withdrawal Ops', false),
  ('reward_manager', 'Reward Manager', false),
  ('engagement_manager', 'Engagement (Streaks & Referrals)', false),
  ('content_marketing', 'Content & Marketing', false),
  ('support_moderator', 'Support / Moderation', false),
  ('notification_manager', 'Notifications', false),
  ('reports_viewer', 'Reports Viewer', false),
  ('release_settings', 'Release & Settings', false),
  ('access_admin', 'Access Administration', true) -- owner-only by default
on conflict (key) do nothing;

-- 3. Map roles -> permissions (least privilege)
-- Helper: link by keys (re-runnable: delete then insert)
do $$
declare
  r record; p record;
begin
  -- Tournament Management
  insert into admin.role_permissions (role_id, permission_id)
  select r.id, p.id from admin.roles r, admin.permissions p
  where r.key='tournament_manager' and p.key in ('tournament.create','tournament.publish','tournament.cancel','reports.view')
  on conflict do nothing;

  insert into admin.role_permissions (role_id, permission_id)
  select r.id, p.id from admin.roles r, admin.permissions p
  where r.key='room_ops' and p.key in ('room.manage','room.release','reports.view')
  on conflict do nothing;

  insert into admin.role_permissions (role_id, permission_id)
  select r.id, p.id from admin.roles r, admin.permissions p
  where r.key='results_manager' and p.key in ('result.publish','result.correct','reports.view')
  on conflict do nothing;

  insert into admin.role_permissions (role_id, permission_id)
  select r.id, p.id from admin.roles r, admin.permissions p
  where r.key='topup_reviewer' and p.key in ('topup.review','reports.view')
  on conflict do nothing;

  insert into admin.role_permissions (role_id, permission_id)
  select r.id, p.id from admin.roles r, admin.permissions p
  where r.key='withdrawal_operator' and p.key in ('withdrawal.review','withdrawal.pay','reports.view')
  on conflict do nothing;

  insert into admin.role_permissions (role_id, permission_id)
  select r.id, p.id from admin.roles r, admin.permissions p
  where r.key='reward_manager' and p.key in ('rewards.manage','streaks.manage','reports.view')
  on conflict do nothing;

  insert into admin.role_permissions (role_id, permission_id)
  select r.id, p.id from admin.roles r, admin.permissions p
  where r.key='engagement_manager' and p.key in ('streaks.manage','referrals.review','reports.view')
  on conflict do nothing;

  insert into admin.role_permissions (role_id, permission_id)
  select r.id, p.id from admin.roles r, admin.permissions p
  where r.key='content_marketing' and p.key in ('content.manage','notifications.send')
  on conflict do nothing;

  insert into admin.role_permissions (role_id, permission_id)
  select r.id, p.id from admin.roles r, admin.permissions p
  where r.key='support_moderator' and p.key in ('players.restrict','reports.view')
  on conflict do nothing;

  insert into admin.role_permissions (role_id, permission_id)
  select r.id, p.id from admin.roles r, admin.permissions p
  where r.key='notification_manager' and p.key in ('notifications.send')
  on conflict do nothing;

  insert into admin.role_permissions (role_id, permission_id)
  select r.id, p.id from admin.roles r, admin.permissions p
  where r.key='reports_viewer' and p.key in ('reports.view','audit.view')
  on conflict do nothing;

  insert into admin.role_permissions (role_id, permission_id)
  select r.id, p.id from admin.roles r, admin.permissions p
  where r.key='release_settings' and p.key in ('settings.manage','reports.view')
  on conflict do nothing;

  insert into admin.role_permissions (role_id, permission_id)
  select r.id, p.id from admin.roles r, admin.permissions p
  where r.key='access_admin' and p.key in ('admins.manage','audit.view','settings.manage','cash_ops.toggle')
  on conflict do nothing;
end $$;

-- 4. Settings defaults (on conflict do nothing — preserve owner changes)
insert into app.settings (key, value) values
  ('cash_operations_enabled', 'false'::jsonb),
  ('maintenance_mode', '{"enabled": false, "message": ""}'::jsonb),
  ('whatsapp_support_url', '"https://wa.me/923000000000"'::jsonb),
  ('policy_terms_url', '"https://rushzone.example.com/terms"'::jsonb),
  ('policy_privacy_url', '"https://rushzone.example.com/privacy"'::jsonb),
  ('policy_tournament_rules_url', '"https://rushzone.example.com/rules"'::jsonb),
  ('policy_wallet_url', '"https://rushzone.example.com/wallet"'::jsonb),
  ('policy_reward_terms_url', '"https://rushzone.example.com/rewards"'::jsonb),
  ('withdrawal_config', '{"min_amount": 100, "max_amount": 50000, "fee": 0, "daily_limit": 50000, "enabled": false}'::jsonb),
  ('reward_paid_cost', '5'::jsonb),
  ('streak_config', '{"tiers": [{"days": 3, "coins": 10}, {"days": 7, "coins": 25}, {"days": 14, "coins": 60}, {"days": 30, "coins": 150}], "freeze_enabled": true, "qualifying_actions": ["tournament_join","reward_spin","daily_open"]}'::jsonb),
  ('referral_config', '{"reward_referrer": 0, "reward_referred": 0, "qualifying_trigger": "first_tournament", "max_per_user": 50}'::jsonb),
  ('ad_config', '{"enabled": false, "provider": "unity_levelplay", "test_mode": true}'::jsonb),
  ('featured_tournament_id', 'null'::jsonb),
  ('announcement', '{"text": "", "link": "", "active": false}'::jsonb),
  ('player_min_version', '"1.0.0"'::jsonb),
  ('player_latest_version', '"1.0.0"'::jsonb),
  ('admin_min_version', '"1.0.0"'::jsonb),
  ('admin_latest_version', '"1.0.0"'::jsonb),
  ('force_update', 'false'::jsonb),
  ('dual_approval_threshold', '10000'::jsonb),
  ('file_retention_days', '90'::jsonb)
on conflict (key) do nothing;

-- 5. Default reward campaign (inactive sample, owner reviews and activates)
do $$
declare
  v_campaign uuid;
begin
  if not exists (select 1 from app.reward_campaigns where name='Sample Spin Wheel') then
    insert into app.reward_campaigns (name, status, ad_enabled, paid_enabled, paid_cost, daily_cap, cooldown_secs, global_cap)
    values ('Sample Spin Wheel', 'paused', true, true, 5, 3, 3600, 1000)
    returning id into v_campaign;
    insert into app.reward_items (campaign_id, coins, weight) values
      (v_campaign, 0, 30),
      (v_campaign, 5, 25),
      (v_campaign, 10, 20),
      (v_campaign, 25, 15),
      (v_campaign, 50, 8),
      (v_campaign, 100, 2);
  end if;
end $$;
