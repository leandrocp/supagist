create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.snippets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  author_id uuid references auth.users (id) on delete set null,
  filename text not null check (char_length(trim(filename)) > 0),
  code text not null check (char_length(code) > 0),
  theme text not null,
  image_path text,
  visibility text not null default 'public' check (visibility in ('public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger snippets_set_updated_at
before update on public.snippets
for each row
execute function public.set_current_timestamp_updated_at();

create table if not exists public.snippet_reactions (
  id uuid primary key default gen_random_uuid(),
  snippet_id uuid not null references public.snippets (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  visitor_key text not null check (char_length(trim(visitor_key)) > 0),
  created_at timestamptz not null default now(),
  unique (snippet_id, emoji, visitor_key)
);

create index if not exists snippets_created_at_idx on public.snippets (created_at desc);
create index if not exists snippet_reactions_snippet_id_idx on public.snippet_reactions (snippet_id);
create index if not exists snippet_reactions_snippet_emoji_idx on public.snippet_reactions (snippet_id, emoji);

alter table public.snippets enable row level security;
alter table public.snippet_reactions enable row level security;

create policy "Public snippets are readable by everyone"
on public.snippets
for select
to anon, authenticated
using (visibility = 'public');

create policy "Authenticated users can insert snippets"
on public.snippets
for insert
to authenticated
with check (author_id = (select auth.uid()) and visibility = 'public');

create policy "Authors can update their own snippets"
on public.snippets
for update
to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

create policy "Authors can delete their own snippets"
on public.snippets
for delete
to authenticated
using (author_id = (select auth.uid()));

create policy "Public reactions are readable by everyone"
on public.snippet_reactions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.snippets
    where snippets.id = snippet_reactions.snippet_id
      and snippets.visibility = 'public'
  )
);

create policy "Anyone can insert reactions on public snippets"
on public.snippet_reactions
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.snippets
    where snippets.id = snippet_reactions.snippet_id
      and snippets.visibility = 'public'
  )
);
