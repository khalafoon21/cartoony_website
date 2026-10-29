-- =============================================================================
-- Cartoony — Phase 20: TMDB Metadata & Duplicate Indexing
-- Migration: 202610260001_tmdb_metadata_index.sql
-- =============================================================================

begin;

-- Safe indexes on metadata->>'tmdb_id' for fast duplicate detection
create index if not exists idx_movies_tmdb_id
  on public.movies (((metadata->>'tmdb_id')));

create index if not exists idx_series_tmdb_id
  on public.series (((metadata->>'tmdb_id')));

create index if not exists idx_episodes_tmdb_id
  on public.episodes (((metadata->>'tmdb_id')));

commit;
