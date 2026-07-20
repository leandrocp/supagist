# Supagist Release Hardening Plan

This plan closes the release blockers found in the Auth, Storage, database, Realtime, dependency, and CI audits. Work proceeds strictly in order; each item must pass its focused tests before the next item begins.

**Status:** Completed and deployed on 2026-07-20. Production release `d962dec9a392` passed every required GitHub Actions job, the hosted migration matrix, the cleanup invocation, and the production smoke suite.

## 1. Enforce Storage ownership

- Change `snippet-images` object policies so authenticated users can insert and delete only objects they own.
- Put new object paths under a caller-owned prefix and validate that prefix in RLS.
- Preserve public CDN reads without allowing bucket listing.
- Add real local-Supabase integration tests for cross-user insert, delete, and path isolation.

**Exit criteria:** Alice can manage Alice's files; Bob and anonymous/persistent users cannot mutate Alice's files; public URLs still work.

## 2. Harden Auth transitions and redirects

- Reject anonymous users in the publish server action, not only in the UI.
- Replace redirect string checks with same-origin-safe path validation that rejects backslashes and control characters.
- Re-establish an anonymous session after logout when the app needs visitor identity.
- Add regression tests for anonymous publishing, adversarial redirects, and logout-to-anonymous behavior.

**Exit criteria:** only persistent accounts can publish, redirect inputs cannot escape the app origin, and logout leaves the visitor in a valid anonymous state.

## 3. Make publish and rate limits non-bypassable

- Enforce snippet publishing limits at the database boundary so direct PostgREST inserts cannot bypass them.
- Replace the caller-controlled generic rate-limit RPC with purpose-specific, identity-derived interfaces.
- Fail closed when rate-limit checks error.
- Add local integration tests for direct inserts, per-user limits, and cross-user bucket manipulation.

**Exit criteria:** the server action and direct API access obey identical limits, and callers cannot choose another user's key, limit, or window.

## 4. Bound visits, annotations, and Realtime trust

- Rate-limit or deduplicate visit counting and prevent arbitrary analytics inflation.
- Add database constraints for comment length, emoji values/length, and line numbers within the target snippet.
- Stop treating unauthenticated public broadcasts as authoritative annotation state; use RLS-backed Postgres Changes or private authorized channels.
- Harden cleanup against visit races and verify Storage cleanup through a supported API/path.
- Add integration and component/E2E regression coverage.

**Exit criteria:** malformed or oversized annotations are rejected, analytics cannot be trivially inflated, forged broadcasts do not become UI truth, and active snippets cannot be deleted by a cleanup race.

## 5. Upgrade and lock vulnerable dependencies

- Upgrade Next.js, `ws`, and affected transitive dependencies to patched versions.
- Replace floating `latest` production dependency declarations with reviewed semver ranges.
- Add a production dependency audit to CI.
- Run unit tests, coverage, lint, formatting, and production build after the lockfile change.

**Exit criteria:** `npm audit --omit=dev --audit-level=high` passes or every residual advisory has an explicit reviewed exception.

## 6. Run the complete local Supabase release matrix

- Start Docker and local Supabase from a clean state.
- Run `supabase db reset --local` through every migration.
- Run RLS, Storage, rate-limit, Auth, Realtime, cleanup, smoke, and authenticated E2E suites.
- Verify hosted-project Auth URLs, GitHub callback, bucket configuration, function grants, publication membership, cron jobs, and security advisors.

**Exit criteria:** all local integration/E2E suites pass and the hosted configuration matches the tested release assumptions.

## 7. Cut and validate the exact release candidate

- Remove or ignore local agent artifacts and create focused reviewed commits for the product changes.
- Add CSP and disable unnecessary framework disclosure.
- Enable production error/uptime monitoring and document deploy, rollback, backup/recovery, cron, and incident procedures.
- Run the complete validation suite from a clean checkout of the exact release SHA.
- Require every GitHub Actions job to pass before deployment.

**Exit criteria:** the exact release commit is reproducible, fully green in CI, operationally observable, and approved for deployment.
