-- ============================================================
-- Update handle_new_user to support anonymous sign-ins
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username       text;
  v_avatar_url     text;
  v_github_user_id bigint;
begin
  if new.is_anonymous is true then
    -- Stable, unique guest name derived from the user UUID
    v_username       := 'guest_' || lower(left(replace(new.id::text, '-', ''), 12));
    v_avatar_url     := '';
    v_github_user_id := null;
  else
    v_username := coalesce(
      nullif(new.raw_user_meta_data->>'user_name', ''),
      nullif(new.raw_user_meta_data->>'preferred_username', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'user_' || lower(left(replace(new.id::text, '-', ''), 12))
    );
    v_avatar_url     := coalesce(new.raw_user_meta_data->>'avatar_url', '');
    v_github_user_id := nullif(new.raw_user_meta_data->>'provider_id', '')::bigint;
  end if;

  insert into public.profiles (id, username, avatar_url, github_user_id)
  values (new.id, v_username, v_avatar_url, v_github_user_id)
  on conflict (id) do update set
    -- Only overwrite with better data: real GitHub identity wins over guest name
    username         = case
                         when excluded.github_user_id is not null then excluded.username
                         else profiles.username
                       end,
    avatar_url       = case
                         when excluded.avatar_url != '' then excluded.avatar_url
                         else profiles.avatar_url
                       end,
    github_user_id   = coalesce(excluded.github_user_id, profiles.github_user_id),
    updated_at       = now();
  return new;
end;
$$;

-- ============================================================
-- RPC: increment_view_count
-- Atomically increments view_count and refreshes last_seen_at.
-- Security definer lets any authenticated (incl. anonymous) caller
-- bump the counter without needing direct UPDATE on snippets.
-- ============================================================
create or replace function public.increment_view_count(p_snippet_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.snippets
  set
    view_count   = view_count + 1,
    last_seen_at = now()
  where id = p_snippet_id;
end;
$$;

-- ============================================================
-- RPC: record_visit
-- Inserts a row into snippet_visits.
-- Security definer so server code can write without exposing
-- direct client-write access on the visits table.
-- ============================================================
create or replace function public.record_visit(
  p_snippet_id uuid,
  p_source     text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.snippet_visits (snippet_id, viewer_profile_id, seen_at, source)
  values (
    p_snippet_id,
    -- viewer_profile_id is the calling user (null for fully anonymous callers)
    nullif((select auth.uid()), null::uuid),
    now(),
    p_source
  );
end;
$$;
