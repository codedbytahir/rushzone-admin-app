-- 0010_content_notifications.sql
-- Banners, notifications, settings (key-value)

create table if not exists app.banners (
  id         uuid primary key default gen_random_uuid(),
  image_path text not null,
  link_url   text,
  sort_order int not null default 0,
  active     boolean not null default true,
  starts_at  timestamptz,
  ends_at    timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_banners_active_order on app.banners(active, sort_order);

create table if not exists app.notifications (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references app.profiles(id) on delete cascade,
  type         notif_type not null,
  title        text not null,
  body         text not null,
  data         jsonb not null default '{}',
  deep_link    text,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_notifications_profile_created on app.notifications (profile_id, created_at desc);
create index if not exists idx_notifications_type on app.notifications(type);

create table if not exists app.settings (
  key         text primary key,
  value       jsonb not null,
  updated_by  uuid references auth.users(id),
  updated_at  timestamptz not null default now()
);

comment on table app.banners is 'Home slider content, managed by admin. Image_path points to Supabase Storage banners bucket.';
comment on table app.notifications is 'Per-user inbox. Written by same transactions that create domain events; push delivery is best-effort.';
comment on table app.settings is 'Single-row-per-key store for feature flags, payment instructions, policy URLs, ad config, version gates.';

drop trigger if exists trg_banners_updated_at on app.banners;
create trigger trg_banners_updated_at before update on app.banners for each row execute function public.handle_updated_at();

drop trigger if exists trg_settings_updated_at on app.settings;
create trigger trg_settings_updated_at before update on app.settings for each row execute function public.handle_updated_at();
