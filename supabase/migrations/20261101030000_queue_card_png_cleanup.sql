-- Web publishes now also upload {author}/snippets/{id}/card.png: the card
-- alone, laid into the per-snippet share image (app/[snippet]/og.png). It has
-- no column; its path is derived and it exists only beside canonical.png.
-- Queue it for Storage removal wherever the other assets are queued: stale
-- cleanup, owner edits that clear the stored images, and deletes. Removing a
-- path that does not exist is a no-op in the cleanup worker.

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
        s.raw_path,
        -- card.png has no column: it exists only beside a web-published canonical.png.
        case when s.canonical_image_path is not null
          then s.author_id::text || '/snippets/' || s.id::text || '/card.png' end
      ], null) as paths
    from public.snippets s
    where s.last_seen_at < now() - interval '6 months'
      and (
        s.canonical_image_path is null
        or s.canonical_image_path in (
          s.author_id::text || '/snippets/' || s.id::text || '/canonical.png',
          'snippets/' || s.id::text || '/canonical.png'
        )
      )
      and (
        s.og_image_path is null
        or s.og_image_path in (
          s.author_id::text || '/snippets/' || s.id::text || '/og.png',
          'snippets/' || s.id::text || '/og.png'
        )
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

create or replace function private.after_snippet_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if (select auth.role()) = 'authenticated' and v_uid is not null
     and not public.check_rate_limit('edit_hour:' || v_uid::text, 60, interval '1 hour') then
    raise exception 'edit_hour_rate_limit'
      using errcode = 'P0001', hint = 'Too many edits in the last hour.';
  end if;

  perform private.queue_storage_cleanup(new.id, array_remove(array[
    case when new.canonical_image_path is distinct from old.canonical_image_path
      then old.canonical_image_path end,
    case when new.og_image_path is distinct from old.og_image_path
      then old.og_image_path end,
    case when new.svg_path is distinct from old.svg_path then old.svg_path end,
    case when new.raw_path is distinct from old.raw_path then old.raw_path end,
    case when new.canonical_image_path is null and old.canonical_image_path is not null
      then old.author_id::text || '/snippets/' || old.id::text || '/card.png' end
  ], null));

  -- Annotations on lines the edit removed no longer point at anything.
  if new.line_count < old.line_count then
    delete from public.snippet_comments
      where snippet_id = new.id and line_number > new.line_count;
    delete from public.snippet_line_reactions
      where snippet_id = new.id and line_number > new.line_count;
  end if;
  return null;
end;
$$;

create or replace function private.after_snippet_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.queue_storage_cleanup(old.id, array_remove(array[
    old.canonical_image_path, old.og_image_path, old.svg_path, old.raw_path,
    case when old.canonical_image_path is not null
      then old.author_id::text || '/snippets/' || old.id::text || '/card.png' end
  ], null));
  return null;
end;
$$;
