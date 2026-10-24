-- =============================================================================
-- Cartoony — Phase 11: Supabase Storage Bucket & Policies for Movie Images
-- Migration: 202610250001_movie_images_storage.sql
-- =============================================================================

begin;

-- 1. Create or update the public `movie-images` bucket (5 MB limit, JPEG/PNG/WebP only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'movie-images',
  'movie-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. Storage RLS Policies:
-- Public visitors (anon, authenticated) may ONLY read (SELECT) objects in `movie-images`.
-- All uploads (INSERT), replacements (UPDATE), and deletions (DELETE) are restricted
-- to the server-side admin flow using SUPABASE_SECRET_KEY.
drop policy if exists "Public read movie images" on storage.objects;
create policy "Public read movie images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'movie-images');

-- Restrictive guards also block writes granted by unrelated permissive policies.
drop policy if exists "Block public movie image inserts" on storage.objects;
create policy "Block public movie image inserts" on storage.objects
  as restrictive for insert to anon, authenticated
  with check (bucket_id <> 'movie-images');
drop policy if exists "Block public movie image updates" on storage.objects;
create policy "Block public movie image updates" on storage.objects
  as restrictive for update to anon, authenticated
  using (bucket_id <> 'movie-images') with check (bucket_id <> 'movie-images');
drop policy if exists "Block public movie image deletes" on storage.objects;
create policy "Block public movie image deletes" on storage.objects
  as restrictive for delete to anon, authenticated
  using (bucket_id <> 'movie-images');

commit;
