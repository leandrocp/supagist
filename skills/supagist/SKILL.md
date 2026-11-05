---
name: supagist
description: Makes polished code images with Supagist, as PNG or SVG files or shareable links, with brand presets, themes, fonts, frames and 16:9 social canvases. Use for code screenshots, "make an image of this function", "share this on X", code images for a README or blog post, Carbon- or ray.so-style requests, or publishing a Supagist snippet link.
license: MIT
compatibility: Uses the supagist CLI (Node.js 22 or later, run with npx supagist) or, without a shell, the Supagist remote MCP server at https://supagist.app/mcp. Publishing needs a Supagist account.
---

# Supagist

Turn code into a good-looking image. You supply the taste (which lines, which
look); Supagist renders it. Render to a file by default. Publish a link only
when the user asks for one.

## Choose the path

- **Shell available (Claude Code, Cursor, Codex, Amp, …): use the CLI.**
  `npx supagist <file> --out image.png`. Every flag is in
  [reference/cli.md](reference/cli.md).
- **No shell, or the Supagist MCP server is already connected:** use the MCP
  tools `render_snippet`, `search_themes`, `list_options` and
  `publish_snippet`. Read [reference/mcp.md](reference/mcp.md) to save the SVG
  correctly and convert it to PNG locally.
- **Editing or deleting a published snippet** is MCP only: `update_snippet`
  (code, title, language, theme, visibility; secrets redacted again) and
  `delete_snippet` (permanent). Both take the snippet link and work only on the
  user's own snippets. Confirm with the user before editing or deleting.

## 1. Pick the lines

- Show the smallest self-contained excerpt that carries the idea, usually
  5–20 lines. An image holds at most **30 visual rows** and lines wrap at
  **110 columns**; the server rejects anything larger rather than cropping.
- Point at a range with `--lines 12-40` instead of copying code around.
- Leave out noise (imports, logging, unrelated branches) only when the meaning
  doesn't change, and say what you dropped. Never invent, rename or "fix" code
  in an image; it must match the source.
- Too long? Ask for a narrower range or agree on several images. Never
  silently truncate.

## 2. Pick the look

- Match a brand preset to the project with the dependency table in
  [reference/brands.md](reference/brands.md): exact package names only.
- The user's words win: a requested brand, theme (`--theme dracula`),
  background (`--background Ocean`), font or size.
- **Brand ≠ theme ≠ background.** "Supabase style" is `--brand supabase`, not
  `--theme supabase-dark`. Explicit flags override single settings of a brand.
- For X, LinkedIn or slides use `--aspect-ratio 16:9` (1600×900). For a diff,
  render `.diff` input with `--language diff --word-diff`. Use
  `--no-ligatures` when the code shows operators such as `|>` or `->` and the
  font would join them.
- Unsure what exists? `npx supagist options` lists brands, themes,
  backgrounds, fonts and languages. Never guess ids.

```sh
npx supagist src/lib/auth.ts --lines 12-30 --brand supabase --out auth.png
npx supagist src/app.ts --lines 1-15 --brand vercel --aspect-ratio 16:9 --out app.png
git diff -- src/parse.ts | npx supagist - --filename parse.diff --language diff --word-diff --out parse.png
```

## 3. Render or publish

- **Render (default).** Writes a file and stores nothing. Code still goes to
  the Supagist render API, so don't render secrets.
- **Publish only when the user wants a link.** Confirm first: "This creates
  a private Supagist snippet; anyone you share the link with can view it.
  Publish?" Then `npx supagist <file> --lines … --brand … --publish --title "…"`.
  - Snippets are **public or private**, like GitHub gists. Published snippets
    are **private** by default: only the user sees them in their list, anyone
    with the link can view them, and they are never indexed. Add `--public`
    only when the user asks for a public snippet.
  - The server replaces common secrets with `[REDACTED:kind]` before storing.
    When `redactions.redacted` is above 0, tell the user what was redacted
    (kinds and counts). Redaction is a safety net, so still don't publish
    code with secrets in it.
  - Each publish creates a new snippet. Don't retry a success.
- **Signed out?** `AUTH_REQUIRED` means: run `npx supagist auth login` in the
  foreground and tell the user "A browser tab is waiting for you to sign in to
  Supagist and approve the Supagist CLI." Never ask for passwords or tokens.

## 4. Look before handing it over

If you can read images, open the PNG and check it: correct lines, readable
text, no clipping, the requested brand (Supabase has a green-lit dark canvas
and a bordered card, not a plain dark box), header and footer as asked. Fix
the flags and re-render if something is off, at most a couple of times since
renders are rate limited (3 a minute). If you can't view images, say the
image was rendered but not visually checked.

## 5. Report

Give the user:

1. The file path (or the URL for a publish).
2. Suggested post text, one or two sentences in the user's voice, if the image
   is for social media or a blog.
3. Alt text that says what the code does, not what it looks like. For
   example: "TypeScript function that refreshes a Supabase session and retries
   the request once."

## Failures

- `RATE_LIMITED` / HTTP 429: stop and report `retryAfter`. Don't loop, switch
  accounts or split requests to get around limits.
- `INVALID_INPUT`: fix the flag the message names, using `options`.
- Network errors: report them. Don't invent an alternate host.
- Report outcomes separately: rendered, saved, visually checked, published.
