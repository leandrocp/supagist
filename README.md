<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/brand/readme/readme-banner-dark.png">
  <img alt="Supagist. Share a code snippet. Reactions and comments on every line." src="./assets/brand/readme/readme-banner.png" width="1280">
</picture>

<p align="center"><strong>Share a code snippet. Reactions and comments on every line.</strong></p>

<p align="center">
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/github/license/leandrocp/supagist"></a>
  <a href="https://github.com/leandrocp/supagist/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/leandrocp/supagist/ci.yml?branch=main"></a>
  <a href="https://supagist.app"><img alt="Live at supagist.app" src="https://img.shields.io/badge/live-supagist.app-black"></a>
  <a href="#mcp"><img alt="MCP endpoint: supagist.app/mcp" src="https://img.shields.io/badge/MCP-supagist.app%2Fmcp-black"></a>
</p>

<p align="center">
  <a href="https://supagist.app">Website</a> ·
  <a href="#mcp">MCP</a> ·
  <a href="#cli">CLI</a> ·
  <a href="#agent-skill">Agent skill</a> ·
  <a href="./CONTRIBUTING.md">Contributing</a>
</p>

## What it is

Supagist is a place to share code and talk about it line by line. Paste a snippet, get a link, and anyone with the link can react to or comment on the exact line they mean. You can also turn a snippet into a polished image, or have your coding agent do it for you.

- Per-line reactions and comments. Click a line, pick an emoji or start a thread.
- Live presence. The status bar shows who is reading the snippet right now.
- Syntax highlighting by [Lumis](https://lumis.sh): 100+ languages and plenty of themes.
- Image export as PNG or SVG, with brand presets, backgrounds and fonts.
- An [MCP server](#mcp) and a [CLI](#cli) so coding agents and scripts can render code images.

## Getting started

### Website

Open [supagist.app](https://supagist.app), paste your code, and share the link. Reading is free. Sign in with GitHub or email to react and comment.

### MCP

The Supagist MCP server renders code as SVG or PNG from your coding agent, and can publish it as an unlisted link. It speaks Streamable HTTP and signs you in with OAuth, so there is no API key to copy. Endpoint:

```text
https://supagist.app/mcp
```

Add it to your client, then sign in with your Supagist account when the client asks.

**Claude Code**

```sh
claude mcp add --transport http supagist https://supagist.app/mcp
```

Then run `/mcp` inside Claude Code, pick `supagist`, and authenticate.

**Cursor** — add this to `~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project):

```json
{
  "mcpServers": {
    "supagist": { "url": "https://supagist.app/mcp" }
  }
}
```

**Amp**

```sh
amp mcp add supagist https://supagist.app/mcp
```

**Codex**

```sh
codex mcp add supagist --url https://supagist.app/mcp
codex mcp login supagist
```

**VS Code** — add this to `.vscode/mcp.json`:

```json
{
  "servers": {
    "supagist": { "type": "http", "url": "https://supagist.app/mcp" }
  }
}
```

Tools:

| Tool              | What it does                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `render_snippet`  | Renders code as an SVG, or as a PNG the model can see. Supports brand presets, themes, fonts, backgrounds, window chrome, line numbers and more. |
| `search_themes`   | Searches the syntax themes by name, family (for example `catppuccin` or `nightfox`) and light or dark, a page at a time.                         |
| `list_options`    | Lists every supported format, language, theme, brand, background, font and limit. Call it first if you are unsure which values are valid.        |
| `publish_snippet` | Saves the code to your account as an unlisted Supagist link, with secrets redacted first. Your agent should ask you before it publishes.         |
| `update_snippet`  | Edits the title or visibility of one of your snippets, by link; published code is sealed. Secrets are redacted first.                            |
| `delete_snippet`  | Permanently deletes one of your snippets, by link, with its images, reactions and comments.                                                      |

Rendering, searching and listing options save nothing. Every tool is rate limited per account.

### CLI

The `supagist` CLI renders a file or stdin to an SVG or PNG image from the terminal, and publishes it as an unlisted snippet when you want a link. Node.js 22 or later, no runtime dependencies.

```sh
npx supagist src/lib/auth.ts --lines 12-40 --brand supabase --out auth.png
cat main.rs | npx supagist - --filename main.rs --theme dracula --out card.svg
npx supagist options
```

Rendering stores nothing. To get a shareable link instead, sign in once and add `--publish`:

```sh
npx supagist auth login
npx supagist src/app.ts --lines 1-20 --brand supabase --publish
```

Published snippets are unlisted (anyone with the link can view them, nothing lists or indexes them), and common secrets are replaced with `[REDACTED:kind]` before anything is stored. See the [CLI README](./packages/cli/README.md) for every flag, JSON output and limits.

### Agent skill

```sh
npx skills add leandrocp/supagist --skill supagist
```

The [skill](./skills/supagist/SKILL.md) teaches your coding agent to make good code images: pick the right lines, match a brand preset to your project, render with the CLI or the MCP server, check the result, and publish a link only when you ask.

## Contributing

Want to run Supagist locally or send a change? See [CONTRIBUTING.md](./CONTRIBUTING.md). Architecture, operations and security notes live in [ARCHITECTURE.md](./ARCHITECTURE.md), [OPERATIONS.md](./OPERATIONS.md) and [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE). Syntax highlighting by [Lumis](https://lumis.sh).
