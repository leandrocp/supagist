# Supagist Architecture

Supagist is a public code-sharing tool built on Next.js App Router. It's a dogfood project; every Supabase service below is wired into a real product surface.

## Supabase services

### Auth

Two identity states.

- **Anonymous.** `signInAnonymously()` runs on first page load (`app/providers.tsx`). Every visitor gets a stable `auth.uid()` without seeing a sign-in screen, which is what carries presence and lets reactions/comments be authored at all. The DB profile is created with username `guest_<uuid_prefix>` by the `handle_new_user` trigger; presence and reaction-chip displays use a separate adjective+animal name from `lib/presence-utils.ts` (`generateGuestName`). Avatars are coloured circles with two-letter initials.
- **GitHub OAuth + email/password.** PKCE flow via `signInWithOAuth` for GitHub; standard email+password through Supabase Auth otherwise. The callback at `/auth/oauth` exchanges the code and sets the session cookie.

Anonymous sessions are treated as logged-out for the chrome (no "Hey {name}", no Logout button) and for the publish flow (Save routes to `/auth/login`). The publish server action and database trigger independently reject anonymous identities. The visitor session still exists, so presence and reactions keep working; after logout the root auth listener creates a fresh anonymous session.

The `handle_new_user` trigger keeps `public.profiles` in sync as new auth rows land or GitHub metadata changes.

### Database

Snippet, social, and activity data lives in Postgres. RLS is on for every public table; anonymous users read everything but only write rows scoped to their own `auth.uid()`. Privileged writes go through security-definer RPCs:

- `record_snippet_view` atomically rate-limits and deduplicates a viewer, increments `view_count`, refreshes `last_seen_at`, and inserts the visit row. The former independent visit/counter RPCs are not client-executable.
- `check_rate_limit(key, max, window)` is an internal bucket primitive executable only by the service role and security-definer triggers. A `BEFORE INSERT` trigger on `snippets` derives the caller from `auth.uid()` and enforces 10/hour plus 30/day, so direct PostgREST inserts cannot bypass the publish limits. Reactions and comments use their own trigger-selected limits on the same internal primitive.

Two tables back the per-line social layer: `snippet_line_reactions` (one row per user × line × emoji) and `snippet_comments` (chat-style threads, multiple per line). Both have RLS policies that let anyone read but only the author can write or delete their own row.

A check constraint on `snippets.code_char_count` enforces equality with `char_length(code)`. The client computes the value with `codePointLength`, which matches Postgres's behavior — `String.length` counts UTF-16 code units, so a single emoji in the source would have made the insert fail.

### Storage

One public bucket: `snippet-images`. Each snippet gets four assets generated client-side via Lumis WASM at publish time:

```
<author_id>/snippets/<snippet_id>/canonical.png — export at user's chosen pixel ratio
<author_id>/snippets/<snippet_id>/og.png        — fixed 1200×630 for social cards
<author_id>/snippets/<snippet_id>/canonical.svg — vector, fonts embedded as base64
<author_id>/snippets/<snippet_id>/raw.<ext>     — plain source code
```

All four upload in parallel. The public bucket serves CDN URLs without allowing object listing. Storage RLS requires both `owner_id = auth.uid()` and the caller's UUID as the first path segment for inserts and deletes. If the DB insert fails afterward, the owner-scoped storage objects get cleaned up.

### Realtime — Postgres Changes

Saved-snippet reactions and comments use RLS-filtered `postgres_changes` subscriptions on `snippet_line_reactions` and `snippet_comments`. The UI applies local optimistic state after a successful database mutation, then deduplicates the authoritative row event by ID. It intentionally does not consume public Broadcast payloads for persisted annotations or typing identity, because those payloads can be forged independently of database RLS.

`components/notifications-listener.tsx`, mounted globally in the layout, also subscribes to INSERTs on those tables filtered by the viewer's authored snippet IDs and surfaces fresh activity as a sonner toast. The listener tears down and re-subscribes on every `auth.onAuthStateChange` event so a sign-in mid-session creates the channel without a page reload.

### Realtime — Presence

Two presence channels:

- `supagist:lobby` (`components/home-presence.tsx`) — the homepage pulse. Renders an inline avatar+name list under the hero ("Bold Lynx, Fast Oryx are writing snippets…") so the realtime layer is visible the moment a visitor lands, before they touch a snippet.
- `snippet-presence:<snippet_id>` (`app/[snippet]/snippet-presence.tsx`) — the live visitor stack in the code block footer.

Each visitor's presence key is their `auth.uid()`. Signed-in users track their GitHub username and avatar; anonymous users track the name `generateGuestName` returns for them. Avatar colours are deterministic hex values derived from the name and applied via inline `style` (Tailwind classes wouldn't survive the JIT purge). Both channels untrack on `pagehide` so closed tabs disappear from the list quickly instead of waiting for the server-side heartbeat to time out.

### Cleanup

