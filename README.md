# supagist

Share a code snippet. Reactions and comments on every line.

[![supagist demo](./public/supagist.png)](https://supagist.app/supagist.mp4)

Live at **[supagist.app](https://supagist.app)**

## Features

- Per-line reactions. Click a line, pick an emoji. Other readers' reactions show next to yours.
- Per-line comments. Each line gets its own thread.
- Live presence. The status bar shows who's reading the snippet right now.
- Syntax highlighting via [Lumis](https://lumis.sh). 100+ languages, plenty of themes.
- Export as PNG or SVG, with optional gradient backgrounds and font choices.
- Sign in with GitHub or email. Reading is free; reacting and commenting need an account.

## Run locally

Tool versions live in `mise.toml` (Node, Supabase CLI, gh, Vercel CLI). Install [mise](https://mise.jdx.dev), then:

```bash
git clone https://github.com/leandrocp/supagist
cd supagist
mise install
npm install
supabase start
supabase db reset
supabase seed buckets

cp .env.example .env.local
npm run dev
```

App runs on `http://localhost:3000`. Studio at `http://127.0.0.1:54323`.

For GitHub OAuth in dev, set `SUPABASE_AUTH_GITHUB_CLIENT_ID` and `SUPABASE_AUTH_GITHUB_SECRET` in your shell. Or skip it and use email/password.

## Tests

```bash
npm test                  # vitest unit suite
npm run test:integration  # RLS tests against local Supabase
npm run test:e2e          # Playwright smoke + auth flows
```

Integration tests boot real users and hit the RLS policies. Run them when touching `snippet_comments` or `snippet_line_reactions`.

## How it works

See [ARCHITECTURE.md](./ARCHITECTURE.md) for auth states, realtime channels, storage layout, the export pipeline, and URL design.

## License

MIT.
