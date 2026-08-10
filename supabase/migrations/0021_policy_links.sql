-- 0021_policy_links.sql
-- Policy links now live as a single editable JSON array under app.settings['policy_links'].
-- The admin app (More -> Policy Links) edits/adds/deletes rows and saves the whole list;
-- app-config serves it to clients. Defaults mirror the individual policy_*_url keys so
-- nothing changes for existing installs that already set them.

insert into app.settings (key, value) values
  ('policy_links', jsonb_build_array(
    jsonb_build_object('id', 'terms',             'label', 'Terms',             'url', coalesce((select value #>> '{}' from app.settings where key = 'policy_terms_url'), 'https://rushzone.example.com/terms')),
    jsonb_build_object('id', 'privacy',           'label', 'Privacy',           'url', coalesce((select value #>> '{}' from app.settings where key = 'policy_privacy_url'), 'https://rushzone.example.com/privacy')),
    jsonb_build_object('id', 'tournament_rules',  'label', 'Tournament Rules',  'url', coalesce((select value #>> '{}' from app.settings where key = 'policy_tournament_rules_url'), 'https://rushzone.example.com/rules')),
    jsonb_build_object('id', 'wallet',            'label', 'Wallet',            'url', coalesce((select value #>> '{}' from app.settings where key = 'policy_wallet_url'), 'https://rushzone.example.com/wallet')),
    jsonb_build_object('id', 'rewards',           'label', 'Rewards',           'url', coalesce((select value #>> '{}' from app.settings where key = 'policy_reward_terms_url'), 'https://rushzone.example.com/rewards'))
  ))
on conflict (key) do nothing;
