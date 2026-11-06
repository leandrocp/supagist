# Untangling the export pipeline

A trial of the `untangle-codebase` skill on Supagist, scoped to the export/render
pipeline centred on `lib/export-utils.ts` and the code tied to it. The chosen
addition was **Comments** (not Tests).

Line numbers refer to `origin/main` at `ab527b9`.

## Problems found

Hidden links

- `lib/export-utils.ts:1302` `createHighlightedSvg` takes 31 positional parameters and `:2111` `renderToFile` takes 29 in a different order (`outFilename` and `pixelRatio` sit at 6 and 7). Every caller has to know both orders and pass `undefined` placeholders; adding one option (`wordDiff`, `aspectRatio`, `ligatures`) meant editing every call site.
- `components/export-modal.tsx:135`, `:211` and `:249` spell out the same 28-argument list three times; `lib/snippet-images.ts:35`, `:74` and `:130` do the same three more times.
- `lib/export-utils.ts:950` `estimateExportDimensions` re-implements the renderer's sizing (`:1350-1600`): the rendered window decoration, top padding, header width, footer width, natural width, line cap, footer height and outer padding. Its own comment (`:1072`) says it must count comment rows "or the preview card comes out shorter than what createHighlightedSvg draws".
- Footer metrics live twice: `footerContentWidth` (`:866`, gap 18, 7 px per character, 14 px avatar + 6 px gap) and the footer drawing (`:1931-1972`, the same literals). The footer height `36` is written at `:1081` and `:1600`; the header label gap `14` at `:898`/`:921` and `:1897`.
- Whether a non-brand header shows the filename (`headerStrip || showCenteredFilename ?? true`) is written three times (`:1054`, `:1477`, `:1873`). The line-cap formula `floor((height - topPad - innerPadding) / lineHeight)` is written three times (`:1063`, `:1373`, `:1540`).
- The embedded font format is fixed to WOFF2 in `exportFontFace` (`:1212`), so every non-browser runtime rewrites the output: `lib/snippet-render.ts:108` `forResvg` string-replaces the MIME and `format()` after rendering, and `supabase/functions/mcp/spike/prepare-render.mjs:63-64` patches the same two strings into the generated copy.
- `supabase/functions/mcp/render.ts:209-224` adds a Hack fallback face by string-replacing `</style>` and every `font-family="&quot;<family>&quot;,ui-monospace` attribute, so it depends on the exact markup `exportFontFace` and `escapeXml` produce. `lib/snippet-render.ts:115` injects the Noto Emoji face the same way.
- The output size is parsed back out of the SVG with a regex in `renderToFile` (`:2171`, integer only, falls back to `400`) and in `supabase/functions/mcp/render.ts:225`, although the renderer already reports its layout through `onLayout`.
- `supabase/functions/mcp/spike/prepare-render.mjs:55-61` cuts the browser asset loaders out of the generated copy between two exact text markers (`const fontBase64Cache =` and the comment `// Pick a readable text colour`), so renaming that code or editing that comment breaks MCP generation.
- `supabase/functions/mcp/render.ts` copies renderer values as literals: `1200` (`EXPORT_WIDTH`), `110` and `30` for the row limit (`EXPORT_MAX_CHARS_PER_LINE`, `EXPORT_MAX_LINES`), `14` and `16` for the default font size and inner padding, and the window decoration list, which `supabase/functions/mcp/input.ts` copies again.
- `components/export-modal.tsx:124` looks a background up in both lists by label, duplicating `findExportBackground` in `lib/snippet-appearance.ts:76`.

Needless links

- Callers pass `background ? outerPadding : 0` (`lib/snippet-images.ts`, `lib/snippet-render.ts`, `components/export-modal.tsx`); the renderer already ignores outer padding without a background.
- Callers pass the legacy `showFilename` (`header.enabled && header.showFilename`) and `showFooter` (`footer.enabled`) next to full header and footer settings, which override them.
- `renderToFile` hard-codes `wordDiff: false`, so the file export cannot follow an option the SVG export has.
- `onLayout` is part of `ExportRuntime` (where parsers, fonts and images come from), although it is a per-render result.

Surplus

