# Supagist Operations Runbook

## Ownership and release gate

The repository owner is the release and incident owner. A production deployment requires:

1. A clean, reviewed release commit.
2. Green lint, format, unit, coverage, build, local Supabase integration, smoke E2E, and authenticated E2E checks.
3. `npm run audit:prod` with no high or critical findings.
4. A reviewed `supabase db push --linked --dry-run --include-all` result.
5. Every required GitHub Actions job green for the exact release SHA.

Never deploy from an uncommitted working tree.

## Deploy

```bash
npm ci
npm run audit:prod
npm run lint
npm run fmt:check
npm test
npm run test:coverage
npm run build

supabase db push --linked --dry-run --include-all
# Review the exact migration list before the mutating command:
supabase db push --linked --include-all
supabase functions deploy cleanup
```

After deploying the `cleanup` function, configure the Supabase Cron integration to invoke it nightly at `0 2 * * *` using a **secret/service** API key. Never commit or place that key in browser-visible environment variables. The function queues stale snippets transactionally and removes assets through the Storage API; `storage_cleanup_queue` retains failures for retry.

Deploy the application only after database migrations and the Edge Function succeed. Verify:

```bash
curl --fail --silent --show-error https://supagist.app/api/health
```

Then exercise login, publish, snippet rendering, reaction, comment, PNG/SVG export, and logout in the production deployment.

### Current production baseline

- Release `d962dec9a392` was deployed on 2026-07-20.
- Supabase stores the function credential in Vault as `cleanup_function_secret`; Cron sends it only in the `apikey` header expected by `auth: ["secret"]`.
- `nightly-cleanup` invokes the `cleanup` Edge Function at `0 2 * * *`; `cleanup_rate_limit_buckets` runs at `30 2 * * *`.
- A one-row cleanup invocation and the Vault-backed `pg_net` request both returned HTTP 200 after deployment.
- Hosted physical backups were present before migration deployment.

## Monitoring

- `.github/workflows/uptime.yml` probes `/api/health` every 15 minutes.
- `/api/health` checks both the application and a public RLS-backed database query.
- `instrumentation.ts` emits structured server errors to platform stderr.
- `app/error.tsx` forwards sanitized client route errors to `/api/errors`; that route emits structured platform logs without cookies, headers, or stacks.
- Configure GitHub Actions failure notifications and Vercel log/error alerts for `server_request_error` and `client_route_error` events.
- The health endpoint and error logs include the deployed commit prefix when Vercel provides it.

## Rollback

### Application-only regression

1. Pause deployments.
2. Redeploy the last known-good Vercel commit.
3. Verify `/api/health` and the critical flows above.
4. Keep forward-compatible database migrations in place unless a reviewed rollback migration is required.

### Database migration regression

Do not edit or delete an applied migration. Create a new forward-only corrective migration with:

```bash
supabase migration new correct_<issue>
```

Test it with `supabase db reset --local`, the integration suite, and a dry-run against the linked project before pushing.

### Edge cleanup regression

1. Disable the nightly cleanup Cron job.
2. Do not delete `storage_cleanup_queue`; it is the retry ledger.
3. Redeploy the last known-good `cleanup` function.
4. Invoke one small batch and confirm both Storage removal and queue deletion before re-enabling Cron.

## Backup and recovery

- Confirm Supabase automated backups and point-in-time recovery are enabled before release.
- For accidental database deletion, stop writes, identify the incident timestamp, and restore through Supabase support/dashboard recovery tooling.
- Storage objects are not restored by direct edits to `storage.objects`. Use the Storage API or S3-compatible endpoint.
- Snippet cleanup writes paths to `storage_cleanup_queue` before deleting database rows, allowing failed Storage removals to be retried.

## Incident response

1. **Detect:** uptime workflow, platform alert, user report, or Supabase advisor.
2. **Contain:** pause deployments; disable cleanup Cron for deletion/storage incidents; disable affected Auth provider if credential compromise is suspected.
3. **Assess:** record release SHA, UTC start time, affected routes/users, database migration version, and relevant structured error events.
4. **Recover:** roll back the app or ship a tested forward migration; restore data only through approved Supabase recovery paths.
5. **Verify:** health endpoint plus login, publish, view, reaction, comment, export, and logout.
6. **Follow up:** rotate compromised secrets, document root cause, add a regression test, and update this runbook.

## Secret rotation

Rotate GitHub OAuth, Supabase secret/service keys, and deployment credentials in their provider dashboards. Update only encrypted deployment/Edge Function secrets. Public publishable keys may be browser-visible; secret/service keys must never use a `NEXT_PUBLIC_` name.
