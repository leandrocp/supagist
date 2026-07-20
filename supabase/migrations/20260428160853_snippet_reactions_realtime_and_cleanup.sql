-- Enable Realtime for snippet-level reactions so clients get live updates.
alter table public.snippet_reactions replica identity full;
alter publication supabase_realtime add table public.snippet_reactions;

-- ============================================================
-- SQL-only cleanup function
-- Replaces the Edge Function HTTP call in the cron job.
-- Deletes Storage objects first, then snippet rows.
-- Cascade handles comments, reactions, visits, line_reactions.
-- ============================================================
create or replace function public.cleanup_old_snippets()
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_snippet record;
begin
  for v_snippet in
    select id, canonical_image_path, og_image_path, svg_path, raw_path
    from public.snippets
    where last_seen_at < now() - interval '6 months'
  loop
    delete from storage.objects
    where bucket_id = 'snippet-images'
      and name = any(
        array_remove(array[
          v_snippet.canonical_image_path,
          v_snippet.og_image_path,
          v_snippet.svg_path,
          v_snippet.raw_path
        ], null)
      );

    delete from public.snippets where id = v_snippet.id;
  end loop;
end;
$$;

grant execute on function public.cleanup_old_snippets() to postgres;

-- Replace the HTTP-based cron job with a direct SQL function call.
select cron.unschedule('nightly-cleanup');

select cron.schedule(
  'nightly-cleanup',
  '0 2 * * *',
  'select public.cleanup_old_snippets()'
);
