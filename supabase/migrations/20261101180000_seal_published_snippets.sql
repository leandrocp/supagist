-- A published snippet is sealed: its code, language, theme, font, appearance
-- and stored images stay as published. Owners may still retitle it or switch
-- it between public and unlisted; to change the code they delete it and
-- publish again. Reactions and comments stay anchored to the lines they were
-- left on, so an edit can no longer move or remove them.

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

  -- Every column except title and visibility (and the activity timestamp set
  -- below) must stay as published, including columns added later.
  if to_jsonb(new) - 'title' - 'visibility' - 'last_seen_at'
     is distinct from to_jsonb(old) - 'title' - 'visibility' - 'last_seen_at' then
    raise exception 'snippet_field_not_editable'
      using errcode = '42501',
            hint = 'Published snippets are sealed: only the title and visibility can be edited.';
  end if;

  -- An edit is activity: it keeps the snippet out of stale cleanup.
  new.last_seen_at := now();
  return new;
end;
$$;

revoke execute on function public.guard_snippet_owner_update()
  from public, anon, authenticated;

-- Edits no longer replace stored files or change line count, so the AFTER
-- trigger only rate-limits owner edits.
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
  return null;
end;
$$;

revoke execute on function private.after_snippet_edit() from public, anon, authenticated;

drop trigger snippets_after_edit on public.snippets;

create trigger snippets_after_edit
  after update on public.snippets
  for each row
  when ((old.title, old.visibility) is distinct from (new.title, new.visibility))
  execute function private.after_snippet_edit();
