# Supagist CLI

`npx supagist` needs Node.js 22 or later and has no runtime dependencies.
Until the npm package is released, run it from a clone of
https://github.com/leandrocp/supagist with `node packages/cli` in place of
`npx supagist`. If `npx supagist --version` fails because the package isn't
found, use the clone or the [MCP path](mcp.md).

```sh
npx supagist <file|-> [flags]        # render to a file (or stdout)
npx supagist <file|-> --publish      # unlisted snippet, prints its link
npx supagist options [--json]        # brands, themes, fonts, languages, limits
npx supagist auth login|logout|status
```

## Output and input

| Flag                | Values                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| `--out <file>`      | `.png` or `.svg`; the extension picks the format. Also `-o`. Without it, writes to stdout             |
| `--format svg\|png` | Only when the file name has another extension, or for stdout                                          |
| `--lines <a-b>`     | 1-based, inclusive, e.g. `12-40`, or one line `7`. A range past the end stops at the end              |
| `--filename <name>` | Name in the header and for language detection, needed with `-` (stdin)                                |
| `--language <id>`   | Exact language id; by default the server detects it from the filename and code                        |
| `--pixel-ratio <n>` | PNG `1`, `2` (default), `4`, `6`; SVG `1` or `2`                                                      |
| `--json`            | One JSON line on stdout, for results and errors                                                       |
| `--host <url>`      | Another server, e.g. `http://localhost:3000`; also `SUPAGIST_HOST`                                    |
| `--publish`         | Save an unlisted snippet instead of a file. Not with `--out`, `--format`, `--pixel-ratio`, `--author` |
| `--title <text>`    | Page title of a published snippet; also forms the link slug                                           |

## Appearance

Values come from `npx supagist options`. The server applies its defaults, then
the brand, then your flags.

| Flag                                                                 | Values                                                                       |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `--brand <id>`                                                       | See [brands.md](brands.md)                                                   |
| `--theme <id>`                                                       | Syntax theme id, e.g. `dracula`, `github_light`                              |
| `--background <label>`                                               | Canvas label, case-sensitive, e.g. `Ocean`, `Candy`; `none` removes it       |
| `--font <id>`                                                        | `system`, `jetbrains`, `fira`, `geist`, `hack`                               |
| `--font-size <n>`                                                    | 12, 13, 14, 16, 18, 20                                                       |
| `--window <decoration>`                                              | `macos`, `macos-subtle`, `windows`, `minimal`, `none`, `lumis`, `markdown`   |
| `--outer-padding <n>`                                                | 0, 16, 32, 64, 96, 128                                                       |
| `--inner-padding <n>`                                                | 8, 12, 16, 24, 32, 48                                                        |
| `--corner-radius <n>`                                                | 0, 4, 8, 12, 16                                                              |
| `--[no-]line-numbers`                                                | Line numbers                                                                 |
| `--[no-]ligatures`                                                   | `--no-ligatures` keeps `\|>`, `->`, `!=` as typed characters                 |
| `--[no-]word-diff`                                                   | With `diff` input, highlight only the changed words                          |
| `--aspect-ratio 16:9`                                                | Centers the card on a 1600×900 canvas, for social posts                      |
| `--author <name>`                                                    | Author in the footer (render only; a published snippet credits your account) |
| `--[no-]header`, `--[no-]header-filename`, `--[no-]header-language`  | Header row and its items                                                     |
| `--filename-position`, `--language-position`                         | `left`, `center`, `right`                                                    |
| `--[no-]footer`, `--[no-]footer-language`, `--[no-]footer-theme`     | Footer row and its items                                                     |
| `--[no-]footer-lines`, `--[no-]footer-chars`, `--[no-]footer-author` | More footer items                                                            |
| `--footer-align <left\|center\|right>`                               | Footer alignment                                                             |

## Results

```json
{ "ok": true, "path": "auth.png", "format": "png", "width": 1472, "height": 992, "bytes": 184321 }
{ "ok": true, "url": "https://supagist.app/auth-flow-x7k2q9", "image": "https://…/canonical.svg", "visibility": "unlisted", "redactions": { "redacted": 1, "kinds": { "aws_access_key": 1 } } }
{ "ok": false, "error": { "code": "RATE_LIMITED", "message": "Rate limit reached. …", "status": 429, "retryAfter": 60 } }
```

Exit codes: `0` ok, `1` failure (network, server, rate limit, auth, publish
errors), `2` usage (bad flags, or render input the server rejected as
`INVALID_INPUT`). Error codes to act on:

- `INVALID_INPUT`: fix the flag the message names; check `options`.
- `AUTH_REQUIRED`: run `npx supagist auth login` (see below).
- `RATE_LIMITED`: stop. Wait `retryAfter` seconds or tell the user. Never loop.
- `PUBLISH_FAILED`: report the message. Don't retry blindly; a retry after a
  success makes a second snippet.

## Limits

- At most 30 visual rows: lines wrap at 110 columns. Longer input is rejected,
  never cropped.
- 8,000 characters of code.
- Rendering is anonymous: 3 a minute and 20 a day per IP address.
- Publishing: 3 a minute, 10 an hour, 20 a day per account.

## Sign in

`npx supagist auth login` prints a link and opens the browser. Tell the user:
"A browser tab is waiting for you to sign in to Supagist and approve the
Supagist CLI." The command returns when they approve (up to 5 minutes). Run it
in the foreground so the user can see the link. `auth status` exits 0 when
signed in and 1 when not. The CLI keeps its own session in
`~/.config/supagist/`; never copy browser cookies or tokens into it.
