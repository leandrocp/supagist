-- MCP publishing (publish_snippet) stores SVG and raw code but no PNGs: PNG
-- rendering happens in the web composer's browser export. Make the PNG paths
-- optional; the publish trigger already checks only paths that are present,
-- and the snippet page falls back to the site's social image.
alter table public.snippets
  alter column canonical_image_path drop not null,
  alter column og_image_path drop not null;

-- Optional display title; MCP publishes may set it, the web composer does not.
alter table public.snippets
  add column title text
  constraint snippets_title_length_check check (title is null or char_length(title) between 1 and 120);

-- Unchanged except that a missing PNG path no longer excludes a stale snippet
-- from cleanup; array_remove already drops null paths from the queue entry.
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
