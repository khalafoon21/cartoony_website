-- =============================================================================
-- Cartoony — Phase 17: Advanced Admin Dashboard & Playback Analytics
-- Migration: 202610250005_admin_dashboard_analytics.sql
-- =============================================================================

begin;

-- 1. Create playback_events table for tracking actual playback starts
create table if not exists public.playback_events (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('movie', 'episode')),
  content_id uuid not null,
  series_id uuid references public.series(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 2. Indexes for efficient dashboard aggregation
create index if not exists idx_playback_events_content on public.playback_events(content_type, content_id);
create index if not exists idx_playback_events_created_at on public.playback_events(created_at desc);
create index if not exists idx_playback_events_series_id on public.playback_events(series_id) where series_id is not null;

-- 3. Row Level Security
alter table public.playback_events enable row level security;

-- Drop old policies if any
drop policy if exists "Service role full access on playback_events" on public.playback_events;
drop policy if exists "No public access on playback_events" on public.playback_events;

-- Service role has full access (used by server-side endpoints and admin dashboard)
create policy "Service role full access on playback_events"
  on public.playback_events
  for all
  using (true)
  with check (true);

commit;
