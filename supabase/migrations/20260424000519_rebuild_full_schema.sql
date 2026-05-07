-- Drop old tables
drop table if exists public.snippet_reactions cascade;
drop table if exists public.snippets cascade;

-- Drop old trigger/function if exists
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_updated on auth.users;
drop function if exists public.handle_new_user();

-- ============================================================
-- profiles
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  avatar_url text not null,
  github_user_id bigint unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_current_timestamp_updated_at();

-- sync profile from GitHub OAuth metadata on user create/update
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, avatar_url, github_user_id)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'user_name',
      new.raw_user_meta_data->>'preferred_username',
      split_part(new.email, '@', 1)
    ),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    nullif(new.raw_user_meta_data->>'provider_id', '')::bigint
  )
  on conflict (id) do update
  set
    username      = excluded.username,
    avatar_url    = excluded.avatar_url,
    github_user_id = excluded.github_user_id,
    updated_at    = now();
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create trigger on_auth_user_updated
after update of raw_user_meta_data on auth.users
for each row execute function public.handle_new_user();

-- ============================================================
-- snippets
-- ============================================================
create table public.snippets (
  id                   uuid        primary key default gen_random_uuid(),
  short_id             text        not null unique,
  slug                 text        not null,
  filename             text        not null,
  language             text,
  theme                text        not null,
  code                 text        not null,
  code_char_count      integer     not null,
  line_count           integer     not null,
  author_id            uuid        not null references public.profiles(id),
  canonical_image_path text        not null unique,
  og_image_path        text        not null unique,
  created_at           timestamptz not null default now(),
  last_seen_at         timestamptz not null default now(),
  view_count           bigint      not null default 0,
  constraint snippets_slug_short_id_unique unique (slug, short_id),
  constraint snippets_code_length_check    check (char_length(code) <= 8000),
  constraint snippets_code_char_count_check check (code_char_count = char_length(code)),
  constraint snippets_line_count_check      check (line_count >= 1)
);

-- ============================================================
-- snippet_reactions  (one per user per snippet)
-- ============================================================
create table public.snippet_reactions (
  id         uuid        primary key default gen_random_uuid(),
  snippet_id uuid        not null references public.snippets(id) on delete cascade,
  author_id  uuid        not null references public.profiles(id),
  emoji      text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (snippet_id, author_id)
);

create trigger snippet_reactions_set_updated_at
before update on public.snippet_reactions
for each row execute function public.set_current_timestamp_updated_at();

-- ============================================================
-- snippet_comments  (one per user per line per snippet)
-- ============================================================
create table public.snippet_comments (
  id         uuid        primary key default gen_random_uuid(),
  snippet_id uuid        not null references public.snippets(id) on delete cascade,
  author_id  uuid        not null references public.profiles(id),
  line_number integer    not null,
  body       text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint snippet_comments_per_user_per_line unique (snippet_id, author_id, line_number),
  constraint snippet_comments_line_number_check check (line_number >= 1),
  constraint snippet_comments_body_check        check (char_length(body) > 0)
);

create trigger snippet_comments_set_updated_at
before update on public.snippet_comments
for each row execute function public.set_current_timestamp_updated_at();

-- ============================================================
-- snippet_line_reactions  (one per user per line per snippet)
-- ============================================================
create table public.snippet_line_reactions (
  id          uuid        primary key default gen_random_uuid(),
  snippet_id  uuid        not null references public.snippets(id) on delete cascade,
  author_id   uuid        not null references public.profiles(id),
  line_number integer     not null,
  emoji       text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint snippet_line_reactions_per_user_per_line unique (snippet_id, author_id, line_number),
  constraint snippet_line_reactions_line_number_check check (line_number >= 1)
);

create trigger snippet_line_reactions_set_updated_at
before update on public.snippet_line_reactions
for each row execute function public.set_current_timestamp_updated_at();

-- ============================================================
-- snippet_visits
-- ============================================================
create table public.snippet_visits (
  id                   bigint      generated always as identity primary key,
  snippet_id           uuid        not null references public.snippets(id) on delete cascade,
  viewer_profile_id    uuid        references public.profiles(id),
  anonymous_visitor_id text,
  seen_at              timestamptz not null default now(),
  source               text        not null check (source in ('page_view', 'presence_join'))
);

-- ============================================================
-- indexes
-- ============================================================
create index snippets_created_at_idx         on public.snippets (created_at desc);
create index snippets_last_seen_at_idx        on public.snippets (last_seen_at);
create index snippets_author_id_idx           on public.snippets (author_id);
create index snippet_comments_snippet_idx     on public.snippet_comments (snippet_id, line_number);
create index snippet_reactions_snippet_idx    on public.snippet_reactions (snippet_id);
create index snippet_line_reactions_snippet_idx on public.snippet_line_reactions (snippet_id, line_number);
create index snippet_visits_snippet_id_idx    on public.snippet_visits (snippet_id);
create index snippet_visits_seen_at_idx       on public.snippet_visits (seen_at desc);

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles            enable row level security;
alter table public.snippets            enable row level security;
alter table public.snippet_reactions   enable row level security;
alter table public.snippet_comments    enable row level security;
alter table public.snippet_line_reactions enable row level security;
alter table public.snippet_visits      enable row level security;

-- profiles
create policy "profiles_select_public"
  on public.profiles for select to anon, authenticated using (true);

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- snippets
create policy "snippets_select_public"
  on public.snippets for select to anon, authenticated using (true);

create policy "snippets_insert_own"
  on public.snippets for insert to authenticated
  with check (author_id = (select auth.uid()));

-- snippet_reactions
create policy "snippet_reactions_select_public"
  on public.snippet_reactions for select to anon, authenticated using (true);

create policy "snippet_reactions_insert_own"
  on public.snippet_reactions for insert to authenticated
  with check (author_id = (select auth.uid()));

create policy "snippet_reactions_update_own"
  on public.snippet_reactions for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

-- snippet_comments
create policy "snippet_comments_select_public"
  on public.snippet_comments for select to anon, authenticated using (true);

create policy "snippet_comments_insert_own"
  on public.snippet_comments for insert to authenticated
  with check (author_id = (select auth.uid()));

create policy "snippet_comments_update_own"
  on public.snippet_comments for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

-- snippet_line_reactions
create policy "snippet_line_reactions_select_public"
  on public.snippet_line_reactions for select to anon, authenticated using (true);

create policy "snippet_line_reactions_insert_own"
  on public.snippet_line_reactions for insert to authenticated
  with check (author_id = (select auth.uid()));

create policy "snippet_line_reactions_update_own"
  on public.snippet_line_reactions for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

-- snippet_visits: server-side writes only via service role; no direct client access
create policy "snippet_visits_select_own"
  on public.snippet_visits for select to authenticated
  using (viewer_profile_id = (select auth.uid()));
