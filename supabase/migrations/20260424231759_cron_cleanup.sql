-- ============================================================
-- Nightly cleanup cron job
--
-- Prerequisites:
--   1. Deploy the `cleanup` Edge Function.
--   2. Set the project URL in the database:
--        alter database postgres
--          set app.cleanup_url = 'https://<project-ref>.supabase.co/functions/v1/cleanup';
--      (replace <project-ref> with your Supabase project reference)
--   3. The cleanup function validates requests via
--      Authorization: Bearer <service_role_key>. Store the key:
--        alter database postgres
--          set app.service_role_key = '<service-role-key>';
--      Or use the Supabase Vault for better secret management.
--
-- The job runs at 02:00 UTC every night.
-- ============================================================

-- pg_cron and pg_net are pre-enabled on hosted Supabase projects.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'nightly-cleanup',
  '0 2 * * *',
  $$
  select net.http_post(
    url     := current_setting('app.cleanup_url', true),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body    := '{}'::jsonb
  ) as request_id;
  $$
);
