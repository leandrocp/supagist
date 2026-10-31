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

Rendering creates nothing on the server: no snippet, no URL, no stored code.
Your code is sent to the Supagist render API to be drawn, so don't render secrets.

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

- `GET /api/options` returns the option catalog as JSON.
- `POST /api/render` takes a JSON body (`code` plus the fields above, as in the
  MCP `render_snippet` tool, and `format: "png"` with `pixelRatio`) and returns
  `image/svg+xml` or `image/png`. The image size is in the `X-Supagist-Width`
  and `X-Supagist-Height` headers. Errors are JSON:
  `{"error":{"code":"…","message":"…"}}`.

## Not yet

`--publish` and `supagist auth login|logout|status` will create shareable
snippets once publishing from the CLI is safe (unlisted by default, with
secrets redacted). Until then they exit with a usage error.

## Develop

From the repository root:

```sh
supabase start
supabase functions serve render
npm run dev
node packages/cli src/app.ts --host http://localhost:3000 --out app.svg
npx vitest run packages/cli       # unit tests
npx playwright test e2e/cli.test.ts --project=chromium   # against the local server
```
