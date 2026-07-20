-- Make publish limits non-bypassable by enforcing them on snippets INSERT.
-- Direct PostgREST writes and the Next.js server action now cross the same
-- database boundary. Client roles can no longer invoke the generic bucket
-- primitive with attacker-controlled keys, limits, or windows.

-- The schema rebuild drops and recreates tables after Supabase's default-grant
-- hook has run. Declare the minimum table privileges explicitly; RLS remains
-- the row-level authorization boundary.
grant select on table public.profiles to anon, authenticated;
grant insert, update on table public.profiles to authenticated;
grant select on table public.snippets to anon, authenticated;
grant insert on table public.snippets to authenticated;
grant select on table public.snippet_reactions to anon, authenticated;
grant insert, update on table public.snippet_reactions to authenticated;
grant select on table public.snippet_comments to anon, authenticated;
grant insert, update, delete on table public.snippet_comments to authenticated;
grant select on table public.snippet_line_reactions to anon, authenticated;
grant insert, update, delete on table public.snippet_line_reactions to authenticated;
grant select on table public.snippet_visits to authenticated;
grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

create or replace function public.check_rate_limit(
  p_key text,
  p_max integer,
  p_window interval
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count integer;
begin
  if p_key is null or btrim(p_key) = '' or p_max <= 0 or p_window is null or p_window <= interval '0 seconds' then
    raise exception 'invalid rate-limit configuration' using errcode = '22023';
  end if;

  insert into public.rate_limit_buckets as b (key, window_start, count)
  values (p_key, v_now, 1)
  on conflict (key) do update
    set window_start = case
                         when b.window_start + p_window < v_now then v_now
                         else b.window_start
                       end,
        count = case
                  when b.window_start + p_window < v_now then 1
                  else b.count + 1
                end
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

revoke execute on function public.check_rate_limit(text, integer, interval)
  from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, interval)
  to service_role;

create or replace function public.enforce_snippet_publish_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_is_anonymous boolean := coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false);
  v_asset_prefix text;
begin
  -- Trusted maintenance/tests use the service role; end-user clients never do.
  if (select auth.role()) = 'service_role' then
    return new;
  end if;

  if v_uid is null or new.author_id <> v_uid then
    raise exception 'publish_identity_required'
      using errcode = 'P0001', hint = 'A verified caller may publish only their own snippet.';
  end if;

  if v_is_anonymous then
    raise exception 'persistent_account_required'
      using errcode = 'P0001', hint = 'Anonymous accounts cannot publish snippets.';
  end if;

  v_asset_prefix := v_uid::text || '/snippets/' || new.id::text || '/';
  if new.canonical_image_path <> v_asset_prefix || 'canonical.png'
     or new.og_image_path <> v_asset_prefix || 'og.png'
     or (new.svg_path is not null and new.svg_path <> v_asset_prefix || 'canonical.svg')
     or (new.raw_path is not null and new.raw_path not like v_asset_prefix || 'raw.%') then
    raise exception 'invalid_snippet_asset_paths'
      using errcode = '23514', hint = 'Snippet assets must stay inside the author-owned snippet prefix.';
  end if;

  -- These values are authoritative server metadata, not caller input.
  new.last_seen_at := now();
  new.view_count := 0;
  new.line_count := cardinality(string_to_array(new.code, E'\n'));
  new.code_char_count := char_length(new.code);
  new.status := 'published';

  if not public.check_rate_limit('publish_hour:' || v_uid::text, 10, interval '1 hour') then
    raise exception 'publish_hour_rate_limit'
      using errcode = 'P0001', hint = 'Too many snippets in the last hour.';
  end if;

  if not public.check_rate_limit('publish_day:' || v_uid::text, 30, interval '1 day') then
    raise exception 'publish_day_rate_limit'
      using errcode = 'P0001', hint = 'Daily snippet limit reached.';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_snippet_publish_rate_limit()
  from public, anon, authenticated;

create trigger snippets_publish_rate_limit
  before insert on public.snippets
  for each row execute function public.enforce_snippet_publish_rate_limit();
