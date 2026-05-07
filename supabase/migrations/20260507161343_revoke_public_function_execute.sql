-- ============================================================
-- Lock down internal SECURITY DEFINER functions and the snippet-images
-- bucket SELECT policy.
--
-- Closes the following advisor findings on the hosted project:
--   - cleanup_old_snippets / handle_new_user / rls_auto_enable callable
--     by anon and authenticated via /rest/v1/rpc/* (CRITICAL for cleanup)
--   - public bucket `snippet-images` allowed listing every uploaded path
--
-- increment_view_count and record_visit stay public — they are designed
-- to be called by anonymous and signed-in clients.
-- ============================================================

-- ── Internal SECURITY DEFINER functions ─────────────────────────────────
-- handle_new_user runs from a row trigger on auth.users; rls_auto_enable
-- runs from an event trigger. Triggers execute under the function owner,
-- not the invoking role, so revoking EXECUTE from anon/authenticated does
-- NOT disable them. cleanup_old_snippets is invoked by pg_cron under the
-- service_role grant, which is unaffected.
--
-- Wrapped in DO so the migration is idempotent across environments where
-- a given function may not exist (rls_auto_enable is auto-installed on
-- hosted Supabase but absent from local stacks).
do $$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'public.cleanup_old_snippets()',
    'public.handle_new_user()',
    'public.rls_auto_enable()'
  ] loop
    if to_regprocedure(v_fn) is not null then
      execute format('revoke execute on function %s from public, anon, authenticated', v_fn);
    end if;
  end loop;
end $$;

-- ── snippet-images bucket: drop the broad SELECT policy ─────────────────
-- Public buckets serve object content via the storage CDN path, which
-- doesn't consult `storage.objects` SELECT policies. The existing policy
-- only enabled directory-style listing (`storage.from(...).list(...)`),
-- which the app does not use. Dropping it removes the path-enumeration
-- vector without affecting public URL access.
drop policy if exists snippet_images_public_read on storage.objects;
