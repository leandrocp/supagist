# Contributing to Supagist

This guide gets you from a fresh clone to a running app, a passing test suite, and a local CLI and MCP server. The user-facing overview is in the [README](./README.md).

## Prerequisites

| Tool                                       | Version     | Source                                                |
| ------------------------------------------ | ----------- | ----------------------------------------------------- |
| [mise](https://mise.jdx.dev) (recommended) | any recent  | installs the pinned tools below                       |
| Node.js                                    | 22 or later | `mise.toml` (`node = "22"`), `package.json` `engines` |
| Supabase CLI                               | 2.117.0     | `mise.toml`                                           |
| Docker (or a compatible runtime)           | any recent  | `supabase start` runs the local stack in containers   |
| Deno                                       | 2.9.0       | only to run the Edge Function tests, as CI does       |
| `gh`, `vercel`                             | latest      | optional, pinned in `mise.toml` for maintainers       |

With mise, `mise install` installs Node, the Supabase CLI, `gh` and `vercel`. Without it, install Node 22+ and the Supabase CLI 2.117.0 yourself.

## Setup

```sh
git clone https://github.com/leandrocp/supagist
cd supagist
mise install
mise run setup
```

`mise run setup` is shorthand for these steps, which you can also run by hand:

```sh
npm install
supabase start                  # local Postgres, Auth, Storage, Realtime, Edge runtime (needs Docker)
supabase db reset               # applies supabase/migrations/*
supabase seed buckets           # creates the storage buckets from supabase/config.toml
cp .env.example .env.local      # only if .env.local doesn't exist yet
```

### Environment variables

`.env.local` is git-ignored. Never commit real values.

| Variable                               | What it is for                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase API URL. Locally `http://127.0.0.1:54321`.                                       |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key. Safe for the browser.                                    |
| `NEXT_PUBLIC_SITE_URL`                 | Optional. Pins generated links and metadata to a canonical domain. Leave unset locally.   |
| `SUPABASE_AUTH_GITHUB_CLIENT_ID`       | Optional, read from your shell by `supabase/config.toml`. Enables GitHub sign-in locally. |
| `SUPABASE_AUTH_GITHUB_SECRET`          | Optional, same as above. Without them, sign in with email and password.                   |

Get the local URL and keys after `supabase start`:

```sh
supabase status                 # human-readable
supabase status -o env          # API_URL, PUBLISHABLE_KEY, SERVICE_ROLE_KEY, ... as shell variables
```

Copy `API_URL` and `PUBLISHABLE_KEY` into `.env.local`. Never put the service-role or secret key in a `NEXT_PUBLIC_` variable.

Local services: API `http://127.0.0.1:54321`, Studio `http://127.0.0.1:54323`, Mailpit (local inbox) `http://127.0.0.1:54324`.

### Migrations

Schema changes live in `supabase/migrations`.

```sh
supabase migration new <name>   # create a new migration file
supabase db reset               # rebuild the local database from all migrations
```

Do not run `supabase db push` against the hosted project yourself. See [Workflow](#workflow).

## Run the web app

```sh
npm run dev                     # or: mise run dev
```

The app runs at <http://localhost:3000>.

## Tests, lint, format and typecheck

```sh
npm test                        # Vitest unit suite (no Supabase needed)
npm run test:integration        # RLS tests against local Supabase (needs `supabase start`)
npm run test:e2e                # Playwright, Chromium project only
npm run test:e2e:all            # all Playwright projects, including authenticated flows
npm run test:coverage           # unit tests with a coverage report
npm run lint                    # oxlint
npm run fmt                     # oxfmt, writes changes
npm run fmt:check               # oxfmt, check only (CI runs this)
npm run typecheck               # tsc --noEmit
```

Run a single test:

```sh
npx vitest run lib/utils.test.ts                   # one file
npx vitest run -t "part of the test name"          # by name
npx playwright test e2e/smoke.test.ts --project=chromium
```

End-to-end tests need a one-time browser install and the local stack:

```sh
npx playwright install chromium
supabase start && supabase seed buckets
supabase functions serve render                    # e2e/cli.test.ts renders through this function
npm run test:e2e
```

The authenticated flows (`npm run test:e2e:auth`) also read `E2E_SUPABASE_URL`, `E2E_SUPABASE_SERVICE_KEY`, `E2E_SUPABASE_ANON_KEY`, `E2E_TEST_SECRET`, `E2E_USER_EMAIL` and `E2E_USER_PASSWORD`. See `e2e/auth.setup.ts`. For a production-like run, use `npm run test:e2e:build`.

The Edge Function tests use Deno, as in [`.github/workflows/ci.yml`](./.github/workflows/ci.yml):

```sh
deno test --config supabase/functions/mcp/deno.json --allow-read --allow-net --allow-env \
  supabase/functions/mcp/input_test.ts supabase/functions/mcp/rate-limit_test.ts \
  supabase/functions/mcp/redact_test.ts supabase/functions/mcp/server_test.ts \
  supabase/functions/mcp/themes_test.ts supabase/functions/mcp/spike/render.deno.ts
deno test --config supabase/functions/render/deno.json --allow-read --allow-net --allow-env \
  supabase/functions/render/handler_test.ts
```

Every fix or feature needs a test. See [AGENTS.md](./AGENTS.md) for the full testing rules.

## Run the CLI locally

The CLI lives in [`packages/cli`](./packages/cli/README.md). It has no dependencies and needs no build step: it is plain JavaScript run by Node 22+.

```sh
node packages/cli/bin/supagist.js packages/cli/src/args.js --lines 1-20 --brand supabase --out code.png
node packages/cli/bin/supagist.js options           # list brands, themes, fonts, languages
```

To get a `supagist` command on your PATH while you work on it:

```sh
npm link ./packages/cli
supagist --help
```

By default the CLI calls the production render API (`https://supagist.app`). Point it at your local stack with `--host` or `SUPAGIST_HOST`:

```sh
supabase start
supabase functions serve render                     # the Edge Function behind /api/render
npm run dev                                         # the app proxies /api/render to it
node packages/cli/bin/supagist.js src/app.ts --host http://localhost:3000 --out app.svg
```

CLI tests:

```sh
npx vitest run packages/cli
npx playwright test e2e/cli.test.ts --project=chromium    # against the local server
```

The CLI is not published to npm. Don't publish it without the maintainer's say-so.

## Run the MCP server locally

The MCP server is the Supabase Edge Function in [`supabase/functions/mcp`](./supabase/functions/mcp/README.md). Locally it needs the Supabase stack, and the web app for the OAuth consent page.

```sh
supabase start
echo 'SUPAGIST_RENDER_API_URL=http://host.docker.internal:3000/api/render' > /tmp/functions.env
supabase functions serve --env-file /tmp/functions.env  # mcp at http://127.0.0.1:54321/functions/v1/mcp
npm run dev -- -H 0.0.0.0                           # /oauth/consent and /api/render on :3000
```

SVG renders inside the MCP function. PNG does not: the function forwards the request, with the caller's own token, to the web app's `/api/render`, which renders the SVG through the `render` function and rasterizes it with resvg on Node. That is why the local setup serves every function, and why the web app listens on `0.0.0.0`, where the function's container can reach it through `host.docker.internal`. Without `SUPAGIST_RENDER_API_URL`, the function sends PNG requests to production.

Check that it answers. An unauthenticated call returns `401`:

```sh
curl -i -X POST http://127.0.0.1:54321/functions/v1/mcp
```

Local OAuth is enabled in `supabase/config.toml` (`[auth.oauth_server]`, dynamic client registration, consent page at `/oauth/consent`). Connect a client the same way as production, with the local URL:

```sh
claude mcp add --transport http supagist-local http://127.0.0.1:54321/functions/v1/mcp
```

Or test with [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```sh
npx @modelcontextprotocol/inspector
```

In the Inspector choose transport **Streamable HTTP**, enter the local URL, and complete the OAuth sign-in. Use a local account (sign up with email on `http://localhost:3000`; confirmation is off locally).

The scripted checks that CI runs against the local functions, each using disposable local users:

```sh
node supabase/functions/mcp/verify/appearance.mjs   # schema, catalog, skill examples
node supabase/functions/mcp/verify/publish.mjs      # publish, redaction, unlisted, rate limit
node supabase/functions/mcp/verify/tools.mjs        # search_themes, PNG, legacy inputs
```

The tools are `render_snippet` (SVG or PNG), `search_themes`, `list_options` and `publish_snippet`. Their descriptions and the server instructions live in `server.ts`. They must not name other tools. That rule comes from Google Connected Apps, which snapshots them at registration, and `server_test.ts` enforces it.

For the production endpoint, rate limits and the OAuth setup, see [`supabase/functions/mcp/README.md`](./supabase/functions/mcp/README.md).

## Agent skill development

The Supagist skill lives in [`.agents/skills/supagist`](./.agents/skills/supagist/SKILL.md). It teaches coding agents to connect to the MCP server over OAuth, save SVG exports as real `.svg` files, and offer optional PNG conversion on the client machine. The skill and MCP use SVG exclusively. PNG conversion runs locally (not in an Edge Function or a hosted renderer), needs Node.js 22+, and needs explicit approval to install its isolated resvg dependency. It never adds dependencies to the user's application and never uploads SVGs for conversion.

Installing the skill and connecting the MCP server are separate steps. The skill includes the connection instructions.

Before publishing changes, validate that the skill is discoverable:

```sh
DISABLE_TELEMETRY=1 npx skills add . --list --skill supagist
```

Run the converter tests:

```sh
node --test .agents/skills/supagist/scripts/
```

The skill follows the [skills.sh GitHub distribution format](https://github.com/vercel-labs/skills/blob/main/docs/creating-skills.md). Preparing these files does not publish a directory listing or install the skill for anyone. After a release, verify the remote command from the README (`npx skills add leandrocp/supagist --skill supagist`). Don't claim a skills.sh listing until it is visible there.

## Project layout

| Path              | What is in it                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| `app/`            | Next.js App Router pages, server actions and API routes                                                 |
| `components/`     | React components, including the editor surfaces                                                         |
| `lib/`            | Shared logic: Supabase clients, rendering, export, URL slugs. `lib/__integration__` holds the RLS tests |
| `hooks/`          | React hooks                                                                                             |
| `packages/cli/`   | The `supagist` command-line tool                                                                        |
| `supabase/`       | `config.toml`, `migrations/`, and Edge Functions (`mcp`, `render`, `cleanup`)                           |
| `e2e/`            | Playwright tests                                                                                        |
| `.agents/skills/` | The Supagist agent skill (and other skills used when working on this repo)                              |
| `assets/brand/`   | Brand kit: logos, banner, favicons, social images. See [`brand.md`](./assets/brand/brand.md)            |
| `public/`         | Static files served by the app                                                                          |

More detail:

- [ARCHITECTURE.md](./ARCHITECTURE.md): auth states, realtime channels, storage layout, the export pipeline and URL design.
- [OPERATIONS.md](./OPERATIONS.md): release, monitoring, rollback, recovery and incident procedures.
- [SECURITY.md](./SECURITY.md): dependency exceptions and how to report vulnerabilities.

## Workflow

- Keep commits small and focused, with a plain message that says what changed and why.
- Run `npm run lint`, `npm run fmt:check`, `npm run typecheck` and `npm test` before you push. CI runs them, plus the build and the end-to-end suites.
- Pushes to `main` deploy automatically: the web app to Vercel, and Edge Functions through Supabase's GitHub integration. Treat `main` as production.
- Hosted Supabase migrations (`supabase db push`) need the maintainer's OK. Write and test them locally, and ask before applying them to the hosted project.
- Never commit secrets. Keep them in `.env.local`.

## Brand assets

Logos, the README banner, favicons and social images live in [`assets/brand/`](./assets/brand/). Read [`assets/brand/brand.md`](./assets/brand/brand.md) for the voice, logo rules and minimum sizes before using or changing them.
