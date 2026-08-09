do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
    ('tournament-thumbnails', 'tournament-thumbnails', true, 1048576, array['image/jpeg','image/png','image/webp']),
    ('banners', 'banners', true, 524288, array['image/jpeg','image/png','image/webp']),
    ('avatars', 'avatars', true, 524288, array['image/jpeg','image/png','image/webp']),
    ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf']),
    ('admin-docs', 'admin-docs', false, 10485760, array['image/jpeg','image/png','application/pdf'])
  on conflict (id) do nothing;
exception when insufficient_privilege then
  raise notice 'Skipping storage.buckets insert — create buckets manually in Dashboard → Storage if hosted';
  when others then
  raise notice 'Buckets insert skipped: %', sqlerrm;
end $$;
do $$
begin
  create policy "public thumbnails read" on storage.objects for select using (bucket_id = 'tournament-thumbnails');
exception when duplicate_object then null;
  when insufficient_privilege then raise notice 'Skipping storage policy — insufficient_privilege';
end $$;
do $$
begin
  create policy "public banners read" on storage.objects for select using (bucket_id = 'banners');
exception when duplicate_object then null;
  when insufficient_privilege then raise notice 'Skipping policy';
end $$;
do $$
begin
  create policy "public avatars read" on storage.objects for select using (bucket_id = 'avatars');
exception when duplicate_object then null;
  when insufficient_privilege then raise notice 'Skipping policy';
end $$;
do $$
begin
  create policy "authenticated thumbnails insert" on storage.objects for insert with check (bucket_id in ('tournament-thumbnails','banners','avatars') and auth.role() = 'authenticated');
exception when duplicate_object then null;
  when insufficient_privilege then raise notice 'Skipping policy';
end $$;
do $$
begin
  create policy "authenticated thumbnails update" on storage.objects for update using (bucket_id in ('tournament-thumbnails','banners','avatars') and auth.role() = 'authenticated');
exception when duplicate_object then null;
  when insufficient_privilege then raise notice 'Skipping policy';
end $$;
do $$
begin
  create policy "authenticated thumbnails delete" on storage.objects for delete using (bucket_id in ('tournament-thumbnails','banners','avatars') and auth.role() = 'authenticated');
exception when duplicate_object then null;
  when insufficient_privilege then raise notice 'Skipping policy';
end $$;
