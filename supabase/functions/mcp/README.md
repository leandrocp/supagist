# Supagist MCP server

A remote MCP server, `supagist`, on a Supabase Edge Function. Tools:

| Tool              | Input                                                           | Output                                                           | Writes |
| ----------------- | --------------------------------------------------------------- | ---------------------------------------------------------------- | ------ |
| `render_snippet`  | code plus appearance; `format` `svg` (default) or `png`         | SVG document as text, or a PNG as MCP image content plus size    | no     |
| `search_themes`   | `query`, `family`, `appearance` (dark/light), `limit`, `offset` | a JSON page of `{id, appearance, family, kind}` and `nextOffset` | no     |
| `list_options`    | none                                                            | formats, languages, themes, brands, backgrounds, fonts, limits   | no     |
| `publish_snippet` | code plus appearance, optional `title` and `visibility`         | link (private by default), stored SVG URL, redaction counts      | yes    |
| `update_snippet`  | `snippet` link plus `title`, `visibility`                       | link, visibility, redaction counts                               | yes    |
| `delete_snippet`  | `snippet` link                                                  | the deleted link                                                 | yes    |

Descriptions and server instructions are in `server.ts`; `server_test.ts`
keeps them from naming other tools (Google Connected Apps snapshots them).

## SVG on Edge, PNG on Vercel Node

SVG renders in this function. PNG does not: Edge's 2 s CPU cap cannot
rasterize (see the measurements below), so for `format: "png"` the function
POSTs the same input to `https://supagist.app/api/render` with the caller's own
`Authorization` header (`png.ts`). That route renders the SVG through the
`render` function and rasterizes it with native resvg (`lib/render-api.ts`).
There is no second rasterizer. MCP PNGs are inline previews, so `pixelRatio` is
1 or 2 (default 2); the CLI API's 4× and 6× are not offered here. For larger
output, use SVG, which scales losslessly. A PNG call counts against both this
server's render quota and the render API's per-user quota for the same account.
Set `SUPAGIST_RENDER_API_URL` to point a local function at a local web app
(see CONTRIBUTING.md).

## Themes and close matches

`search_themes` searches the ~240 themes (Lumis themes plus the app's brand
themes). `appearance` comes from each theme's own data, and `family` from the
upstream Neovim plugin that `@lumis-sh/themes` NOTICE.md records for it (for
example `EdenEast/nightfox.nvim` groups dayfox, terafox and nightfox). Brand
themes use their brand as the family. `spike/prepare-render.mjs` generates the
catalog as `spike/generated/theme-catalog.json`. An unknown `theme` or
`language` in a render is rejected with up to five close matches.

## Older clients

Tool schemas were SVG-only before, with a hidden `fixture` benchmark field.
Clients with a cached schema keep working: `fixture` is accepted and ignored,
and `format: "svg"` with `pixelRatio` 1 or 2 behaves as before. Every other
unknown field is still rejected, and the advertised schema stays closed
(`additionalProperties: false`).

## Brand presets and advanced controls

For Supabase style, send `brand: "supabase"`, **not** `theme: "supabase-dark"`.
`list_options` exposes all 33 app brand recipes plus backgrounds, fonts, sizes,
spacing, corners, window decorations and metadata defaults. Explicit fields
override the selected preset; partial header/footer settings merge with it.
`render_snippet` also accepts supplied reaction/comment data and author labels.
`aspectRatio: "16:9"` centers the card on a 1600×900 background canvas, and
`ligatures: false` splits operator ligatures such as `|>` into absolutely
positioned characters (resvg ignores `font-variant-ligatures`). Both default off
unless the brand sets them (the Lumis and MDEx presets use 16:9, no ligatures).
See the skill's [complete parameter guide](../../../skills/supagist/reference/features.md).

Named fonts and brand pattern images are embedded. `system` uses JetBrains Mono
for portability. Comments embed Hack as a missing-glyph fallback where needed.
Remote avatar URLs and custom fonts are not accepted. Rendering does not publish
or fetch saved collaboration. More than 30 visual rows (wrapping/comments
included) is rejected rather than silently cropped. Unknown fields are rejected,
apart from the legacy `fixture`.

