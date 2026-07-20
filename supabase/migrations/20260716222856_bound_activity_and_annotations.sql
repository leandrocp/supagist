-- Bound user-generated annotation data, replace spoofable visit primitives,
-- and queue stale asset deletion for the Storage API instead of deleting
-- storage.objects metadata directly.

-- Remove pre-existing rows that violate the new launch bounds before adding
-- validated constraints.
delete from public.snippet_comments c
using public.snippets s
where c.snippet_id = s.id
  and (c.line_number > s.line_count or char_length(c.body) > 2000);

create or replace function public.is_allowed_reaction(p_emoji text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p_emoji = any (array[
    '🔥', '✨', '💡', '🎉', '🚀', '💯', '❤️', '💚', '🖤', '⭐', '👍', '🙌',
    '🎯', '💪', '🏆', '👏', '✅', '🌟', '👀', '🤔', '😮', '🧐', '💭', '📌',
    '🔍', '💬', '😂', '🤣', '😅', '😆', '💀', '🤡', '🫠', '😵', '👎', '🤦',
    '😱', '🤮', '💩', '🗑️', '❌', '🚨', '😤', '🤯', '😡', '⚠️', '💥', '💣',
    '🌋', '🔴', '⬆️', '⬇️', '⬅️', '➡️', '↩️', '↪️', '🔁', '🔃', '🐛', '🔧',
    '⚡', '📦', '🔨', '🛠️', '🧪', '🔒', '📝', '📊', '💾', '🧹', '🔑', '🩹',
    '🎭', '🔄', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'
  ]::text[]);
$$;

revoke execute on function public.is_allowed_reaction(text) from public;
grant execute on function public.is_allowed_reaction(text)
  to anon, authenticated, service_role;

delete from public.snippet_line_reactions r
using public.snippets s
where r.snippet_id = s.id
  and (r.line_number > s.line_count or not public.is_allowed_reaction(r.emoji));

delete from public.snippet_reactions
where not public.is_allowed_reaction(emoji);

alter table public.snippet_comments
  add constraint snippet_comments_body_length_check
  check (char_length(body) between 1 and 2000);

alter table public.snippet_line_reactions
  add constraint snippet_line_reactions_emoji_allowed_check
  check (public.is_allowed_reaction(emoji));

alter table public.snippet_reactions
  add constraint snippet_reactions_emoji_allowed_check
  check (public.is_allowed_reaction(emoji));

create or replace function public.enforce_annotation_line_bounds()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line_count integer;
begin
  select line_count into v_line_count
  from public.snippets
  where id = new.snippet_id;

  if v_line_count is null or new.line_number < 1 or new.line_number > v_line_count then
    raise exception 'annotation_line_out_of_bounds'
      using errcode = '23514', hint = 'The line must exist in the target snippet.';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_annotation_line_bounds()
  from public, anon, authenticated;

create trigger snippet_comments_line_bounds
  before insert or update of snippet_id, line_number on public.snippet_comments
  for each row execute function public.enforce_annotation_line_bounds();

create trigger snippet_line_reactions_line_bounds
  before insert or update of snippet_id, line_number on public.snippet_line_reactions
  for each row execute function public.enforce_annotation_line_bounds();

-- One bounded, deduplicated view RPC replaces the independently callable visit
-- insert and counter-increment functions. Authenticated visitors count at most
-- once per snippet per minute; requests without a visitor session share a
-- conservative per-snippet bucket.
create or replace function public.record_snippet_view(p_snippet_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_key text;
  v_allowed boolean;
  v_updated uuid;
begin
  -- Do not allocate a unique rate-limit bucket for an arbitrary/nonexistent
  -- UUID. The public RPC confirms the target before touching bucket state.
  perform 1 from public.snippets where id = p_snippet_id;
  if not found then
    return false;
  end if;

  v_key := case
    when v_uid is null then 'view:unidentified:' || p_snippet_id::text
    else 'view:' || v_uid::text || ':' || p_snippet_id::text
  end;

  v_allowed := public.check_rate_limit(
    v_key,
    case when v_uid is null then 10 else 1 end,
    interval '1 minute'
  );

  if not v_allowed then
    return false;
  end if;

  update public.snippets
  set view_count = view_count + 1,
      last_seen_at = now()
  where id = p_snippet_id
  returning id into v_updated;

  if v_updated is null then
    return false;
  end if;

  insert into public.snippet_visits (
    snippet_id,
    viewer_profile_id,
    anonymous_visitor_id,
    seen_at,
    source
  ) values (
    p_snippet_id,
    v_uid,
    case when v_uid is null then 'unidentified' else null end,
    now(),
    'page_view'
  );

  return true;
end;
$$;

revoke execute on function public.increment_view_count(uuid)
  from public, anon, authenticated;
revoke execute on function public.record_visit(uuid, text)
  from public, anon, authenticated;
revoke execute on function public.record_snippet_view(uuid) from public;
grant execute on function public.record_snippet_view(uuid)
  to anon, authenticated, service_role;

-- Queue Storage paths transactionally with snippet deletion. The Edge cleanup
-- worker removes each queued path through storage.remove(); failed removals stay
-- queued for retry, so metadata and backing objects cannot silently diverge.
create table public.storage_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  snippet_id uuid not null unique,
  paths text[] not null,
  created_at timestamptz not null default now(),
  attempts integer not null default 0
);

alter table public.storage_cleanup_queue enable row level security;
grant all privileges on table public.storage_cleanup_queue to service_role;

create or replace function public.queue_old_snippets_for_cleanup(p_limit integer default 100)
returns setof public.storage_cleanup_queue
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  return query
  with candidates as materialized (
    select
      s.id,
      array_remove(array[
        s.canonical_image_path,
        s.og_image_path,
        s.svg_path,
        s.raw_path
      ], null) as paths
    from public.snippets s
    where s.last_seen_at < now() - interval '6 months'
      and s.canonical_image_path in (
        s.author_id::text || '/snippets/' || s.id::text || '/canonical.png',
        'snippets/' || s.id::text || '/canonical.png'
      )
      and s.og_image_path in (
        s.author_id::text || '/snippets/' || s.id::text || '/og.png',
        'snippets/' || s.id::text || '/og.png'
      )
      and (
        s.svg_path is null
        or s.svg_path in (
          s.author_id::text || '/snippets/' || s.id::text || '/canonical.svg',
          'snippets/' || s.id::text || '/canonical.svg'
        )
      )
      and (
        s.raw_path is null
        or s.raw_path like s.author_id::text || '/snippets/' || s.id::text || '/raw.%'
        or s.raw_path like 'snippets/' || s.id::text || '/raw.%'
      )
    order by s.last_seen_at
    for update skip locked
    limit greatest(1, least(p_limit, 500))
  ), queued as (
    insert into public.storage_cleanup_queue (snippet_id, paths)
    select id, paths from candidates
    on conflict (snippet_id) do update
      set paths = excluded.paths
    returning *
  ), deleted as (
    delete from public.snippets s
    using candidates c
    where s.id = c.id
      and s.last_seen_at < now() - interval '6 months'
    returning s.id
  )
  select q.*
  from queued q
  join deleted d on d.id = q.snippet_id;
end;
$$;

revoke execute on function public.queue_old_snippets_for_cleanup(integer)
  from public, anon, authenticated;
grant execute on function public.queue_old_snippets_for_cleanup(integer)
  to service_role;

-- The old SQL function deleted storage.objects rows directly. Disable its cron
-- job and client execution; the Edge worker is scheduled after deployment.
do $$
declare
  v_job_id bigint;
begin
  for v_job_id in select jobid from cron.job where jobname = 'nightly-cleanup'
  loop
    perform cron.unschedule(v_job_id);
  end loop;
end $$;

revoke execute on function public.cleanup_old_snippets()
  from public, anon, authenticated, service_role;
