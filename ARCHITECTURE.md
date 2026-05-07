# Supagist Architecture

Supagist is a public code-sharing tool built on Next.js App Router. It's a dogfood project — every Supabase service we list below gets used for real, not as a demo.

## Supabase services

### Auth

Three identity states coexist.

- **Anonymous** — `signInAnonymously()` runs on first page load. Every visitor gets a stable `auth.uid()` without seeing a sign-in screen. Their display name is a deterministic adjective + animal derived from their UUID ("Bold Lynx", "Fast Oryx"). Their avatar is a coloured circle with two-letter initials.
- **GitHub OAuth** — PKCE flow via `signInWithOAuth`. The callback exchanges the code and sets the session cookie.
- **Upgrade** — `linkIdentity({ provider: 'github' })` turns an anonymous session into a real GitHub account in place. Same `user_id`, so all presence and reaction history survives the upgrade.

A `handle_new_user` trigger keeps the `profiles` table in sync whenever GitHub metadata arrives.

### Database

Snippet, social, and activity data lives in Postgres. RLS is on for every table — anonymous users can read everything but can only write rows scoped to their own `auth.uid()`. Two security-definer RPCs handle privileged writes: `increment_view_count` atomically bumps the view counter and refreshes `last_seen_at`, and `record_visit` inserts into `snippet_visits`.

Two tables back the per-line social layer: `snippet_line_reactions` (one row per user × line × emoji) and `snippet_comments` (chat-style threads, multiple per line). Both have RLS policies that let anyone read but only the author can write or delete their own row.

A check constraint on `snippets.code_char_count` enforces equality with `char_length(code)`. We compute it on the client using `codePointLength`, which counts Unicode code points the way Postgres does — `String.length` counts UTF-16 code units, so a single emoji in the source would have made the insert fail.

### Storage

One public bucket: `snippet-images`. Each snippet gets four assets generated client-side via Lumis WASM at publish time:

```
snippets/<snippet_id>/canonical.png   — export at user's chosen pixel ratio
snippets/<snippet_id>/og.png          — fixed 1200×630 for social cards
snippets/<snippet_id>/canonical.svg   — vector, fonts embedded as base64
snippets/<snippet_id>/raw.<ext>       — plain source code
```

All four upload in parallel. If the DB insert fails afterward, the storage objects get cleaned up.

### Realtime — Broadcast

All live updates on snippet pages use Broadcast — no `postgres_changes` anywhere.

- `snippet:<snippet_id>` channel — line reactions, comments, and typing indicators.
- `snippet-reactions:<snippet_id>` channel — snippet-level emoji reactions.

The pattern in all cases: write to the DB, then `channel.httpSend(event, payload)` the broadcast. We use `httpSend` instead of `channel.send({ type: "broadcast" })` because `send()` silently falls back to REST when the channel isn't yet `SUBSCRIBED` and supabase-js is deprecating that fallback. The typing-indicator effect fires the first broadcast immediately on mount before the subscribe handshake completes — exactly the case that triggered the deprecation warning.

Initial state is loaded from the DB once on mount; after that everything is event-driven.

### Realtime — Presence

Two presence channels:

- `supagist:lobby` powers the homepage visitor pulse in the status bar.
- `snippet-presence:<snippet_id>` powers the live visitor stack in the code block footer.

Each visitor's presence key is their `auth.uid()`. Signed-in users track their GitHub username and avatar; anonymous users track their generated name. Avatar colours are deterministic hex values derived from the name and applied via inline `style` (Tailwind classes wouldn't survive the JIT purge).

### Cron

`pg_cron` runs `public.cleanup_old_snippets()` nightly at 02:00 UTC. The function deletes Storage objects first, then removes snippet rows (cascade handles the rest). No Edge Function required.

## Brand themes

Five branded presets — Supabase, Vercel, Tailwind, Resend, Stripe — each ship as a Lumis-compatible theme plus a per-brand "frame" that customises the editor card itself, not just the background. Vercel goes borderless and chromeless with sharp corners; Stripe sits in a rounded card with a brand-blue hairline; Resend ships a left-aligned filename + language strip; Supabase ships the same strip without the language label; Tailwind keeps the macOS dots. The bg decoration helpers — Vercel's registration brackets and grid, Stripe's diagonal stripe, Tailwind's gridlines — render behind the card.

`buildLumisThemeFromBrand` expands each brand's compact 10-key palette into the ~70 Lumis scope entries (`keyword.*`, `function.*`, `string.*`) so token highlighting works without re-coding the highlighter. `lib/theme-loader.ts` is a thin seam: brand id first, then `@lumis-sh/themes/<name>` fallback. All three render surfaces (saved-view server render, home-composer client render, export SVG) load themes through it.

Brand colours, frame configs, and pattern PNGs (`tailwind-beams.png`, `resend-dark.png`) follow ray.so's catalog. Vercel and Stripe don't ship pattern assets — those frames are inline SVG that mirrors ray.so's CSS.

## Theme picker

The home composer's theme dropdown is a Combobox (shadcn `Command` inside `Popover`). Two `CommandGroup`s — Brands and Themes — get fuzzy-filtered together by cmdk. Brand rows render the brand SVG logo; the popover surface picks up the editor palette (bg, text, border, hover background derived from `selectedLine`) so the dropdown blends with the active theme instead of flashing the app's default white.

## Key files

