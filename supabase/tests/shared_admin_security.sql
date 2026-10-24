-- Run manually in an isolated staging project's SQL Editor AFTER migrations.
-- All test rows roll back; do not run automatically during deployment.
begin;
do $$
declare
  test_key text := md5(random()::text) || md5(random()::text);
  token_key text := md5(random()::text) || md5(random()::text);
  result jsonb;
  i integer;
begin
  if has_function_privilege('anon', 'public.cartoony_consume_login(text)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.cartoony_create_session(text,timestamptz)', 'EXECUTE')
    or has_function_privilege('anon', 'public.cartoony_session_active(text)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.cartoony_revoke_session(text)', 'EXECUTE')
    or has_schema_privilege('anon', 'cartoony_private', 'USAGE') then
    raise exception 'Public access to private auth state';
  end if;
  if not has_function_privilege('service_role', 'public.cartoony_consume_login(text)', 'EXECUTE') then
    raise exception 'Missing service-role execution grant';
  end if;
  for i in 1..6 loop
    result := public.cartoony_consume_login(test_key);
    if (result->>'allowed')::boolean <> (i <= 5) then raise exception 'Rate limit failed'; end if;
  end loop;
  perform public.cartoony_create_session(token_key, now() + interval '1 minute');
  if not public.cartoony_session_active(token_key) then raise exception 'Session registration failed'; end if;
  perform public.cartoony_revoke_session(token_key);
  if public.cartoony_session_active(token_key) then raise exception 'Revocation failed'; end if;
  if not exists(select 1 from storage.buckets where id = 'movie-image-staging'
    and not public and file_size_limit = 5242880
    and allowed_mime_types @> array['image/jpeg','image/png','image/webp']
    and cardinality(allowed_mime_types) = 3) then raise exception 'Staging bucket misconfigured'; end if;
end;
$$;
rollback;
