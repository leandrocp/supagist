-- Owner edits re-render the stored images, so an edited snippet keeps its
-- /snippets thumbnail. The web editor renders new images in the browser, as
-- a publish does, and uploads them under new names in the snippet's own
-- folder (Storage has no update policy, and new names bust the CDN). The guard
-- now lets the owner point the path columns at a file directly inside
-- {author}/snippets/{id}/; anything else is still not editable. A content
-- change without new images clears the paths as before. The AFTER trigger
-- already queues every replaced path for Storage removal.

create or replace function public.guard_snippet_owner_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_folder text;
  v_new text[];
  v_old text[];
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if (new.id, new.short_id, new.slug, new.filename, new.author_id, new.created_at,
      new.view_count, new.status, new.appearance)
     is distinct from
     (old.id, old.short_id, old.slug, old.filename, old.author_id, old.created_at,
      old.view_count, old.status, old.appearance) then
    raise exception 'snippet_field_not_editable'
      using errcode = '42501',
            hint = 'Only code, title, language, theme, font and visibility can be edited.';
  end if;

  -- A replaced asset path must name a file directly in this snippet's folder,
  -- the prefix Storage policies already restrict the owner's uploads to.
  v_folder := old.author_id::text || '/snippets/' || old.id::text || '/';
  v_new := array[new.canonical_image_path, new.og_image_path, new.svg_path, new.raw_path];
  v_old := array[old.canonical_image_path, old.og_image_path, old.svg_path, old.raw_path];
  for i in 1..4 loop
    if v_new[i] is distinct from v_old[i]
       and v_new[i] is not null
       and not (starts_with(v_new[i], v_folder)
                and length(v_new[i]) > length(v_folder)
                and strpos(substr(v_new[i], length(v_folder) + 1), '/') = 0) then
      raise exception 'snippet_field_not_editable'
        using errcode = '42501',
              hint = 'Asset paths must be files in the snippet''s own folder.';
    end if;
  end loop;

  -- Stored images and the raw file that the edit did not replace no longer
  -- match the snippet. The AFTER trigger queues the old objects for removal.
  if (new.code, new.language, new.theme, new.font_id)
     is distinct from (old.code, old.language, old.theme, old.font_id) then
    if new.canonical_image_path is not distinct from old.canonical_image_path then
      new.canonical_image_path := null;
    end if;
    if new.og_image_path is not distinct from old.og_image_path then
      new.og_image_path := null;
    end if;
    if new.svg_path is not distinct from old.svg_path then
      new.svg_path := null;
    end if;
  end if;
  if new.code is distinct from old.code
     and new.raw_path is not distinct from old.raw_path then
    new.raw_path := null;
  end if;

  -- Same authoritative metadata as the publish trigger.
  new.line_count := cardinality(string_to_array(new.code, E'\n'));
  new.code_char_count := char_length(new.code);
  -- An edit is activity: it keeps the snippet out of stale cleanup.
  new.last_seen_at := now();
  return new;
end;
$$;

revoke execute on function public.guard_snippet_owner_update()
  from public, anon, authenticated;

-- Stale cleanup only removes snippets whose paths it can vouch for. Re-rendered
-- files have new names in the snippet's own folder; accept those too, so an
-- edited snippet still ages out. Otherwise unchanged from
-- 20261101030000_queue_card_png_cleanup.sql.
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
        or starts_with(s.canonical_image_path, s.author_id::text || '/snippets/' || s.id::text || '/')
        or s.canonical_image_path = 'snippets/' || s.id::text || '/canonical.png'
      )
      and (
        s.og_image_path is null
        or starts_with(s.og_image_path, s.author_id::text || '/snippets/' || s.id::text || '/')
        or s.og_image_path = 'snippets/' || s.id::text || '/og.png'
      )
      and (
        s.svg_path is null
        or starts_with(s.svg_path, s.author_id::text || '/snippets/' || s.id::text || '/')
        or s.svg_path = 'snippets/' || s.id::text || '/canonical.svg'
      )
      and (
        s.raw_path is null
        or starts_with(s.raw_path, s.author_id::text || '/snippets/' || s.id::text || '/')
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
