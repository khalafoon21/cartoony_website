-- =============================================================================
-- Cartoony — Phase 16: Dynamic Homepage & Site Settings
-- Migration: 202610250004_homepage_settings.sql
-- =============================================================================

begin;

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.site_settings enable row level security;

-- Drop old policies if any
drop policy if exists "Public can read site settings" on public.site_settings;
drop policy if exists "Service role can manage site settings" on public.site_settings;

-- Public can read site settings
create policy "Public can read site settings"
  on public.site_settings
  for select
  using (true);

-- Admin with service role can manage site settings
create policy "Service role can manage site settings"
  on public.site_settings
  for all
  using (true)
  with check (true);

commit;