Run the public examples through local Supabase with:

```sh
node supabase/functions/mcp/verify/appearance.mjs /tmp/supagist-appearance
mise exec deno@2.9.0 -- deno test --config supabase/functions/mcp/deno.json \
  --allow-read --allow-net --allow-env supabase/functions/mcp/spike/render.deno.ts
```

The original uncompressed-bundle caveat below still applies; adding
fonts/patterns is not a claim that the local ESZIP satisfies a hosted size limit.

## Live endpoint and rate limits (2026-10-29)

The function is live and intentionally stays live. Main pushes deploy it via
Supabase's GitHub integration. The original spike conclusions below are retained
as historical measurements, not instructions to remove the service.

Every authenticated MCP HTTP request consumes the IP backstop (20/minute,
300/day) before the SDK dispatches anything. The backstop is keyed on IP _and_
verified user, so users sharing an egress IP (for example Google's Connected
Apps traffic) never throttle each other. Each `tools/call` also consumes the
user quota (5/minute, 100/day); connection setup (initialize, notifications,
lists, GET) does not, so many clients on one account cannot exhaust it before
their first tool call. `render_snippet` also consumes a separate user quota
(3/minute, 20/day), and `publish_snippet` its own (3/minute, 10/hour, 20/day;
the hour cap stays inside the snippets INSERT trigger's 10/hour, so MCP-only
publishing is refused with -32300 before the trigger fires). Constants live in
`rate-limit.ts`. All checks call the existing `public.check_rate_limit` RPC using
`ctx.supabaseAdmin`.

`search_themes` and `list_options` consume only the IP backstop and the user
quota. `publish_snippet` (2026-11-01) redacts secrets (`redact.ts`), renders the SVG,
then uploads it and inserts the snippet with the caller-scoped client, so RLS,
Storage policies and the publish trigger apply as the signed-in user. Snippets
are `private` unless `visibility: "public"` is passed, and store no PNGs. `verify/publish.mjs` checks the contract
against local Supabase in CI.

`update_snippet` and `delete_snippet` (2026-11-01, `manage.ts`) take a snippet
link and act only on the caller's own snippets, through the caller-scoped
client: RLS owner policies and the snippets guard trigger decide what can
change. Published snippets are sealed, so updates change only the title
(redacted like a publish) and visibility; deletes cascade annotations and queue every stored file for
cleanup, and remove the caller's files right away. `verify/manage.mjs` checks
both in CI.

The sole exception is leandro@leandro.io, matched by its verified auth user ID
in `rate-limit.ts`: that account bypasses all user, render, and IP quota checks.
Authentication, input validation, and batch rejection still apply. Everyone else's limits are unchanged. User quotas
are shared across all connections for the same account, not reset when a new
client connects.

