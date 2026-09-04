# supagist

Publish a code snippet to [Supagist](https://supagist.app) from your terminal and get a shareable URL back.

```bash
npx supagist auth login
npx supagist app.tsx --brand supabase
# https://supagist.app/app-tsx-ab12cd
```

The CLI does no local rendering. It sends your source and the appearance options to Supagist, which highlights and rasterises the snippet server-side, then returns the URL. Open it to preview the card, react and comment on individual lines, or export the image at the size you want.

## Sign in

```bash
npx supagist auth login     # opens your browser to authorize this machine
npx supagist auth status    # who you're signed in as
npx supagist auth logout
```

`auth login` binds a short-lived listener on `127.0.0.1`, opens the Supagist consent page, and receives the session back once you approve. The session is written to `~/.config/supagist/<host>.json` with mode `0600`. Credentials are stored per host, so signing in to a preview deployment with `--host` won't sign you out of production.

## Publish

```bash
npx supagist app.tsx
npx supagist app.tsx --brand vercel --pixel-ratio 6
npx supagist app.tsx --theme tokyo_night --no-background --line-numbers
cat main.rs | npx supagist - --filename main.rs
```

| Option                     | Description                                                 |
| -------------------------- | ----------------------------------------------------------- |
| `--filename <name>`        | Name shown on the card. Defaults to the file's basename.    |
| `--language <id>`          | Force a language instead of inferring it from the filename. |
| `--brand <id>`             | Apply a brand preset (`supabase`, `vercel`, `stripe`, …).   |
| `--theme <name>`           | Lumis syntax theme.                                         |
| `--background <label>`     | Canvas behind the card.                                     |
| `--no-background`          | Render the card with no canvas.                             |
| `--font <id>`              | `system`, `jetbrains`, `fira`, `geist`, `hack`.             |
| `--font-size <n>`          | `12`, `13`, `14`, `16`, `18`, `20`.                         |
| `--padding <n>`            | Outer padding: `0`, `16`, `32`, `64`, `96`, `128`.          |
| `--inner-padding <n>`      | `8`, `12`, `16`, `24`, `32`, `48`.                          |
| `--corner-radius <n>`      | `0`, `4`, `8`, `12`, `16`.                                  |
| `--pixel-ratio <n>`        | `2`, `4`, `6`.                                              |
| `--window <style>`         | `macos`, `macos-subtle`, `windows`, `minimal`, `none`.      |
| `--line-numbers`           | Show the gutter (`--no-line-numbers` hides it).             |
| `--header` / `--no-header` | Show or hide the window chrome row.                         |
| `--footer` / `--no-footer` | Show or hide the metadata footer.                           |
| `--open`                   | Open the published snippet in your browser.                 |
| `--json`                   | Print `{"url": …, "path": …}` instead of the bare URL.      |
| `--host <url>`             | Target another deployment. Also read from `SUPAGIST_HOST`.  |

A brand sets a complete composition; any option you pass alongside it overrides just that value.

## Exit codes

| Code | Meaning                                                            |
| ---- | ------------------------------------------------------------------ |
| `0`  | Success.                                                           |
| `1`  | The request failed — not signed in, rate limited, or server error. |
| `2`  | Bad usage — unknown flag, missing value, unreadable file.          |

## Limits

Snippets are capped at 8,000 characters. Publishing is rate limited per account (10/hour, 30/day), enforced by the database, so the CLI and the web composer share one budget.

## Environment

| Variable              | Purpose                                      |
| --------------------- | -------------------------------------------- |
| `SUPAGIST_HOST`       | Default host. `--host` takes precedence.     |
| `SUPAGIST_CONFIG_DIR` | Override where credentials are stored.       |
| `XDG_CONFIG_HOME`     | Used to derive the default config directory. |

## Development

The CLI lives in the [supagist repo](https://github.com/leandrocp/supagist) as an npm workspace.

```bash
npm run build:cli        # tsc -> cli/dist
npx vitest run cli/src   # unit tests
node cli/dist/index.js --help
SUPAGIST_HOST=http://localhost:3000 node cli/dist/index.js auth login
```
