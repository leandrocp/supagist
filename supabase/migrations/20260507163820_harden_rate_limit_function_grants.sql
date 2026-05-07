-- ============================================================
-- Strip the default `EXECUTE TO anon, authenticated` grants that
-- Supabase auto-applies to every public-schema function. The previous
-- migration's `revoke all from public` only touched the PUBLIC pseudo-
-- role; explicit role grants survived.
--
-- Final shape:
--   - check_rate_limit          → authenticated, service_role only
--   - cleanup_rate_limit_buckets → service_role only (cron-invoked)
--   - enforce_user_content_rate_limit → service_role only
--     (called from the BEFORE INSERT triggers under the function owner;
--      no role needs direct REST access)
-- ============================================================

revoke execute on function public.check_rate_limit(text, integer, interval)
  from public, anon;

revoke execute on function public.cleanup_rate_limit_buckets()
  from public, anon, authenticated;

revoke execute on function public.enforce_user_content_rate_limit()
  from public, anon, authenticated;