Stale snippet deletion is two-stage. The service-role-only `queue_old_snippets_for_cleanup` RPC locks and rechecks stale rows, writes their asset paths to `storage_cleanup_queue`, and deletes the snippet rows atomically; FK cascades remove comments, reactions, and visits. The `cleanup` Edge Function drains that durable queue through `storage.remove()`, deleting queue entries only after the Storage API succeeds so failed object removals remain retryable. The old SQL job that deleted `storage.objects` metadata directly is unscheduled. A separate 02:30 UTC cron continues trimming expired rate-limit buckets.

## Brand presets and Lumis themes

Brand and Theme are independent controls. **Brand** is an atomic appearance preset that sets the outer canvas, frame fill/border, window decoration, font, spacing, corners, line numbers, granular Header/Footer metadata defaults, and a closest-fit official Lumis theme. **Theme** changes only the Lumis syntax colorscheme. Any later Theme or appearance change leaves the remaining Brand-applied values untouched and makes the Brand control read `Custom`.

`lib/brand-presets.ts` is the single 25-brand registry for Supabase, Vercel, Tailwind, Resend, Stripe, GitHub, OpenAI, Cloudflare, Linear, Cursor, Anthropic, Gemini, Perplexity, Hugging Face, Docker, Clerk, Prisma, AWS, Mintlify, Nuxt, Auth0, ElevenLabs, Firecrawl, Browserbase, and Trigger.dev. `EXPORT_BRAND_BACKGROUNDS` is derived from this registry rather than maintaining a second palette/frame catalog.

Every Brand resolves to a typed premium scene from `lib/brand-scenes.ts`: three ambient light fields, vignette, canvas rim, multi-layer frame rim, inner highlight, and bounded shadow. Six signature Brands add bespoke geometry: Tailwind crosshairs, Vercel registration guides, Supabase Studio rings/rails, Stripe color planes, OpenAI orbital halos, and Linear directional beams. React preview and SVG export consume the same scene colors and geometry roles. Brand frame fill, dot visibility, centered filename, header strip, and language label are also passed into the live editor so chrome matches export behavior.

Brand defaults use 32px outer padding (64px for Vercel) so ordinary cards occupy roughly 84–88% of the canvas width; short snippets stay compact while longer snippets grow naturally. PNG rendering remains density-independent through the selected 2x/4x/6x pixel ratio.

Brand application is a one-time patch to the existing composer draft fields, not a second active styling engine. `findMatchingBrandPreset` derives whether the current fields—including Header and Footer options—still exactly match a preset. Legacy local drafts containing synthetic IDs such as `supabase-dark` are explicitly mapped to official Lumis IDs; `brand-themes.ts` and `theme-loader.ts` remain only as compatibility for already-published snippets.

## Header and Footer metadata

`lib/export-metadata.ts` owns the shared metadata schema and compatibility normalization. Header settings control category visibility plus independent filename and language positions; filename defaults to center and language to right, with Brand presets free to override either. Disabling Header collapses the complete window-chrome row. Footer settings independently control language, theme, line count, character count, author, and alignment; enabling Footer with no selected items does not reserve an empty strip. React preview, SVG, PNG, OG, and the saved-snippet export modal consume the same settings. The selected Window decoration is authoritative: choosing macOS or macOS Subtle always renders its dots, even when a Brand frame originally defaults to a dotless Minimal/None style. Header insets are directional—macOS reserves only the left control area, Windows reserves only the right, and Minimal reserves neither. Legacy drafts with `showFilename` / `showFooter` are migrated into the new objects during hydration.

## Composer workspace layout

The composer is bounded to the available viewport below the site navigation. At `lg+`, `components/home-composer.tsx` uses a persistent preview pane plus a 28rem settings pane. Its options scroll inside a shadcn `ScrollArea` with an overlay, hover-only scrollbar, while Export/Publish stays in a fixed pane footer outside the scroll viewport. Below `lg`, the same viewport is split into a `clamp(13rem, 34dvh, 22rem)` preview row and the same overlay-scrolling settings region. The root scrollbar gutter stays stable, and Radix body scroll locking is prevented from adding duplicate margin compensation, so opening Select overlays cannot shift the composer. This keeps visual feedback in view while any advanced option is changed and prevents the long settings form from moving the preview off-screen.

## Brand and Theme pickers

The Brand picker uses a visual, searchable shadcn `Command` inside `Popover`, showing all 25 brand compositions in a two-column grid. The Theme picker uses the same collision-aware pattern but contains only official Lumis themes. Both lists respect the available popover viewport and scroll internally.

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
    snippet-annotations-view.tsx   Live RLS-backed line reactions + comments (Postgres Changes)
    snippet-reactions.tsx      Snippet-level emoji reactions (Broadcast on snippet-reactions:<id>)
    snippet-presence.tsx       Code block footer — live visitor stack (Presence)
    snippet-export-modal.tsx   Wraps ExportModal with the saved-snippet's author/avatar
    export-button.tsx          DropdownMenu trigger for the saved-view export modal
    share-button.tsx           Copies the snippet URL to clipboard
  actions/
    publish.ts                 Auth + rate-limit gates, CRLF normalization, asset uploads, snippets insert
    get-my-snippets.ts         Returns the signed-in user's snippets for the homepage list
    record-visit.ts            Fires the bounded atomic record_snippet_view RPC

