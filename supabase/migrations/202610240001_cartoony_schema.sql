-- =============================================================================
-- Cartoony — Phase 8: Supabase PostgreSQL Foundation Schema
-- Migration: 202610240001_cartoony_schema.sql
-- =============================================================================

begin;

create extension if not exists pgcrypto;

-- 1. Enumerated Types
do $$
begin
  if not exists (select 1 from pg_type where typname = 'publication_status') then
    create type public.publication_status as enum ('draft', 'published', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'audio_type') then
    create type public.audio_type as enum ('dubbed', 'subtitled');
  end if;

  if not exists (select 1 from pg_type where typname = 'art_theme') then
    create type public.art_theme as enum ('forest', 'space', 'ocean', 'desert', 'sky');
  end if;
end
$$;

-- 2. Automatic `updated_at` Timestamp Trigger Function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3. Categories Table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title_ar text not null,
  title_original text not null,
  description_ar text not null default '',
  icon_symbol text not null default 'compass',
  light_color text not null default '#676249',
  dark_color text not null default '#2C3D3B',
  display_order integer not null default 0,
  status public.publication_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Movies Table
create table if not exists public.movies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    constraint movies_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title_ar text not null,
  subtitle_ar text not null default '',
  title_original text not null,
  franchise_ar text not null default '',
  description_ar text not null,
  poster_url text,
  backdrop_url text,
  release_year smallint not null
    constraint movies_release_year_check check (release_year between 1920 and 2100),
  duration_minutes smallint not null default 85
    constraint movies_duration_check check (duration_minutes > 0),
  duration_label_ar text not null default '',
  age_rating text not null default '6+',
  rating numeric(3, 1) not null default 8.0
    constraint movies_rating_check check (rating between 0.0 and 10.0),
  audio_badge public.audio_type not null default 'dubbed',
  theme public.art_theme not null default 'forest',
  accent_color text not null default '#F5A623',
  is_featured boolean not null default false,
  is_most_watched boolean not null default false,
  is_recently_added boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  status public.publication_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Series Table
create table if not exists public.series (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    constraint series_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title_ar text not null,
  subtitle_ar text not null default '',
  title_original text not null,
  franchise_ar text not null default '',
  description_ar text not null,
  poster_url text,
  backdrop_url text,
  release_year smallint not null
    constraint series_release_year_check check (release_year between 1920 and 2100),
  age_rating text not null default '6+',
  rating numeric(3, 1) not null default 8.0
    constraint series_rating_check check (rating between 0.0 and 10.0),
  audio_badge public.audio_type not null default 'dubbed',
  theme public.art_theme not null default 'desert',
  accent_color text not null default '#F5A623',
  is_featured boolean not null default false,
  is_most_watched boolean not null default false,
  is_recently_added boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  status public.publication_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Seasons Table
create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null
    references public.series(id) on delete cascade,
  season_number smallint not null
    constraint seasons_number_check check (season_number > 0),
  slug text not null unique
    constraint seasons_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title_ar text not null,
  title_original text not null default '',
  description_ar text not null default '',
  poster_url text,
  release_year smallint
    constraint seasons_release_year_check check (release_year is null or release_year between 1920 and 2100),
  metadata jsonb not null default '{}'::jsonb,
  status public.publication_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_series_number_unique unique (series_id, season_number)
);

-- 7. Episodes Table
create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null
    references public.series(id) on delete cascade,
  season_id uuid not null
    references public.seasons(id) on delete cascade,
  episode_number smallint not null
    constraint episodes_number_check check (episode_number > 0),
  slug text not null unique
    constraint episodes_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title_ar text not null,
  title_original text not null default '',
  description_ar text not null default '',
  still_url text,
  duration_minutes smallint not null default 22
    constraint episodes_duration_check check (duration_minutes > 0),
  audio_badge public.audio_type not null default 'dubbed',
  metadata jsonb not null default '{}'::jsonb,
  status public.publication_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint episodes_season_number_unique unique (season_id, episode_number)
);

-- 8. Content-Category Relationship Tables (Explicit Foreign Keys)
create table if not exists public.movie_categories (
  movie_id uuid not null
    references public.movies(id) on delete cascade,
  category_id uuid not null
    references public.categories(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (movie_id, category_id)
);

create table if not exists public.series_categories (
  series_id uuid not null
    references public.series(id) on delete cascade,
  category_id uuid not null
    references public.categories(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (series_id, category_id)
);

-- 9. Indexes for Query Performance
create index if not exists idx_categories_status_order
  on public.categories (status, display_order);

create index if not exists idx_movies_status_release
  on public.movies (status, release_year desc);

create index if not exists idx_movies_flags
  on public.movies (status, is_featured, is_most_watched, is_recently_added);

create index if not exists idx_series_status_release
  on public.series (status, release_year desc);

create index if not exists idx_series_flags
  on public.series (status, is_featured, is_most_watched, is_recently_added);

create index if not exists idx_seasons_series_id
  on public.seasons (series_id, season_number);

create index if not exists idx_episodes_series_season
  on public.episodes (series_id, season_id, episode_number);

create index if not exists idx_episodes_status
  on public.episodes (status);

create index if not exists idx_movie_categories_category
  on public.movie_categories (category_id);

create index if not exists idx_series_categories_category
  on public.series_categories (category_id);

-- 10. Updated_at Triggers
drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists trg_movies_updated_at on public.movies;
create trigger trg_movies_updated_at
  before update on public.movies
  for each row execute function public.set_updated_at();

drop trigger if exists trg_series_updated_at on public.series;
create trigger trg_series_updated_at
  before update on public.series
  for each row execute function public.set_updated_at();

drop trigger if exists trg_seasons_updated_at on public.seasons;
create trigger trg_seasons_updated_at
  before update on public.seasons
  for each row execute function public.set_updated_at();

drop trigger if exists trg_episodes_updated_at on public.episodes;
create trigger trg_episodes_updated_at
  before update on public.episodes
  for each row execute function public.set_updated_at();

-- 11. Row Level Security (RLS)
-- Public visitors (anon) can only SELECT rows where status = 'published'.
-- All writes require server-side admin authorization via SUPABASE_SERVICE_ROLE_KEY.
alter table public.categories enable row level security;
alter table public.movies enable row level security;
alter table public.series enable row level security;
alter table public.seasons enable row level security;
alter table public.episodes enable row level security;
alter table public.movie_categories enable row level security;
alter table public.series_categories enable row level security;

drop policy if exists "Public read published categories" on public.categories;
create policy "Public read published categories"
  on public.categories for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "Public read published movies" on public.movies;
create policy "Public read published movies"
  on public.movies for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "Public read published series" on public.series;
create policy "Public read published series"
  on public.series for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "Public read published seasons" on public.seasons;
create policy "Public read published seasons"
  on public.seasons for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "Public read published episodes" on public.episodes;
create policy "Public read published episodes"
  on public.episodes for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "Public read published movie categories" on public.movie_categories;
create policy "Public read published movie categories"
  on public.movie_categories for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.movies m
      where m.id = movie_categories.movie_id and m.status = 'published'
    )
  );

drop policy if exists "Public read published series categories" on public.series_categories;
create policy "Public read published series categories"
  on public.series_categories for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.series s
      where s.id = series_categories.series_id and s.status = 'published'
    )
  );

commit;