```
app/
  layout.tsx                   Root layout — wraps children in <Providers>
  providers.tsx                Calls signInAnonymously() on first visit
  page.tsx                     Homepage — renders HomeComposer
  terms/page.tsx               Static terms of use
  [snippet]/
    page.tsx                   Server component — fetches snippet, server-renders Lumis highlighting,
                                generates og:image:alt + social description
    snippet-annotations-view.tsx   Live line reactions + comments, typing indicators (Broadcast)
    snippet-presence.tsx       Code block footer — live visitor stack (Presence)
    snippet-export-modal.tsx   Wraps ExportModal with the saved-snippet's author/avatar
    share-button.tsx           Copies the snippet URL to clipboard
  actions/
    publish.ts                 Validates, normalizes CRLF, generates images, uploads, inserts snippet
    record-visit.ts            Fires increment_view_count + record_visit RPCs

components/
  home-composer.tsx            Editor + toolbar + publish flow
  inline-code-block.tsx        Lumis-powered interactive code editor
  export-modal.tsx             Export settings (background, padding, font, size, language, lines, footer)
  theme-picker.tsx             Combobox theme picker — Brands + Themes groups, fuzzy filter
  notifications-listener.tsx   Realtime author notifications via sonner toasts
  user-avatar.tsx              shadcn Avatar wrapper with deterministic name → colour fallback
  auth-button.tsx              Sign-in / sign-out

lib/
  brand-themes.ts              5-brand registry, palette → Lumis-theme builder
  theme-loader.ts              Single seam: brand id first, then @lumis-sh/themes/<name>
  export-utils.ts              createHighlightedSvg, renderToFile, EXPORT_BACKGROUNDS,
                                EXPORT_BRAND_BACKGROUNDS, BrandFrame
  snippet-utils.ts             parseSnippetParam, codePointLength, buildSnippetSocialAlt,
                                line-reaction grouping helpers
  presence-utils.ts            generateGuestName, nameToColor (hex), nameToInitials
  lumis-client.ts              Browser-side Lumis WASM singleton (loaded once, reused)
  supabase/client.ts           Browser Supabase client
  supabase/server.ts           Server Supabase client (cookie-based SSR)

public/brands/                 SVG logos + raster patterns for the 5 brand themes

supabase/
  migrations/                  All schema changes — apply with `supabase db push`
  config.toml                  Local config — bucket definitions, auth providers
```

## Data flow: saving a snippet

1. User pastes code and sets filename, language, theme, and font in the toolbar.
2. Clicks Save. If the session is anonymous, `linkIdentity({ provider: 'github' })` runs first — the browser redirects through GitHub OAuth and returns to the homepage with the draft still in `localStorage`.
3. `publishSnippet` server action:
   - Validates code length (≤ 8,000 code points) and filename.
   - Normalizes CRLF line endings to LF before storing. Without this, snippets pasted from Windows-style sources kept their `\r\n` endings, which CSS `white-space: pre-wrap` treats as hard segment breaks — that pushed any inline content (a reaction chip after the line) onto a fresh row.
   - Upserts the `profiles` row.
   - Client-side: generates `canonical.png`, `og.png`, and `canonical.svg` via Lumis WASM with the user's export settings.
   - Uploads all four assets to `snippet-images` in parallel.
   - Inserts the immutable `snippets` row. Storage cleanup runs if the insert throws.
4. On success: navigates to `/[slug]-[short_id]`. The share URL is already on the clipboard.

## Data flow: viewing a snippet

1. Server component fetches snippet + author in one round-trip (deduped via `cache()`).
2. `recordVisit()` fires-and-forgets — increments `view_count`, inserts `snippet_visits`.
3. Lumis highlights the code server-side using `loadTheme(snippet.theme)`, which resolves brand themes from the local registry first and falls through to `@lumis-sh/themes/<name>`. `preRenderedLines` is passed to the client as a prop — no WASM in the browser just to view.
4. `SnippetAnnotationsView` subscribes to the `snippet:<id>` Broadcast channel for live reactions, comments, and typing indicators.
5. `SnippetPresenceFooter` joins the Presence channel — the visitor stack updates in real time.
6. `generateMetadata` produces a three-line social-card description (`<filename> by @<author>` / `<lang> | <theme> | <lines> lines | <chars> / 8,000` / `# Supagist. Share, export, comment, react.`) and an `og:image:alt` to match. Slack and X show it on link unfurl.

## Export

The export pipeline runs entirely in the browser via Lumis WASM. `createHighlightedSvg` produces a self-contained SVG — monospace fonts (JetBrains Mono, Fira Code, Geist Mono, Hack, or System) are fetched from `/fonts/` and embedded as base64 so the file renders correctly even when loaded via an `<img>` tag (no page CSS).

The card width follows one rule:

```
naturalWidth = max(longestLinePx + lineNumOffset, footerWidthPx)
             + 2 * EXPORT_WIN_PAD_X
```

Footer width is part of the calc because it can exceed the longest code line — without that the footer pushes against the right edge and reads asymmetric against the line-number column. Line numbers are left-aligned at the same inset as the right edge, so the gutters match by construction.

When the snippet uses a brand theme, `createHighlightedSvg` defaults to the matching brand background (Supabase wash, Vercel black, Tailwind beams, Resend folded-paper, Stripe navy + diagonal stripe). Per-brand `BrandFrame` configs drive the chrome — whether to draw the macOS dots, the centred filename, a left-aligned filename + language strip, the card stroke, and the corner radius.

Reactor avatars in chip pills are fetched, base64-encoded, and embedded as a single SVG `<pattern>` per unique URL — the canvas-rasterisation step would otherwise taint the canvas and refuse to produce a PNG.

## URL design

`/<slug>-<short_id>` — e.g. `/app-tsx-ab12cd`.

The slug comes from the filename (lowercased, non-alphanumeric characters replaced with dashes). The short id is six random alphanumeric characters. Both are set at save time and never change.
