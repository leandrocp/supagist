# Supagist Architecture

Supagist is a public code-sharing tool built on Next.js App Router. It's a dogfood project; every Supabase service below is wired into a real product surface.

## Supabase services

### Auth

Two identity states.

- **Anonymous.** `signInAnonymously()` runs on first page load (`app/providers.tsx`). Every visitor gets a stable `auth.uid()` without seeing a sign-in screen, which is what carries presence and lets reactions/comments be authored at all. The DB profile is created with username `guest_<uuid_prefix>` by the `handle_new_user` trigger; presence and reaction-chip displays use a separate adjective+animal name from `lib/presence-utils.ts` (`generateGuestName`). Avatars are coloured circles with two-letter initials.
- **GitHub OAuth + email/password.** PKCE flow via `signInWithOAuth` for GitHub; standard email+password through Supabase Auth otherwise. The callback at `/auth/oauth` exchanges the code and sets the session cookie.

Anonymous sessions are treated as logged-out for the chrome (no "Hey {name}", no Logout button) and for the publish flow (Save routes to `/auth/login`). The session still exists, so presence and reactions keep working — it's a UI distinction, not an auth one.

The `handle_new_user` trigger keeps `public.profiles` in sync as new auth rows land or GitHub metadata changes.

### Database

Snippet, social, and activity data lives in Postgres. RLS is on for every public table; anonymous users read everything but only write rows scoped to their own `auth.uid()`. Privileged writes go through security-definer RPCs:

- `increment_view_count` atomically bumps the snippet's view counter and refreshes `last_seen_at`.
- `record_visit` inserts into `snippet_visits`.
- `check_rate_limit(key, max, window)` is the publish-side rate limiter. `app/actions/publish.ts` calls it twice (10/hour and 30/day per user) before writing storage or DB rows. Reactions and comments don't go through the server action, so they're rate-limited at the trigger level on the same RPC.

Two tables back the per-line social layer: `snippet_line_reactions` (one row per user × line × emoji) and `snippet_comments` (chat-style threads, multiple per line). Both have RLS policies that let anyone read but only the author can write or delete their own row.

A check constraint on `snippets.code_char_count` enforces equality with `char_length(code)`. The client computes the value with `codePointLength`, which matches Postgres's behavior — `String.length` counts UTF-16 code units, so a single emoji in the source would have made the insert fail.

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

Live updates on snippet pages run on Broadcast.

- `snippet:<snippet_id>` carries line reactions, comments, and typing indicators.
- `snippet-reactions:<snippet_id>` carries snippet-level emoji reactions.

Pattern in both cases: write to the DB, then `channel.httpSend(event, payload)`. `httpSend` is preferred over `channel.send({ type: "broadcast" })` because `send()` silently falls back to REST when the channel isn't yet `SUBSCRIBED`, and supabase-js is deprecating that fallback. The typing-indicator effect fires its first broadcast immediately on mount, before the subscribe handshake completes; that's exactly the case the deprecation warning calls out.

Initial state loads from the DB once on mount; after that everything is event-driven.

### Realtime — Postgres Changes

`postgres_changes` shows up in exactly one place: `components/notifications-listener.tsx`, mounted globally in the layout. It subscribes to INSERTs on `snippet_line_reactions` and `snippet_comments` filtered by the viewer's authored snippet IDs, and surfaces fresh activity as a sonner toast. The listener tears down and re-subscribes on every `auth.onAuthStateChange` event so a sign-in mid-session creates the channel without a page reload.

### Realtime — Presence

`snippet-presence:<snippet_id>` (`app/[snippet]/snippet-presence.tsx`) drives the live visitor stack in the code block footer. Each visitor's presence key is their `auth.uid()`. Signed-in users track their GitHub username and avatar; anonymous users track the name `generateGuestName` returns for them. Avatar colours are deterministic hex values derived from the name and applied via inline `style` (Tailwind classes wouldn't survive the JIT purge).

### Cron

`pg_cron` runs `public.cleanup_old_snippets()` nightly at 02:00 UTC. The function deletes Storage objects first, then removes snippet rows; cascade handles comments, reactions, and visits. A second job at 02:30 UTC trims expired entries from the `rate_limit_buckets` table. No Edge Functions required for either.

## Brand themes

