-- Unlisted snippets: readable by anyone with the link (slug + short_id), but
-- never returned by a table read, so no listing, feed or search can include
-- them. Existing rows and the web composer's inserts stay public.
alter table public.snippets
  add column visibility text not null default 'public'
  constraint snippets_visibility_check check (visibility in ('public', 'unlisted'));

-- Table reads see public rows plus the caller's own (for /snippets).
drop policy "snippets_select_public" on public.snippets;
create policy "snippets_select_public_or_own"
  on public.snippets for select to anon, authenticated
  using (visibility = 'public' or author_id = (select auth.uid()));

-- Opening a link is the only way to read someone else's unlisted snippet:
-- one exact slug + short_id pair returns at most one row. Same shape as
-- record_snippet_view: the privileged body lives in the unexposed private
-- schema behind a security-invoker public facade.
create function private.get_snippet_by_link(p_slug text, p_short_id text)
returns setof public.snippets
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.snippets
  where slug = p_slug and short_id = p_short_id
  limit 1;
$$;

revoke execute on function private.get_snippet_by_link(text, text) from public;
grant execute on function private.get_snippet_by_link(text, text)
  to anon, authenticated, service_role;

create function public.get_snippet_by_link(p_slug text, p_short_id text)
returns setof public.snippets
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.get_snippet_by_link(p_slug, p_short_id);
$$;

revoke execute on function public.get_snippet_by_link(text, text) from public;
grant execute on function public.get_snippet_by_link(text, text)
  to anon, authenticated, service_role;