- `app/[snippet]/export-button.tsx` is not imported anywhere.
- `EXPORT_METADATA_TEXT` is unused; `BrandFrame` only aliases `BrandFramePreset`; `export { inferLanguage }` only re-exports `lib/snippet-utils`.
- `EXPORT_WINDOW_CHROME_HEIGHT`, `EXPORT_OUTER_PADDING`, `EXPORT_WIN_RADIUS`, `EXPORT_MIN_WIDTH`, `LUMIS_SUN_BANDS`, `ExportViewport` and `ExportFont` are exported but used only inside the module.
- `runtime?.loadFontBase64 ?? loadFontBase64` and `runtime?.loadImageDataUrl ?? loadImageDataUrl` are repeated in each entry point instead of one default runtime.

Special cases

- `system` font → `jetbrains` in `lib/snippet-render.ts:158`, `:192` and `supabase/functions/mcp/render.ts:187`, `:220`.
- The Hack fallback face only when comments are shown and the font is not Hack (`supabase/functions/mcp/render.ts:211`).
- WOFF2 → TTF string replacement (`lib/snippet-render.ts:113`, `prepare-render.mjs:63`).
- `background ? outerPadding : 0` at call sites.
- `showFilename` / `showFooter` legacy parameters.
- `wordDiff` hard-coded `false` in `renderToFile`.
- The `"400"` height fallback in `renderToFile`'s regex.
- Swallowed fetch errors in the image loaders (browser and server): kept, they are the documented fallback to initials.

## Fixes

Each fix sits above the problems it solves.

- **One options object for the renderer.** `ExportOptions` names every field once; `renderExport(options, runtime)` returns `{ svg, layout }`, `createHighlightedSvg(options)` returns the SVG and `renderToFile({ ...options, outFilename, pixelRatio })` the PNG. Callers build the object once and pass it to all three.
  - `lib/export-utils.ts:1302` `createHighlightedSvg` takes 31 positional parameters and `:2111` `renderToFile` takes 29 in a different order.
  - `components/export-modal.tsx` and `lib/snippet-images.ts` spell out the same 28-argument list three times each.
  - `renderToFile` hard-codes `wordDiff: false`.
  - The legacy `showFilename` / `showFooter` parameters: `header` and `footer` (partial settings are fine) are the only way in now.
  - `background ? outerPadding : 0` at call sites: dropped, the renderer already ignores padding without a background.
- **The renderer reports its layout instead of callers parsing it.** `renderExport` returns the layout `onLayout` used to report, so `onLayout` leaves the runtime.
  - `renderToFile` regex-parses `width`/`height` (integer only, `400` fallback); `supabase/functions/mcp/render.ts` regex-parses them again.
  - `onLayout` is a per-render result living in `ExportRuntime`.
- **The runtime says what its fonts are.** `ExportRuntime` gains `fontFormat` (`woff2` | `truetype`), `systemFonts` (without them, `system` draws in JetBrains Mono) and an optional `extraFontFaces()`. `ExportOptions.fallbackFontId` embeds a second face after the export font. The browser runtime is the default.
  - WOFF2 → TTF string rewrites in `lib/snippet-render.ts` (`forResvg`) and `prepare-render.mjs`.
  - The Hack fallback face spliced into `</style>` and every `font-family` attribute by `supabase/functions/mcp/render.ts`; the Noto Emoji face spliced into `</style>` by `lib/snippet-render.ts`.
  - `system` → `jetbrains` in `lib/snippet-render.ts` (twice) and `supabase/functions/mcp/render.ts` (twice).
  - `prepare-render.mjs` cutting the browser loaders out between two text markers: the MCP renderer now passes the Edge loaders as its runtime, so the generated copy keeps the browser defaults unused and the cut is gone.
  - `runtime?.x ?? x` repeated per entry point.
- **One place for the card's spacing and width.** `cardMetrics(options)` resolves header, footer, decoration, line height, top padding, row cap and margin; `cardWidth(...)` the header and footer label widths and the natural width. `renderExport` and `estimateExportDimensions` both call them, and `estimateExportDimensions` takes the same `ExportOptions` (plus its resolved `language` and `compactReactions`).
  - `estimateExportDimensions` re-implements the renderer's sizing.
  - The line-cap formula written three times; the generic-header filename rule written three times (now `genericHeaderShowsFilename`).
  - Footer metrics and the header label gap written in the measurer and the drawer (now `FOOTER` and `HEADER_LABEL_GAP`).
