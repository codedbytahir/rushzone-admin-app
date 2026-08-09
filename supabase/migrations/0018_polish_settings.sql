create table if not exists app.push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references app.profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('android','ios','web')),
  device text,
  created_at timestamptz not null default now(),
  unique (profile_id, token)
);
create index if not exists idx_push_tokens_profile on app.push_tokens(profile_id);
alter table app.push_tokens enable row level security;
drop policy if exists "push_self_all" on app.push_tokens;
create policy "push_self_all" on app.push_tokens for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
insert into app.settings (key, value) values
  ('landing_page_url', '"https://rushzone.example.com"'::jsonb),
  ('home_page_url', '"https://rushzone.example.com"'::jsonb),
  ('about_app_url', '"https://rushzone.example.com/about"'::jsonb),
  ('support_email', '"support@rushzone.example.com"'::jsonb),
  ('app_store_url', '""'::jsonb),
  ('play_store_url', '""'::jsonb),
  ('social_telegram', '""'::jsonb),
  ('social_discord', '""'::jsonb),
  ('social_instagram', '""'::jsonb),
  ('social_youtube', '""'::jsonb)
on conflict (key) do nothing;
