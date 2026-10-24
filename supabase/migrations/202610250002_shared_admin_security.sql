begin;

-- Not exposed through the Data API. Only tightly scoped service-role RPCs access it.
create schema if not exists cartoony_private;
revoke all on schema cartoony_private from public, anon, authenticated;
create table if not exists cartoony_private.login_limits (
  key_hash text primary key check (key_hash ~ '^[a-f0-9]{64}$'),
  attempts integer not null,
  reset_at timestamptz not null
);
create table if not exists cartoony_private.admin_sessions (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  revoked boolean not null default false
);
create index if not exists login_limits_reset_at on cartoony_private.login_limits(reset_at);
create index if not exists admin_sessions_expires_at on cartoony_private.admin_sessions(expires_at);
alter table cartoony_private.login_limits enable row level security;
alter table cartoony_private.admin_sessions enable row level security;
revoke all on all tables in schema cartoony_private from public, anon, authenticated;

-- One UPSERT locks the shared IP row and consumes an attempt BEFORE password work.
-- No check/increment race and no success reset that could erase concurrent attempts.
create or replace function public.cartoony_consume_login(p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare n integer; until_time timestamptz; t timestamptz := clock_timestamp();
begin
  delete from cartoony_private.login_limits where reset_at < t - interval '1 day';
  insert into cartoony_private.login_limits as limits(key_hash, attempts, reset_at)
  values (p_key, 1, t + interval '15 minutes')
  on conflict (key_hash) do update set
    attempts = case when limits.reset_at <= t then 1 else least(limits.attempts + 1, 6) end,
    reset_at = case when limits.reset_at <= t then t + interval '15 minutes' else limits.reset_at end
  returning attempts, reset_at into n, until_time;
  return jsonb_build_object('allowed', n <= 5, 'retryAfterSeconds',
    case when n <= 5 then 0 else greatest(1, ceil(extract(epoch from until_time - t))) end);
end;
$$;

create or replace function public.cartoony_create_session(p_hash text, p_expires timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_expires <= now() or p_expires > now() + interval '8 hours 1 minute' then
    raise exception 'Invalid session expiration';
  end if;
  delete from cartoony_private.admin_sessions where expires_at < now();
  insert into cartoony_private.admin_sessions(token_hash, expires_at) values(p_hash, p_expires);
  return true;
end;
$$;

create or replace function public.cartoony_session_active(p_hash text)
returns boolean language sql security definer set search_path = '' as $$
  select exists(select 1 from cartoony_private.admin_sessions
    where token_hash = p_hash and not revoked and expires_at > now());
$$;

create or replace function public.cartoony_revoke_session(p_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update cartoony_private.admin_sessions set revoked = true where token_hash = p_hash;
  return true;
end;
$$;

revoke all on function public.cartoony_consume_login(text) from public, anon, authenticated;
revoke all on function public.cartoony_create_session(text,timestamptz) from public, anon, authenticated;
revoke all on function public.cartoony_session_active(text) from public, anon, authenticated;
revoke all on function public.cartoony_revoke_session(text) from public, anon, authenticated;
grant execute on function public.cartoony_consume_login(text) to service_role;
grant execute on function public.cartoony_create_session(text,timestamptz) to service_role;
grant execute on function public.cartoony_session_active(text) to service_role;
grant execute on function public.cartoony_revoke_session(text) to service_role;
notify pgrst, 'reload schema';
commit;
