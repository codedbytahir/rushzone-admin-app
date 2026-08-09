-- 0016_storage_buckets.sql — Supabase Storage buckets for Rush Zone
-- Buckets: tournament-thumbnails (public), banners (public), avatars (public), payment-proofs (private), admin-docs (private)

-- Create buckets (storage.buckets table is managed; use insert)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('tournament-thumbnails', 'tournament-thumbnails', true, 1048576, array['image/jpeg','image/png','image/webp']),
  ('banners', 'banners', true, 524288, array['image/jpeg','image/png','image/webp']),
  ('avatars', 'avatars', true, 524288, array['image/jpeg','image/png','image/webp']),
  ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('admin-docs', 'admin-docs', false, 10485760, array['image/jpeg','image/png','application/pdf'])
on conflict (id) do nothing;

-- Storage RLS is on storage.objects; define policies

-- Public buckets: public read
create policy "public thumbnails read" on storage.objects for select
using (bucket_id = 'tournament-thumbnails');

create policy "public banners read" on storage.objects for select
using (bucket_id = 'banners');

create policy "public avatars read" on storage.objects for select
using (bucket_id = 'avatars');

-- Admin-only writes for tournament-thumbnails & banners (via Edge Function check, but storage policy as defense-in-depth: only authenticated can insert)
-- In MVP: allow authenticated insert where bucket is public and owner check happens in Edge Function / via file path prefix
create policy "authenticated thumbnails insert" on storage.objects for insert
with check (bucket_id in ('tournament-thumbnails','banners','avatars') and auth.role() = 'authenticated');

create policy "authenticated thumbnails update" on storage.objects for update
using (bucket_id in ('tournament-thumbnails','banners','avatars') and auth.role() = 'authenticated');

create policy "authenticated thumbnails delete" on storage.objects for delete
using (bucket_id in ('tournament-thumbnails','banners','avatars') and auth.role() = 'authenticated');

-- Private buckets: no public policies — only service_role/secret key via Edge Functions can create signed URLs
-- No storage.objects policies for payment-proofs / admin-docs => blocked for anon/authenticated, only secret key can read.

-- Enable RLS is already enabled on storage.objects by Supabase

comment on table storage.buckets is 'Rush Zone buckets. Public: tournament-thumbnails, banners, avatars. Private: payment-proofs, admin-docs (signed URLs only).';
