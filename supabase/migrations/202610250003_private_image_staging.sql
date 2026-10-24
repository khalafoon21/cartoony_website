begin;
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values
  ('movie-images', 'movie-images', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('movie-image-staging', 'movie-image-staging', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Signed upload capabilities authorize a single private path. Ordinary visitor
-- policies must never permit reading staging, nor writing either bucket.
drop policy if exists "Private movie staging" on storage.objects;
create policy "Private movie staging" on storage.objects as restrictive
  for all to anon, authenticated
  using (bucket_id <> 'movie-image-staging')
  with check (bucket_id <> 'movie-image-staging');
drop policy if exists "Block public movie image inserts" on storage.objects;
create policy "Block public movie image inserts" on storage.objects as restrictive
  for insert to anon, authenticated with check (bucket_id <> 'movie-images');
drop policy if exists "Block public movie image updates" on storage.objects;
create policy "Block public movie image updates" on storage.objects as restrictive
  for update to anon, authenticated using (bucket_id <> 'movie-images') with check (bucket_id <> 'movie-images');
drop policy if exists "Block public movie image deletes" on storage.objects;
create policy "Block public movie image deletes" on storage.objects as restrictive
  for delete to anon, authenticated using (bucket_id <> 'movie-images');
commit;
