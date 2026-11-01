# supagist

Turn a file or stdin into a [Supagist](https://supagist.app) code image from the
terminal: SVG or PNG, with the same brands, themes, fonts and frames as the web
export. Built for scripts, CI and coding agents.

```sh
npx supagist src/lib/auth.ts --lines 12-40 --brand supabase --out auth.png
cat main.rs | npx supagist - --filename main.rs --theme dracula --out card.svg
npx supagist options --json
```

Requires Node.js 22 or later. No runtime dependencies.

```sh
npm install -g supagist   # or run it without installing: npx supagist
```

Rendering creates nothing on the server: no snippet, no URL, no stored code.
Your code is sent to the Supagist render API to be drawn, so don't render secrets.
`--publish` is the only command that saves anything.

## Render

```sh
supagist <file|-> [options]
```

| Option              | Meaning                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `-o, --out <file>`  | Write to a file. The extension (`.svg` or `.png`) picks the format. Without it, the image goes to stdout.                             |
| `--format svg\|png` | Choose the format when writing to stdout or to a file with another extension. Default `svg`.                                          |
| `--lines <a-b>`     | Render only lines a to b (1-based, inclusive), or one line with `--lines 7`. A range past the end of the file stops at the last line. |
| `--json`            | Print a JSON result, or a JSON error, on stdout.                                                                                      |
| `--host <url>`      | Use another server, such as `http://localhost:3000` or a preview deployment. Also `SUPAGIST_HOST`. Default `https://supagist.app`.    |
| `-h, --help`        | Show help.                                                                                                                            |
| `-v, --version`     | Show the version.                                                                                                                     |

Use `-` to read the code from stdin. The language is detected from the file
name (or `--filename`) and the code, unless you pass `--language`.

An image holds at most 30 visual rows (lines wrap at 110 columns), and the
server rejects larger input instead of cropping it. Pick a range with `--lines`.
Line numbers in the image start at 1.

### Appearance

Every option of the web export is a flag. The server owns the values: run
`supagist options` to see them. New brands or themes work without a CLI update.
The server applies its defaults, then the `--brand` preset, then your explicit
flags, so `--brand vercel --theme dracula` keeps everything from Vercel except
the syntax colours.

| Flag                                                                 | Field                                                |
| -------------------------------------------------------------------- | ---------------------------------------------------- |
| `--brand <id>`                                                       | Complete preset: theme, font, canvas, frame, spacing |
| `--theme <id>`                                                       | Syntax colours only                                  |
| `--background <label>`                                               | Canvas only, for example `Ocean`. `none` removes it  |
| `--font <id>`, `--font-size <n>`                                     | Font and size                                        |
| `--outer-padding <n>`, `--inner-padding <n>`                         | Spacing                                              |
| `--corner-radius <n>`                                                | Corner radius                                        |
| `--window <decoration>`                                              | `macos`, `windows`, `minimal`, `none` and more       |
| `--[no-]line-numbers`                                                | Line numbers                                         |
| `--[no-]ligatures`                                                   | Operator ligatures such as `\|>`                     |
| `--[no-]word-diff`                                                   | Changed-word highlights for `diff` input             |
| `--aspect-ratio 16:9`                                                | 1600×900 canvas for social posts                     |
| `--pixel-ratio <n>`                                                  | SVG: 1 or 2. PNG: 1, 2, 4 or 6. PNG defaults to 2    |
| `--language <id>`, `--filename <name>`                               | Language and the file name shown in the header       |
| `--author <name>`                                                    | Author shown in the footer                           |
| `--[no-]header`, `--[no-]header-filename`, `--[no-]header-language`  | Header row and its items                             |
| `--filename-position`, `--language-position`                         | `left`, `center` or `right`                          |
| `--[no-]footer`, `--[no-]footer-language`, `--[no-]footer-theme`     | Footer row and its items                             |
| `--[no-]footer-lines`, `--[no-]footer-chars`, `--[no-]footer-author` | More footer items                                    |
| `--footer-align <left\|center\|right>`                               | Footer alignment                                     |

The CLI only checks shapes, such as whether `--font-size` is a number. An
unknown brand or theme comes back from the server as a usage error.

## Options

```sh
supagist options          # brands, themes, backgrounds, fonts, languages and more
supagist options --json   # the full catalog, including each brand's settings
```

## JSON output and exit codes

With `--json`, a render prints one line:

```json
{ "ok": true, "path": "auth.png", "format": "png", "width": 1472, "height": 992, "bytes": 184321 }
```

Without `--out`, the image is included instead of `path`: `svg` holds the SVG
text, or `pngBase64` the PNG bytes. Errors look like this, also on stdout:

```json
{
  "ok": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit reached. Try again in up to 1 minute. …",
    "status": 429,
    "retryAfter": 60
  }
}
```

| Exit code | Meaning                                                                       |
| --------- | ----------------------------------------------------------------------------- |
| 0         | Success                                                                       |
| 1         | Failure: network, server, rate limit, unreadable file                         |
| 2         | Usage: bad flags or `--lines`, or input the server rejected (`INVALID_INPUT`) |

## Limits

Rendering is anonymous and limited per IP address: 3 renders a minute and 20
a day, plus 20 requests a minute and 300 a day overall. Rejected renders count
too. On a 429, wait for `retryAfter` seconds instead of retrying in a loop.

## HTTP API

The CLI is a thin client for two endpoints, which you can also call directly:

- `GET /api/options` returns the option catalog as JSON, plus the public
  Supabase project URL and publishable key under `supabase`.
- `POST /api/render` takes a JSON body (`code` plus the fields above, as in the
  MCP `render_snippet` tool, and `format: "png"` with `pixelRatio`) and returns
  `image/svg+xml` or `image/png`. The image size is in the `X-Supagist-Width`
  and `X-Supagist-Height` headers. Errors are JSON:
  `{"error":{"code":"…","message":"…"}}`.

## Publish

```sh
supagist auth login                                    # once per machine
supagist src/lib/auth.ts --lines 12-40 --brand supabase --publish --title "Auth flow"
supagist src/app.ts --publish --json
```

`--publish` saves a snippet to your Supagist account and prints its link on
stdout. It takes the same appearance flags as a render, plus `--title` for the
page heading and link slug. `--out`, `--format`, `--pixel-ratio` and `--author`
don't apply: the snippet is stored as SVG and credited to your account.

- **Unlisted.** Anyone with the link can view the snippet. It is never listed
  or indexed.
- **Secrets are redacted.** Before anything is stored, the server replaces
  common secrets (API keys, tokens, private keys) in the code and title with
  `[REDACTED:kind]`. The output says how many were replaced, never their values.
  It is a safety net, not a guarantee: don't publish code you wouldn't share.
- Each call creates a new snippet. Don't retry a success.
- Errors have the code `PUBLISH_FAILED` (exit 1), including options the
  server rejects, or `AUTH_REQUIRED` when you need to run `supagist auth login`.

```json
{
  "ok": true,
  "url": "https://supagist.app/auth-flow-x7k2q9",
  "image": "https://….supabase.co/storage/v1/object/public/snippet-images/…/canonical.svg",
  "visibility": "unlisted",
  "redactions": { "redacted": 1, "kinds": { "aws_access_key": 1 } }
}
```

Publishing is limited per account: 3 a minute, 10 an hour and 20 a day,
shared with publishing from the web.

## Sign in

```sh
supagist auth login    # opens the browser to approve the CLI
supagist auth status   # exit 0 when signed in, 1 when not
supagist auth logout
```

`auth login` prints a link and opens it in the browser. Sign in to Supagist
and approve **Supagist CLI**. The CLI is its own OAuth client with its own
session: it registers itself, uses PKCE and receives the code on a
`127.0.0.1` loopback port. It never reads or reuses your browser session.
Credentials live in `~/.config/supagist/<host>.json` (or under
`$XDG_CONFIG_HOME`) with mode 0600, and refresh themselves. `--host` picks the
server, so local and preview deployments keep separate sign-ins.
`auth logout` ends the CLI's session on the server and deletes the local file.

## Develop

From the repository root:

```sh
supabase start
supabase functions serve   # render, plus mcp for --publish
npm run dev
node packages/cli src/app.ts --host http://localhost:3000 --out app.svg
npx vitest run packages/cli       # unit tests
npx playwright test e2e/cli.test.ts --project=chromium   # against the local server
```

## Release

Releases go through a release pull request, like Lumis:

1. Every push to `main` that changed shipped CLI files (`bin`, `src`,
   `README.md`, `LICENSE`, `CHANGELOG.md`, `package.json`; not tests) since
   the last `cli/v*` tag opens or updates the `chore(release): cli <version>`
   pull request from `release/cli`. It bumps `package.json` and adds the
   commits to `CHANGELOG.md`.
2. The bump is patch by default. Label the pull request `release:minor` or
   `release:major` to change it; the pull request is rebuilt.
3. Merging it makes `release.yml` tag `cli/v<version>` and publish to npm with
   provenance through npm trusted publishing (no token).

`packages/cli/scripts/release.mjs plan` shows what the next release would be.
0.1.0 was published by hand and tagged `cli/v0.1.0` afterwards.
