-- ============================================================
-- Rate limiting
--
-- One small bucket table + a security-definer RPC that atomically
-- increments a counter inside a sliding window. Server actions call the
-- RPC explicitly; user-facing tables get a BEFORE INSERT trigger so
-- direct PostgREST inserts (line reactions, comments, snippet reactions)
-- are bounded too.
--
-- Limits are intentionally conservative for launch. They live in this
-- migration on purpose — bumping them is a code change, not a config
-- knob, so we always notice when they shift.
-- ============================================================

create table public.rate_limit_buckets (
  key          text        primary key,
  window_start timestamptz not null default now(),
  count        integer     not null default 0
);

-- Lock the table down: writes only via the security-definer RPC. No RLS
-- policies → no anon/authenticated access at all.
alter table public.rate_limit_buckets enable row level security;

-- ── check_rate_limit ──────────────────────────────────────────────────────
-- Returns true when the call is allowed, false when the bucket is full.
-- Atomic via INSERT ... ON CONFLICT so concurrent requests never both
-- read the same count and both succeed past the limit.
create or replace function public.check_rate_limit(
  p_key    text,
  p_max    integer,
  p_window interval
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now   timestamptz := now();
  v_count integer;
begin
  if p_key is null or p_max <= 0 or p_window is null then
    return true;
  end if;

  insert into public.rate_limit_buckets as b (key, window_start, count)
  values (p_key, v_now, 1)
  on conflict (key) do update
    set window_start = case
                         when b.window_start + p_window < v_now then v_now
                         else b.window_start
                       end,
        count        = case
                         when b.window_start + p_window < v_now then 1
                         else b.count + 1
                       end
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, interval) from public;
grant execute on function public.check_rate_limit(text, integer, interval)
  to authenticated, service_role;

-- ── enforce_user_content_rate_limit ───────────────────────────────────────
-- BEFORE INSERT trigger fired on user-content tables. Looks up the per-
-- table limit, calls check_rate_limit, and raises if the bucket is full.
create or replace function public.enforce_user_content_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_max    integer;
  v_window interval;
  v_key    text;
begin
  -- Service-role inserts (no JWT) are not rate-limited. Only user-
  -- originated writes go through this trigger meaningfully.
  if v_uid is null then
    return new;
  end if;

  if tg_table_name = 'snippet_line_reactions' then
    v_key := 'line_react:' || v_uid::text;
    v_max := 60;
    v_window := interval '1 minute';
  elsif tg_table_name = 'snippet_comments' then
    v_key := 'comment:' || v_uid::text;
    v_max := 30;
    v_window := interval '1 minute';
  elsif tg_table_name = 'snippet_reactions' then
    v_key := 'snippet_react:' || v_uid::text;
    v_max := 60;
    v_window := interval '1 minute';
  else
    return new;
  end if;

  if not public.check_rate_limit(v_key, v_max, v_window) then
    raise exception 'rate limit exceeded for %', tg_table_name
      using errcode = '23P01',
            hint = 'Too many requests. Slow down and try again in a minute.';
  end if;

  return new;
end;
$$;

create trigger snippet_line_reactions_rate_limit
  before insert on public.snippet_line_reactions
  for each row execute function public.enforce_user_content_rate_limit();

create trigger snippet_comments_rate_limit
  before insert on public.snippet_comments
  for each row execute function public.enforce_user_content_rate_limit();

create trigger snippet_reactions_rate_limit
  before insert on public.snippet_reactions
  for each row execute function public.enforce_user_content_rate_limit();

-- ── cleanup_rate_limit_buckets ────────────────────────────────────────────
-- Bucket count is bounded by the active user × distinct-key set, so the
-- table stays small naturally. Cleanup is a courtesy: dropping rows older
-- than a day keeps the keyspace reusable and the table tight.
create or replace function public.cleanup_rate_limit_buckets()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limit_buckets
  where window_start < now() - interval '1 day';
$$;

-- Schedule daily cleanup at 02:30 UTC, 30 minutes after the snippet sweep.
select cron.schedule(
  'cleanup_rate_limit_buckets',
  '30 2 * * *',
  $$select public.cleanup_rate_limit_buckets();$$
);