- **The MCP reads the renderer's values.** `EXPORT_WINDOW_DECORATIONS` (built from a `Record<BrandWindowDecoration, true>`, so a new decoration fails to compile until listed), `EXPORT_WIDTH`, `EXPORT_MAX_LINES`, `EXPORT_MAX_CHARS_PER_LINE`, `EXPORT_FONT_SIZE` and `EXPORT_INNER_PADDING` replace the literals in `supabase/functions/mcp/render.ts` and `input.ts`.
- **The export modal looks backgrounds up with `findExportBackground`.**
- **Surplus removed.** `app/[snippet]/export-button.tsx` (no importers), `EXPORT_METADATA_TEXT`, `BrandFrame`, the `inferLanguage` re-export (callers import it from `lib/snippet-utils`), `exportTopPad`, `forResvg`'s font rewrite, and the `export` on module-internal constants and types.
- **Caught by review: `supabase/functions/mcp/verify/browser-client.ts`** still called the positional API. `tsconfig.json` excludes `supabase/functions`, so `tsc` could not see it; it now builds an options object and the M0 harness passes with output identical to `main`.

Special cases kept, because the system still needs them:

- The Hack fallback only when comments show and the font is not Hack (`supabase/functions/mcp/render.ts`): Edge has no browser font fallback for `↳`; it is now an option, not markup surgery.
- The swallowed fetch errors in the image loaders: a failed avatar falls back to its initial circle by design.
- `createOgImage`'s fixed 1200×630, line numbers on, no canvas: the OG contract.

## Comments removed

About 70 lines in `lib/export-utils.ts` and four in `components/export-modal.tsx` that restated the code: step labels such as `// Collect tokens per source line`, `// Top horizontal`, `// Bottom-right bracket`, `// White stripe (skewed band across the lower portion)`, `{/* Preview */}`, `{/* Controls */}`, `{/* Export actions */}`; the field docs on `BrandDecorationArgs` (`/** Editor card width. */`); prose that repeated the next lines (the pattern-PNG note, the frame-config note, the chrome-colour note duplicated from `readableOnFill`, the footer-parity note, the traffic-light note, the "last visual row" walk that also named a variable that no longer exists, the Drawer/Dialog note). Long ones were cut to the part about something outside the code (ray.so's `VercelFrame` / `TailwindFrame` / `StripeFrame` CSS, SVG's lack of box-shadow, the 0.35em optical centre, resvg's limits).

## Left as is

- `estimateExportDimensions` measures the longest line over every source line and counts source lines rather than wrapped rows; `renderExport` measures only the visible rows and counts wrapped rows. So a long line past row 30, or a line over 110 characters, sizes the live preview differently from the export. This predates the refactor and fixing it changes the composer preview, which is outside the behaviour this change may touch.
- `components/export-modal.tsx`'s preview effect keeps a hand-written dependency list beside `exportOptions` (behind an eslint-disable). Folding it into the options object changes when the preview re-renders.
- `EXPORT_LINE_HEIGHT`, `EXPORT_CHAR_WIDTH`, `EXPORT_CHROME_PAD_X`, `EXPORT_LINE_NUM_GAP` and `EXPORT_METADATA_URL` are exported only for tests; un-exporting them means editing tests, which this trial did not take on.
- `lib/og-compose.ts` and `lib/og-compose-render.ts` already depend only on `renderSnippetSvg`'s layout and duplicate nothing from the renderer.

## Evidence

Fixed fixtures (`/home/user/harness`, not committed): 15 generic cases (light and dark themes, every window decoration, padding 0, no background, 16:9, ligatures off in Fira and Hack, reactions with avatars and overflow, wrapped comments, long and truncated code, a fixed 630 px height, word diff) and all 30 brand presets, with padding-0, 16:9 and no-background variants for several. Rendered before (`origin/main`) and after:

- Browser (`createHighlightedSvg` + `renderToFile` in Chromium): 60 SVG + 60 PNG, all byte-identical.
- Server (`renderSnippetSvg`, `renderSnippetPng`, `renderSnippetSceneSvg`, `renderShareImage`): 399 files (SVG, PNG, scene PNG, OG JPEG, layout and OG metrics JSON), all byte-identical.
- MCP (`renderSnippet` under Deno, plus the options payload and the 30-row limit at and over the edge): 127 files, all byte-identical.
- M0 browser harness (`verify/browser.mjs`): 12 files, byte-identical to `main`.
