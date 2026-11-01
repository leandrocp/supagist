-- The composer's appearance at publish time: background, frame, spacing,
-- header, footer, font size, aspect ratio and ligatures. The saved view and
-- its exports read it so a published snippet looks the way it was composed.
-- Null for snippets published before this column existed.
alter table public.snippets
  add column appearance jsonb
  constraint snippets_appearance_check check (
    appearance is null
    or (jsonb_typeof(appearance) = 'object' and octet_length(appearance::text) <= 4096)
  );

-- Unchanged except that appearance joins the fields an owner cannot edit:
-- the stored images were rendered from it, and edits do not re-render them.
create or replace function public.guard_snippet_owner_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if (new.id, new.short_id, new.slug, new.filename, new.author_id, new.created_at,
      new.view_count, new.status, new.canonical_image_path, new.og_image_path,
      new.svg_path, new.raw_path, new.appearance)
     is distinct from
     (old.id, old.short_id, old.slug, old.filename, old.author_id, old.created_at,
      old.view_count, old.status, old.canonical_image_path, old.og_image_path,
      old.svg_path, old.raw_path, old.appearance) then
    raise exception 'snippet_field_not_editable'
      using errcode = '42501',
            hint = 'Only code, title, language, theme, font and visibility can be edited.';
  end if;

  -- Stored images and the raw file no longer match the edited snippet. The
  -- AFTER trigger queues the old objects for Storage removal.
  if (new.code, new.language, new.theme, new.font_id)
     is distinct from (old.code, old.language, old.theme, old.font_id) then
    new.canonical_image_path := null;
    new.og_image_path := null;
    new.svg_path := null;
  end if;
  if new.code is distinct from old.code then
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