Five branded presets — Supabase, Vercel, Tailwind, Resend, Stripe — each ship as a Lumis-compatible theme plus a per-brand "frame" that customises the editor card itself, not just the background. Vercel is borderless with sharp corners; Stripe sits in a rounded card with a brand-blue hairline; Resend and Supabase ship a left-aligned filename strip (Resend includes the language label, Supabase doesn't); Tailwind keeps the macOS dots. The bg decoration helpers — Vercel's registration brackets and grid, Stripe's diagonal stripe, Tailwind's gridlines — render behind the card.

Every brand respects the export modal's toggles (Filename, Reactions, Lines, Footer). Frames only choose *where* the filename sits when the toggle is on — centred over the dots for Vercel/Tailwind/Stripe, left-aligned in a header strip for Supabase/Resend. Chrome text colour is derived from the card fill via a luminance check so a light syntax theme on a dark brand card doesn't render dark-on-dark.

`buildLumisThemeFromBrand` expands each brand's compact 10-key palette into the ~70 Lumis scope entries (`keyword.*`, `function.*`, `string.*`) so token highlighting works without re-coding the highlighter. `lib/theme-loader.ts` is a thin seam: brand id first, then `@lumis-sh/themes/<name>` fallback. All three render surfaces (saved-view server render, home-composer client render, export SVG) load themes through it.

Brand colours, frame configs, and pattern PNGs (`tailwind-beams.png`, `resend-dark.png`) follow ray.so's catalog. Vercel and Stripe don't ship pattern assets — those frames are inline SVG that mirrors ray.so's CSS.

## Theme picker

The home composer's theme dropdown is a Combobox (shadcn `Command` inside `Popover`). Two `CommandGroup`s, Brands and Themes, get fuzzy-filtered together by cmdk. Brand rows render the SVG logo as a CSS mask painted with `currentColor` so the same asset reads correctly on both the dark export swatches (white logo) and the popover painted in the editor palette's text colour. The popover surface picks up the editor palette (bg, text, border, hover background derived from `selectedLine`) so the dropdown blends with the active theme instead of flashing the app's default white.

## Key files

```
app/
  layout.tsx                   Root layout — wraps children in <Providers>, mounts NotificationsListener + Toaster
  providers.tsx                Calls signInAnonymously() on first visit
  page.tsx                     Homepage — renders HomeComposer + MySnippets
  terms/page.tsx               Static terms of use
  error.tsx, not-found.tsx     Branded error + 404 pages
  [snippet]/
    page.tsx                   Server component — fetches snippet + author, server-renders Lumis highlighting,
                                builds og:image:alt + social description
    snippet-code-block.tsx     Server-side Lumis highlighter (singleton, deduped via React cache())
    snippet-annotations-view.tsx   Live line reactions + comments, typing indicators (Broadcast)
    snippet-reactions.tsx      Snippet-level emoji reactions (Broadcast on snippet-reactions:<id>)
    snippet-presence.tsx       Code block footer — live visitor stack (Presence)
    snippet-export-modal.tsx   Wraps ExportModal with the saved-snippet's author/avatar
    export-button.tsx          DropdownMenu trigger for the saved-view export modal
    share-button.tsx           Copies the snippet URL to clipboard
  actions/
    publish.ts                 Auth + rate-limit gates, CRLF normalization, asset uploads, snippets insert
    get-my-snippets.ts         Returns the signed-in user's snippets for the homepage list
    record-visit.ts            Fires increment_view_count + record_visit RPCs

components/
  home-composer.tsx            Editor + toolbar + publish flow
  inline-code-block.tsx        Lumis-powered interactive code editor
  my-snippets.tsx              Homepage list of the signed-in user's saved snippets
  export-modal.tsx             Export settings (background, padding, font, size, language, lines, footer)
  theme-picker.tsx             Combobox theme picker — Brands + Themes groups, fuzzy filter
  notifications-listener.tsx   Author notifications via sonner toasts (postgres_changes)
  user-avatar.tsx              shadcn Avatar wrapper with deterministic name → colour fallback
  auth-button.tsx              Renders the "Log in" pill for anon + logged-out viewers, "Hey {name} / Logout" for real users
  brand-dot.tsx                The brand pulse dot in the nav and login form

lib/
  brand-themes.ts              5-brand registry, palette → Lumis-theme builder (buildLumisThemeFromBrand)
  theme-loader.ts              Single seam: brand id first, then @lumis-sh/themes/<name>
  export-utils.ts              createHighlightedSvg, renderToFile, EXPORT_BACKGROUNDS,
                                EXPORT_BRAND_BACKGROUNDS, BrandFrame, readableOnFill
  snippet-utils.ts             parseSnippetParam, codePointLength, buildSnippetSocialAlt,
                                generateShortId, line-reaction grouping helpers
  presence-utils.ts            generateGuestName, nameToColor (hex), nameToInitials
  auth-redirect.ts             safeNextPath — guards the post-auth redirect against open-redirect abuse
  lumis-client.ts              Browser-side Lumis WASM singleton (loaded once, reused)
  supabase/client.ts           Browser Supabase client
  supabase/server.ts           Server Supabase client (cookie-based SSR)
  supabase/proxy.ts            updateSession — refreshes the auth cookie on every matched request

public/brands/                 SVG logos + raster patterns for the 5 brand themes
proxy.ts                       Next.js middleware entry — calls updateSession()

supabase/
  migrations/                  All schema changes — apply with `supabase db push`
  config.toml                  Local config — bucket definitions, auth providers
```

## Data flow: saving a snippet

1. User pastes code and sets filename, language, theme, and font in the toolbar.
2. Clicks Save. Anonymous and logged-out viewers route to `/auth/login`; the draft and annotations are already in `localStorage`, so they pick up where they left off after sign-in.
3. `publishSnippet` server action:
   - Verifies the user is signed in (`getUser()`).
   - Calls `check_rate_limit` twice (hourly + daily). A throttled caller bails out before any storage upload.
   - Validates code length (≤ 8,000 code points) and filename.
   - Normalizes CRLF line endings to LF before storing. Without this, snippets pasted from Windows-style sources kept their `\r\n` endings, which CSS `white-space: pre-wrap` treats as hard segment breaks — that pushed inline content (a reaction chip after the line) onto a fresh row.
   - Upserts the `profiles` row.
   - Client-side has already generated `canonical.png`, `og.png`, and `canonical.svg` via Lumis WASM with the user's export settings.
   - Uploads the four assets to `snippet-images` in parallel.
   - Inserts the immutable `snippets` row. Storage cleanup runs if the insert throws.
4. On success: navigates to `/[slug]-[short_id]`. The share URL is already on the clipboard.

## Data flow: viewing a snippet

1. Server component fetches snippet + author in one round-trip (deduped via `cache()`).
2. `recordVisit()` fires-and-forgets, calling `increment_view_count` and `record_visit`.
3. Lumis highlights the code server-side using `loadTheme(snippet.theme)`, which resolves brand themes from the local registry first and falls through to `@lumis-sh/themes/<name>`. `preRenderedLines` is passed to the client as a prop, so the browser doesn't load WASM just to view.
4. `SnippetAnnotationsView` subscribes to the `snippet:<id>` Broadcast channel for live line reactions, comments, and typing indicators. `SnippetReactions` subscribes to `snippet-reactions:<id>` for snippet-level emoji.
5. `SnippetPresenceFooter` joins the Presence channel — the visitor stack updates in real time.
6. `generateMetadata` produces a three-line social-card description (`<filename> by @<author>` / `<lang> | <theme> | <lines> lines | <chars> / 8,000` / `# Supagist. Comment, react, share, export.`) and an `og:image:alt` to match. Slack and X show it on link unfurl.

## Export

The export pipeline runs entirely in the browser via Lumis WASM. `createHighlightedSvg` produces a self-contained SVG — monospace fonts (JetBrains Mono, Fira Code, Geist Mono, Hack, or System) are fetched from `/fonts/` and embedded as base64 so the file renders correctly even when loaded via an `<img>` tag (no page CSS).

The card width follows one rule:

```
naturalWidth = max(longestLinePx + lineNumOffset, footerWidthPx)
             + 2 * EXPORT_WIN_PAD_X
```

Footer width is part of the calc because it can exceed the longest code line — without that the footer pushes against the right edge and reads asymmetric against the line-number column. Line numbers are left-aligned at the same inset as the right edge, so the gutters match by construction.

When the snippet uses a brand theme, `createHighlightedSvg` defaults to the matching brand background (Supabase wash, Vercel black, Tailwind beams, Resend folded-paper, Stripe navy + diagonal stripe). Per-brand `BrandFrame` configs drive the chrome shape — macOS dots on/off, optional left-aligned filename strip with a language label, card stroke, corner radius, and an explicit card fill that overrides the syntax theme's bg. The Filename toggle is honored on every brand: when on, the filename renders centred (Vercel/Tailwind/Stripe) or in the left-aligned strip (Supabase/Resend); when off, no filename anywhere. Chrome text picks white or black based on `cardFill` luminance, so contrast holds regardless of which syntax theme is paired with which brand.

Reactor avatars in chip pills are fetched, base64-encoded, and embedded as a single SVG `<pattern>` per unique URL — the canvas-rasterisation step would otherwise taint the canvas and refuse to produce a PNG.

## URL design

`/<slug>-<short_id>` — e.g. `/app-tsx-ab12cd`.

The slug comes from the filename (lowercased, non-alphanumeric characters replaced with dashes). The short id is six random `[a-z0-9]` characters from `crypto.getRandomValues` (`generateShortId`). Both are set at save time and never change.
