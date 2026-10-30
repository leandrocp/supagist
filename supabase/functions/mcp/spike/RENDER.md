# M0 renderer adapter (not M1 extraction)

`../render.ts` exports `renderSnippet`, `supportedLanguages`, `supportedThemes`,
`appearanceOptions`, `RenderInput`, and `RenderResult`. The public schema in
`../input.ts` exposes the app's complete brand presets, explicit appearance and
metadata overrides, and supplied reactions/comments. See the Supagist skill's
`reference/features.md` for the public contract. `format` is SVG only and
`pixelRatio` is `1 | 2`; raster resolution belongs to local conversion. Legacy
`plain | vercel | avatars` fixtures remain for benchmarks. Input is validated at
the tool and renderer boundaries; unknown fields and inputs that would truncate
beyond 30 visual rows are rejected.

The result contains `svg: string`,
`width`, `height`, `logicalWidth`, `logicalHeight`, `bytes`, `contentType`,
`timings`, and `parserEvents`. Width/height are physical output dimensions;
logical dimensions are pre-pixel-ratio. SVG retains a logical viewBox and embeds
the selected font's TTF. PNG conversion belongs to the client; the Edge renderer has
no rasterizer dependency.

## Reproduce

```sh
npm ci
node supabase/functions/mcp/spike/prepare-render.mjs
mise exec deno@2.9.0 -- deno test --config supabase/functions/mcp/deno.json \
  --allow-read --allow-net --allow-env supabase/functions/mcp/spike/render.deno.ts
npm run lint
npm test
```

Preparation uses Node's built-in TypeScript erasure, installed Rolldown **1.2.16**,
and the repository formatter. It refuses any installed Lumis version other than
**0.10.1** or themes version other than **0.4.3**. It generates copies of eight existing app modules,
with source SHA-256 records and a Vitest source-drift guard. No app source changes,
extraction, new root dependency, hand-written approximation of the card, or native
Lumis entrypoint is involved. The generated code retains unused browser export
helpers, but the only public execution path is `createHighlightedSvg`.

Generation changes only imports, the two browser asset loaders, WOFF2 font MIME
and format to TTF, and the app's load-or-plaintext helper to strict loading. The
actual Vercel background, scene, registration guides, frame, and Gaussian
`feDropShadow` come directly from the copied app presets/rendering. Geist, Fira,
Hack and JetBrains TTFs plus the two app pattern PNGs are bundled (see the assets
README for provenance). `system` uses JetBrains for portable output. Benchmark
reaction labels use ASCII `+1`; no color emoji font is bundled.

`fixtures.ts` provides fixed short and 30-line TypeScript inputs. The avatars
selector adds fixed PNG portraits to lines 3, 15 and 30 and the footer; it does
not replace the caller's code. These are original deterministic pixel portraits,
not a remote user's photograph and not the app's initial-circle fallback.

## Parent-owned Edge configuration

The renderer's dependency graph uses local generated JavaScript, not npm imports.
`prepare-vendor.mjs` prebundles the exact Lumis browser entrypoint and formatters,
and copies all 256 themes' exact data modules (retaining lazy imports).
It does not modify rendering algorithms,
minify code, replace runtime globals, or change Tree-sitter's conditional Node
branches. Rolldown reports two existing upstream direct-eval warnings.

Only the input schema's existing `zod` alias is needed for rendering. Configuration can
remove `@lumis-sh/lumis/client`, `@lumis-sh/lumis/`, `@lumis-sh/themes/`, and
`@resvg/resvg-wasm` aliases if nothing else uses them. Keep the endpoint's other
dependencies unchanged.

This avoids Edge Runtime's whole-npm-package VFS inclusion of optional native
Lumis binaries, unused theme formats, and Tree-sitter debug/maps/types. Source
hashes, generated output hashes/sizes and package versions are recorded in
`generated/vendor/vendor-manifest.json`; notices are in `vendor-licenses.txt`
there and in `../assets/`. The former resvg wrapper, WASM, and source cache have
been removed along with the PNG render path.

Include `./functions/mcp/assets/*` in `[functions.mcp].static_files` in
`supabase/config.toml`. `Deno.readFile(new URL(..., import.meta.url))` reads the
bundled TTF and fixed avatar PNGs. The generated parser metadata JSON is an
import in the source graph, not a filesystem asset. No parser `.wasm` is shipped.

The complete installed parser manifests (112 packages) are copied at preparation
time, fixing queries, exact versions and SHA-256 digests. `wasmResolver` returns
`https://cdn.jsdelivr.net/npm/<package>@<exact-version>/<parser>.wasm` after
checking the reference against this local lock. Lumis verifies fetched bytes.
Metadata resolution uses local data URLs, not floating CDN version ranges.
Canonical language IDs only; aliases such as `ts` are deliberately not accepted.
The exported arrays are the authoritative advertised support lists. The Deno
test exercises TypeScript; it does not exhaustively certify every parser/theme.

## Measurement semantics and limitations

`preloadWallMs` includes highlighter readiness, parser download/integrity/compile
and theme loading. `svgWallMs` includes app layout, highlight and assets.
`totalWallMs` is the whole call. The former rasterization timings no longer apply
to the SVG-only renderer. **None of these is CPU time.** Module import/startup before the call
is outside these intervals; the endpoint/harness must measure that separately.

JSON logs expose `parser-fetch-requested` (URL/version/digest),
`parser-preload-complete`, and `render-complete`. A resolver event means a fetch
was requested, not that it completed; successful preload proves fetch/integrity/
compile succeeded. The bounded event history is isolate-wide; with concurrent
requests, returned events can include overlapping requests. Use sequential
requests for cold/warm measurements. CacheStorage can survive Deno runs;
isolate-cold and network-cold are different.

Only the requested root language is preloaded. Browser Lumis cannot fetch an
injected language halfway through synchronous highlighting; mixed-language
documents are not claimed as a supported M0 golden path. Current Lumis docs
explicitly warn Edge support is not guaranteed (Tree-sitter upstream issue 2160).
Passing standalone Deno is not evidence of Supabase CPU/memory-budget viability.
That is the parent-owned Edge-runtime experiment. Before the packaging change,
the actual CLI-served 883×956 avatar PNG fixture at 1× exceeded the Edge CPU limit.
Prebundling must not be interpreted as a fix for that result.

Docs consulted: <https://docs.lumis.sh/usage/javascript>,
<https://github.com/thx/resvg-js/tree/main/wasm>,
<https://supabase.com/docs/guides/functions/wasm>. Old `lumis.sh/docs/...` URLs
redirected to no usable documentation; the current docs live at `docs.lumis.sh`.
