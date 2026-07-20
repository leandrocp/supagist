-- Keep the public PostgREST RPC as a security-invoker facade while moving the
-- privileged implementation into a non-exposed schema. This preserves the
-- bounded public view-count API without exposing a SECURITY DEFINER function.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

alter function public.record_snippet_view(uuid) set schema private;

create function public.record_snippet_view(p_snippet_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.record_snippet_view(p_snippet_id);
$$;

revoke execute on function public.record_snippet_view(uuid) from public;
grant execute on function public.record_snippet_view(uuid)
  to anon, authenticated, service_role;
