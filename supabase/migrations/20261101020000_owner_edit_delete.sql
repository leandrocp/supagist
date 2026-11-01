-- Self-serve data control: un-react, edit and delete own snippets, and delete
-- the whole account. Additive only: new policies, grants, triggers and
-- functions; no existing row or policy changes.

-- ============================================================
-- Un-react: snippet_reactions had SELECT/INSERT/UPDATE policies but no DELETE
-- policy (and no explicit DELETE grant), so removing a reaction affected zero
-- rows without an error.
-- ============================================================
create policy "snippet_reactions_delete_own"
  on public.snippet_reactions for delete to authenticated
  using (author_id = (select auth.uid()));

grant delete on table public.snippet_reactions to authenticated;

-- ============================================================
-- Owners edit and delete their own snippets.
-- ============================================================
create policy "snippets_update_own"
  on public.snippets for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy "snippets_delete_own"
  on public.snippets for delete to authenticated
  using (author_id = (select auth.uid()));

grant update, delete on table public.snippets to authenticated;

-- Direct client edits may change only the content and display fields. Runs as
-- the caller (security invoker) so current_user tells a PostgREST client edit
-- apart from trusted definer paths such as record_snippet_view's counter.
create function public.guard_snippet_owner_update()
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
      new.svg_path, new.raw_path)
     is distinct from
     (old.id, old.short_id, old.slug, old.filename, old.author_id, old.created_at,
      old.view_count, old.status, old.canonical_image_path, old.og_image_path,
      old.svg_path, old.raw_path) then
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

create trigger snippets_owner_update_guard
  before update on public.snippets
  for each row execute function public.guard_snippet_owner_update();

-- Merge paths into the Storage cleanup ledger that the nightly cleanup worker
-- drains through the Storage API (same ledger as stale-snippet cleanup).
create function private.queue_storage_cleanup(p_snippet_id uuid, p_paths text[])
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.storage_cleanup_queue as q (snippet_id, paths)
  select p_snippet_id, p_paths
  where cardinality(p_paths) > 0
  on conflict (snippet_id) do update
    set paths = array(select distinct unnest(q.paths || excluded.paths));
$$;

revoke execute on function private.queue_storage_cleanup(uuid, text[])
  from public, anon, authenticated;

create function private.after_snippet_edit()
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
    case when new.raw_path is distinct from old.raw_path then old.raw_path end
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

revoke execute on function private.after_snippet_edit() from public, anon, authenticated;

create trigger snippets_after_edit
  after update on public.snippets
  for each row
  when ((old.code, old.title, old.language, old.theme, old.font_id, old.visibility)
        is distinct from
        (new.code, new.title, new.language, new.theme, new.font_id, new.visibility))
  execute function private.after_snippet_edit();

-- Every snippet delete (owner, account deletion or stale cleanup) queues its
-- assets in the same transaction, so a row can never vanish while its Storage
-- objects are forgotten. Reactions, comments and visits cascade.
create function private.after_snippet_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.queue_storage_cleanup(old.id, array_remove(array[
    old.canonical_image_path, old.og_image_path, old.svg_path, old.raw_path
  ], null));
  return null;
end;
$$;

revoke execute on function private.after_snippet_delete() from public, anon, authenticated;

create trigger snippets_after_delete
  after delete on public.snippets
  for each row execute function private.after_snippet_delete();

-- ============================================================
-- Account deletion: the signed-in user deletes their account and all their
-- data. Profiles' child tables do not cascade, so delete them explicitly.
-- Same shape as record_snippet_view/get_snippet_by_link: the privileged body
-- lives in the unexposed private schema behind a security-invoker facade.
-- ============================================================
create function private.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_paths text[];
begin
  if v_uid is null then
    raise exception 'sign_in_required' using errcode = '42501';
  end if;

  delete from public.snippets where author_id = v_uid;
  delete from public.snippet_comments where author_id = v_uid;
  delete from public.snippet_line_reactions where author_id = v_uid;
  delete from public.snippet_reactions where author_id = v_uid;
  delete from public.snippet_visits where viewer_profile_id = v_uid;

  -- Anything else left in the user's Storage prefix goes too.
  select array_agg(name) into v_paths
  from storage.objects
  where bucket_id = 'snippet-images'
    and (storage.foldername(name))[1] = v_uid::text;
  perform private.queue_storage_cleanup(gen_random_uuid(), coalesce(v_paths, '{}'));

  delete from public.profiles where id = v_uid;
  -- Cascades to identities, sessions, MFA factors and OAuth grants.
  delete from auth.users where id = v_uid;
end;
$$;

revoke execute on function private.delete_own_account() from public, anon;
grant execute on function private.delete_own_account() to authenticated;

create function public.delete_own_account()
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.delete_own_account();
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
