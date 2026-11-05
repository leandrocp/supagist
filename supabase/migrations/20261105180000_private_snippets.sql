-- Snippets are public or private, like GitHub gists: the same words in the
-- app, CLI, MCP and skill. Private is what unlisted was: only the author's
-- own reads list it, and anyone the author shares the link with can open it
-- (public.get_snippet_by_link). The select policy already keys on 'public'.
-- Runs as the migration role, so the owner-edit triggers let it through.
alter table public.snippets drop constraint snippets_visibility_check;

update public.snippets set visibility = 'private' where visibility = 'unlisted';

alter table public.snippets
  add constraint snippets_visibility_check check (visibility in ('public', 'private'));

-- Code still serving during the rollout (and published CLI or MCP clients
-- that pass the old value) writes 'unlisted'; store it as 'private' so the
-- migration stays compatible with it. Drop once nothing sends it.
create function private.normalize_snippet_visibility()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.visibility = 'unlisted' then
    new.visibility := 'private';
  end if;
  return new;
end;
$$;

revoke execute on function private.normalize_snippet_visibility()
  from public, anon, authenticated;

create trigger snippets_normalize_visibility
  before insert or update of visibility on public.snippets
  for each row
  execute function private.normalize_snippet_visibility();