Denied attempts also count. The RPC uses first-request-relative windows and
returns only a boolean, so `Retry-After` conservatively reports the full denied
window: 60 seconds or 86,400 seconds (the longer when both fail). HTTP 429
responses contain a JSON-RPC error with code `-32300` (`USER_RATE_LIMITED`, per
Google's Connected Apps integration standards) and the message
`Rate limit reached. Try again in up to 1 minute. Need more? Contact supagist@leandro.io`
(`24 hours` when a daily quota is exhausted). Some clients surface HTTP 429
before displaying the MCP body. RPC outages fail closed with 503.

The IP key uses the first `x-forwarded-for` hop, then `cf-connecting-ip`, then
`x-real-ip`; absent headers share an `unknown` bucket. This backstop depends on
the gateway supplying trustworthy headers; verified user quotas remain the
primary control. OAuth discovery, preflight, and rejected authentication never
dispatch tools, never reach the database, and are not rate limited here. Legacy
JSON-RPC batches are rejected with 400 to prevent many renders bypassing the
per-tool quota.

### Connect with OAuth

Add the endpoint as a remote **Streamable HTTP** MCP server. The server supports
JSON and SSE response bodies; this is not the legacy SSE transport. For Claude Code:

```bash
claude mcp add --transport http --scope local supagist \
  https://zivpihasridowvzrgiix.supabase.co/functions/v1/mcp
```

Open `/mcp`, authenticate with an existing Supagist account, and review the client,
return address, and scopes at `https://supagist.app/oauth/consent` before approving.
For another remote MCP client, add the same URL and choose OAuth authentication.
Remove any old static Authorization header to allow OAuth discovery.

Hosted Auth must have `oauth_server_enabled` and
`oauth_server_allow_dynamic_registration` enabled, with
`oauth_server_authorization_path` set to `/oauth/consent`. The Site URL stays
`https://supagist.app`. These are Management API settings, not a database migration.
The issuer is `https://zivpihasridowvzrgiix.supabase.co/auth/v1`; metadata lives at
`https://zivpihasridowvzrgiix.supabase.co/.well-known/oauth-authorization-server/auth/v1`.

For a bearer curl alternative, privately set `MCP_TEST_ACCESS_TOKEN` to an existing
signed-in account's short-lived access token, not an anon/publishable/service-role
key. Keep it out of chat, command history, and tracked config. The endpoint is stateless:

```bash
curl -i https://zivpihasridowvzrgiix.supabase.co/functions/v1/mcp \
  -H "Authorization: Bearer $MCP_TEST_ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'MCP-Protocol-Version: 2025-06-18' \
  --data '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"render_snippet","arguments":{"code":"const answer = 42;","language":"javascript","theme":"github_dark"}}}'
```

SVG is returned as MCP text, not a saved file or public URL. Extract the complete
SVG text from the result and save it as `.svg`; renaming a JSON envelope is not
enough. With `"format":"png"` the first content item is an MCP image
(`mimeType: image/png`, base64 `data`) and the second is `{format, width, height}`.

### Repeat the checks

```bash
mise exec deno@2.9.0 -- deno test --config supabase/functions/mcp/deno.json \
  --allow-read --allow-net --allow-env \
  supabase/functions/mcp/input_test.ts supabase/functions/mcp/rate-limit_test.ts \
  supabase/functions/mcp/server_test.ts supabase/functions/mcp/themes_test.ts
# Requires local Supabase + functions serve; creates only a disposable LOCAL user.
node supabase/functions/mcp/verify/rate-limit.mjs
# Requires existing hosted credentials; never creates hosted users or resets buckets.
node supabase/functions/mcp/verify/rate-limit.mjs --production
```

Hosted mode accepts `MCP_TEST_ACCESS_TOKEN`, or `MCP_TEST_EMAIL`,
`MCP_TEST_PASSWORD`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. It stops without
calling tools if credentials are absent. Start with an unused test-account
minute quota; the test deliberately consumes 6 render attempts and checks the
6th gets 429, while `tools/list` and `list_options` still work. Output, full
redacted HTTP/MCP transcripts, and sample exports are saved separately under
`.amp/in/artifacts/mcp-rate-limit/{local,production}/`. Auth secrets and cookies
are never written there. The script then waits 61 seconds, verifies that a 4×
PNG is rejected by validation, and confirms SVG recovery. Local evidence is not production proof.

## Historical M0 recommendation

The following measurements and commands apply to the pre-SVG-only spike. They
are why PNG now rasterizes on Vercel Node rather than here. To
reproduce the PNG benchmarks (`verify/limits.mjs` and `verify/measure.mjs`), use
the historical spike commit `823a631`, not the current endpoint.
The current `verify/local.mjs` validates all six SVG fixtures and format validation,
waiting for quota windows rather than bypassing the limiter.

**Recommendation: pursue the Vercel Node fallback (option C). Do not promote
this spike to production.** Option C is a recommendation, not a benchmarked
implementation. Nothing beyond M0 was built.

Date: 2026-10-29. Base: `42d5cf5527412764ff8eb95fc57c1c39dc37498c`.
Local orb: Linux x86_64, 8 logical CPUs, Intel Xeon 2.60 GHz.
CLI **2.117.0**, Edge Runtime **1.74.3** (Deno-compatible 2.1.4), image ID
`sha256:04332d354964b089d81eb872ce1604119a9cf62b54d3556338f3a46d81bfcc8e`.
Lumis **0.9.0**, themes **0.4.0**, resvg-wasm **2.6.2** (historical; the function now ships Lumis 0.10.4 / themes 0.4.4).

## What failed under actual local Edge limits

`supabase start` and `supabase functions serve mcp` ran the authenticated tool
through the normal local gateway. **10/12 fixture/format/ratio combinations
completed. Both avatar PNGs failed**: at 1× and 2× the runtime logged
`CPU time limit reached`, then closed the SSE response mid-stream. These are
real failures, not simulated failures or a wall-clock timeout. See
`results/cli-limits.json` and `results/cli-limits.log`.

- 30 lines + avatars, PNG 1×: **2,695 ms cold worker CPU**, above 2,000 ms.
- Same at 2×: **8,007 ms cold worker CPU**, about 4× the hard CPU budget.
- Short Vercel card at 2×: **1,376 ms**, below 2 s but above the ~1.2 s target.
- Avatar 2× post-render isolate memory is already **263.0 MB**. This is a
  snapshot, not peak; even this lower bound exceeds the plan's <150 MB bar.
- Final local ESZIP with static files: **30,183,890 bytes (30.18 MB / 28.79 MiB)**,
  above the documented 20 MB local-bundle limit. No deployment was attempted.

SVG generation alone was viable in these local samples. The required combined
SVG/PNG workload is not. Packaging improvements alone cannot fix the measured
rasterization CPU failure.

## Measurements

All times below are **milliseconds** and memory is decimal **MB**. C/W means
cold/warm. These are single samples per cell, not p95s or hosted capacity claims.

| Fixture                     | Ratio | Format | Cold worker CPU | Warm container CPU proxy |  Wall C / W | Isolate snapshot C / W | Container peak through pair | Worker CPU for pair |
| --------------------------- | ----- | ------ | --------------: | -----------------------: | ----------: | ---------------------: | --------------------------: | ------------------: |
| Plain                       | 1×    | SVG    |             370 |                       34 |   1443 / 22 |            74.8 / 66.0 |                       290.7 |                 416 |
| Plain                       | 1×    | PNG    |             486 |                      151 |   1609 / 29 |            69.0 / 69.4 |                       383.1 |                 507 |
| Plain                       | 2×    | SVG    |             393 |                       42 |   1386 / 21 |            74.7 / 66.0 |                       288.8 |                 417 |
| Plain                       | 2×    | PNG    |             458 |                      121 |   1496 / 34 |            71.2 / 71.2 |                       383.7 |                 489 |
| Vercel + shadow             | 1×    | SVG    |             410 |                       39 |   1446 / 18 |            74.9 / 66.1 |                       293.4 |                 402 |
| Vercel + shadow             | 1×    | PNG    |             754 |                      507 |  1809 / 242 |            75.3 / 75.4 |                       459.5 |                 981 |
| Vercel + shadow             | 2×    | SVG    |             408 |                       40 |   1483 / 18 |            63.9 / 66.9 |                       298.8 |                 458 |
| Vercel + shadow             | 2×    | PNG    |            1376 |                      744 |  2359 / 661 |            90.0 / 90.9 |                       458.1 |                2025 |
| Vercel + 30 lines + avatars | 1×    | SVG    |             410 |                      101 |   1471 / 31 |            63.8 / 67.1 |                       315.7 |                 440 |
| Vercel + 30 lines + avatars | 1×    | PNG    |            2695 |                     1938 | 3720 / 1620 |          123.3 / 122.9 |                       475.0 |                4336 |
| Vercel + 30 lines + avatars | 2×    | SVG    |             422 |                      101 |   1389 / 36 |            63.8 / 67.7 |                       310.9 |                 446 |
| Vercel + 30 lines + avatars | 2×    | PNG    |            8007 |                     5977 | 8926 / 5592 |          262.4 / 263.0 |                       597.5 |               13396 |

Measurement definitions matter:

- **Cold worker CPU** is Edge Runtime's `Shutdown.cpu_time_used` from a
  separate fresh isolate serving exactly one request. It includes isolate
  initialization/teardown and is actual CPU, not elapsed time. That control runs
  after the pair, so dependency downloads are cached; the isolate is still cold.
- **Warm CPU proxy** is the dedicated container's `cpu.stat usage_usec` delta
  around its second request. It includes main/event workers, native compilation
  and transport work. **It is not exact per-request isolate CPU.** The stock
  runtime only emits isolate CPU at shutdown. The last column records that exact
  total for the two-request worker; it is not divided or differenced to invent
  warm CPU. Raw cold container CPU is also in the JSON.
- **Wall** is client time through fully consumed SSE. Each pair starts a fresh
  container with empty dependency cache. Warm means the **same verified worker
  ID**; no auth/options request precedes its cold render.
- **Memory snapshots** are the runtime's latest `usedHeapSize + externalMemory`
  checks after each response, not total peak. **Exact per-isolate peak is
  unavailable.** Kernel cgroup `memory.peak` is a real high-water mark, but for
  the entire dedicated container through the pair, including module cache,
  runtime, main/event workers and response buffering. It cannot be compared
  directly to the 150 MB isolate target or 256 MiB isolate limit.
- To finish outputs and genuine warm pairs after the ordinary-limit failures,
  this diagnostic matrix explicitly uses **60,000 ms CPU / 512 MiB memory**.
  A 256 MiB diagnostic run retired the 2× avatar isolate before reuse. Diagnostic
  success is **not an Edge-limit pass**. Normal `functions serve` limits and
  function configuration were not increased.

Raw samples and worker lifecycle events are in `results/measurements.json` and
`results/runtime-events.log`. See `bench/README.md` for the runtime measurement
sources and API limitations.

## Bundle and parser loading

The bundle was built with the **same local runtime image**, `edge-runtime
bundle`, and the static asset glob. Every static file's actual bytes were
verified inside the ESZIP. No `functions deploy` or management request was used.

| Packaging                                            | ESZIP bytes | Against 20 MB |
| ---------------------------------------------------- | ----------: | ------------- |
| Direct npm renderer imports                          |  73,442,927 | Over          |
| Browser-only renderer prebundle, exact same versions |  30,183,890 | Over          |

Final SHA-256:
`157685e4ffafe14ad72876ed1119ce62c749d3f8b488401c619711ef9ba4b252`.
This is the local uncompressed ESZIP size, not a claim of hosted upload acceptance.
The initial npm VFS included unused GNU/musl native Lumis binaries (30.3 MB)
despite `/client` being selected. The isolated browser prebundle removes those,
unused theme formats, Tree-sitter debug files and duplicate resvg WASM. Further
protocol/auth dependency packaging is possible; it would not remedy PNG CPU.

**Runtime parser loading works.** No parser WASM is in the bundle. The function
uses `wasmResolver` with exact package versions/digests copied from the app's
installed parser metadata. JavaScript was fetched from
`@lumis-sh/wasm-javascript@0.26.4/tree-sitter-javascript.wasm`, verified and used
for colored tokens in actual local Edge exports. A separate real Edge call
also fetched/highlighted Python using `github_light`. Tests reject corrupt bytes
and network failures instead of silently returning plaintext. CDN availability,
latency and hosted egress remain external dependencies.

## Outputs and browser comparison

`results/` contains all six Edge PNGs and six Edge SVGs plus corresponding
Chromium exports. Over-budget PNGs are diagnostic outputs, not successful
ordinary-limit responses. `verify/browser.mjs` serves the **unchanged app**
`createHighlightedSvg` and `renderToFile` modules; Chromium uses the app's real
WOFF2/font and canvas path. It does not rasterize the Edge SVG and call that a
browser-export comparison.

All three fixtures were inspected side-by-side at 1× and 2×: matching layout,
syntax colors, Vercel shadow/guides, 30 visible lines, embedded portrait avatars
on lines 3/15/30, and footer. Minor 1× text antialiasing differs; no material
clipping or layout defect was observed. This is visual comparison, not
pixel-identical renderer parity.

M0 deliberately uses **JetBrains Mono regular** for both comparisons, replacing
Vercel's default Geist; one bundled TTF is sufficient for this experiment. Avatar
images are deterministic PNG portraits, not remote photos; reaction text is
ASCII `+1`, not emoji. These limits do not claim four-font/emoji parity. The
measured JavaScript fixtures are defined in `verify/local.mjs`; the long fixture
contains 30 lines / 2,219 characters and renders at 883×956 or 1766×1912.

## Authentication and scope

The function uses the official MCP server SDK **2.4.0**, `@supabase/server`
**1.9.2**, and the requested pipeline:
`withOAuthProtectedResource()` then `withSupabase({ auth: "user" })`.
Missing/invalid tokens return 401 with discovery; anonymous Auth users return
403 using the verified **`jwtClaims.is_anonymous`** field (not `userClaims`,
which does not expose that claim). Real local ES256 signed-in users can list
options and render. `list_options` advertises 115 languages / 265 themes;
exhaustive language compatibility is not claimed.

Default Supabase URL inference is unchanged; no vanity domain or proxy was
introduced. No tables, migrations, persistent tools, consent UI, rate-limit
system, shared-core extraction, or option C endpoint were added. Full interactive
OAuth/DCR/consent and hosted JWT migration are **not verified** in M0. No hosted
project or data was accessed or changed.

## Reproduce locally

Run from the repository root with Docker available:

```sh
mise install
npm ci
node supabase/functions/mcp/spike/prepare-render.mjs
mise exec supabase -- supabase start
mise exec supabase -- supabase functions serve mcp
```

Keep `functions serve` running. In an orb use its supervised service mechanism
rather than a detached shell. Then:

```sh
# Auth checks pass; the comprehensive renderer smoke intentionally fails when
# it reaches an over-budget PNG. Do not interpret that as a passing smoke test.
node supabase/functions/mcp/verify/local.mjs
# Collect every limit outcome, including failures, without stopping at the first.
node supabase/functions/mcp/verify/limits.mjs
bash supabase/functions/mcp/bench/runtime.sh bundle /tmp/supagist-m0-eszip
```

Diagnostic measurement in an orb (the script restarts this named service once
per case to measure independent container peaks):

```sh
amp orb service start mcp-bench --command \
  'BENCH_CPU_LIMIT_MS=60000 BENCH_MEMORY_LIMIT_MB=512 node supabase/functions/mcp/verify/serve-bench.mjs'
node supabase/functions/mcp/verify/measure.mjs
amp orb service stop mcp-bench
```

Browser comparison: run `node supabase/functions/mcp/verify/browser.mjs`, then
open its loopback port 4173 `/m0` in the orb browser. It saves all 12 browser
exports. These verification scripts create only disposable **local** Auth users
and refuse hosted origins.

Verification performed: `mise run test` with local integration credentials
(**629 passed, 1 pre-existing expected failure, zero skipped**), `npm run lint`,
`npm run typecheck`, formatter check, Deno input test and three real-WASM
renderer tests. No test was removed or disabled. The all-render Edge smoke
**fails as documented**; its failure is the spike's negative result.

**Local numbers only approximate hosted Edge.** Hardware, CPU accounting,
compiler/cache behavior, true isolate peak, concurrency, deployment acceptance,
network conditions and full OAuth client flows require separate hosted checks
if option A is ever revisited. Hosted checks were deliberately not performed.
The CPU failures and >150 MB memory snapshot are enough for this M0 **NO-GO**;
option C should be evaluated next, without carrying this generated spike adapter
forward as the planned shared core.