components/
  home-composer.tsx            Editor + toolbar + publish flow
  inline-code-block.tsx        Lumis-powered interactive code editor
  my-snippets.tsx              Homepage list of the signed-in user's saved snippets
  home-presence.tsx            Homepage live "X, Y are writing snippets…" presence pulse
  export-modal.tsx             Export settings (background, padding, font, size, language, lines, footer)
  brand-picker.tsx             Visual searchable picker that applies complete Brand presets
  brand-scene-decoration.tsx   Responsive scene guides/artwork behind the live editor
  theme-picker.tsx             Searchable official-Lumis-theme picker
  notifications-listener.tsx   Author notifications via sonner toasts (postgres_changes)
  user-avatar.tsx              shadcn Avatar wrapper with deterministic name → colour fallback
  auth-button.tsx              Renders the "Log in" pill for anon + logged-out viewers, "Hey {name} / Logout" for real users
  brand-dot.tsx                The brand pulse dot in the nav and login form

lib/
  brand-presets.ts             25-brand appearance registry + six signature scene recipes
  brand-scenes.ts              Shared premium lighting/frame primitives and CSS serialization
  export-metadata.ts           Header/Footer schema, defaults, migration, and visible-item ordering
  brand-themes.ts              Legacy synthetic-theme compatibility for published snippets
  theme-loader.ts              Loads legacy compatibility ids or @lumis-sh/themes/<name>
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

public/brands/                 SVG logos + raster patterns for the 25 Brand presets
proxy.ts                       Next.js middleware entry — calls updateSession()

supabase/
  migrations/                  All schema changes — apply with `supabase db push`
  config.toml                  Local config — bucket definitions, auth providers
```

## Data flow: saving a snippet

1. User pastes code, applies an optional Brand preset, and can independently customize Theme, filename, language, frame, and spacing controls.
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
2. `recordVisit()` fires-and-forgets, calling the bounded `record_snippet_view` RPC.
3. Lumis highlights the code server-side using `loadTheme(snippet.theme)`, which resolves brand themes from the local registry first and falls through to `@lumis-sh/themes/<name>`. `preRenderedLines` is passed to the client as a prop, so the browser doesn't load WASM just to view.
4. `SnippetAnnotationsView` subscribes to RLS-backed Postgres Changes for live line reactions and comments; forgeable Broadcast payloads are not treated as persisted UI truth.
5. `SnippetPresenceFooter` joins the Presence channel — the visitor stack updates in real time.
6. `generateMetadata` produces a three-line social-card description (`<filename> by @<author>` / `<lang> | <theme> | <lines> lines | <chars> / 8,000` / `# Supagist. Comment, react, share, export.`) and an `og:image:alt` to match. Slack and X show it on link unfurl.

## Export

The export pipeline runs entirely in the browser via Lumis WASM. `createHighlightedSvg` produces a self-contained SVG — monospace fonts (JetBrains Mono, Fira Code, Geist Mono, Hack, or System) are fetched from `/fonts/` and embedded as base64 so the file renders correctly even when loaded via an `<img>` tag (no page CSS).

The card width separates the configurable editor inset from stable chrome spacing:

```
fixedGutterWidth = EXPORT_CHROME_PAD_X + EXPORT_LINE_NUM_WIDTH + EXPORT_LINE_NUM_GAP
codeStartInset = lineNumbers ? fixedGutterWidth + innerPadding : innerPadding

naturalWidth = max(
  longestLinePx + codeStartInset + innerPadding,
  footerWidthPx + 2 * EXPORT_CHROME_PAD_X,
)
```

The line-number gutter is fixed chrome and never changes with `innerPadding`. Inner padding applies to all four sides of the code body after that gutter. `outerPadding` remains separate and only surrounds the card when a background is enabled.

Brand styling is always explicit: selecting a Brand writes its background, frame, official Lumis theme, window, font, and spacing values into the draft. `createHighlightedSvg` never infers a background from a theme; `null` always means no background. Per-brand `BrandFrame` configs drive macOS dots on/off, optional left-aligned filename strips, card stroke, corner radius, and card fill. Chrome text picks white or black based on `cardFill` luminance so contrast holds when Theme is customized independently.

Reactor avatars in chip pills are fetched, base64-encoded, and embedded as a single SVG `<pattern>` per unique URL — the canvas-rasterisation step would otherwise taint the canvas and refuse to produce a PNG.

## URL design

`/<slug>-<short_id>` — e.g. `/app-tsx-ab12cd`.

The slug comes from the filename (lowercased, non-alphanumeric characters replaced with dashes). The short id is six random `[a-z0-9]` characters from `crypto.getRandomValues` (`generateShortId`). Both are set at save time and never change.
