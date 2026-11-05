---
name: supagist-add-brand
description: Adds a new Supagist brand preset (canvas, colours, card frame, corners, padding, font and an existing Lumis theme) from a project's logo and brand colours, then checks it renders, keeps every shipped preset unchanged, and opens a pull request. Use when contributing a brand to the Supagist repository, such as "add a Bun brand to Supagist" or "make a Supagist preset for our project". Not for syntax themes, which belong in Lumis.
license: MIT
compatibility: Run inside a clone of github.com/leandrocp/supagist with Node.js 22 (npm ci) and Deno 2.9 (mise exec deno@2.9.0, or a local deno) for the sample render.
---

# Add a Supagist brand preset

A brand preset is a complete look: canvas, card frame, corners, padding,
window style, font and a syntax theme. Every preset lives in one list,
`BRAND_PRESETS` in [`lib/brand-presets.ts`](../../lib/brand-presets.ts). The
web composer, exports, OG cards, the MCP server and the CLI all read it, the
last two through a generated copy for the Edge Functions.

Use the existing presets as models: a scene preset such as `linear` or `clerk`
for most brands, and `lumis`, `mdex-purple` and `inertia` (commits `9024dac`,
`90713be`) for what a bespoke canvas takes.

## Out of scope: themes, fonts and new renderer features

- **Themes stay in Lumis.** A preset points at an existing Lumis theme id. If
  no theme fits the brand, stop and add one to Lumis first with the
  `lumis-add-theme` skill in
  [leandrocp/lumis](https://github.com/leandrocp/lumis). Supagist picks it up
  when it upgrades `@lumis-sh/themes`. Don't add a theme to
  `lib/brand-themes.ts` or hand-write token colours.
- **Fonts** are limited to `system`, `jetbrains`, `fira`, `geist` and `hack`.
  The database checks `font_id`, so a new font needs a migration and the
  maintainer's OK. Pick one of the five.
- **New canvas art** (a new `decoration.layers` kind, window decoration or
  frame field) changes the renderer, not just the list. Inertia's ASCII art
  is that kind of change. Open an issue to discuss it first. This skill covers
  presets built from the existing pieces.

## Inputs

Collect these before editing. Ask the user for anything missing; don't guess.

1. **Project name** and a **brand id**: lowercase letters, digits and
   hyphens, not already used (`rg 'id: "<id>"' lib/brand-presets.ts` finds
   nothing).
2. **Logo** from a source whose licence allows it:
   - [Simple Icons](https://github.com/simple-icons/simple-icons) (CC0):
     `https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/<slug>.svg`.
     Its `data/simple-icons.json` gives the brand hex and source.
   - The project's own repository, under its licence (MIT, Apache-2.0, CC0,
     etc.), used as is.
   - No licensed logo? Ship no mark: leave out `logoUrl` (as `plz` does)
     rather than drawing one.
3. **Brand colours**: the accent and the brand's canvas and card colours,
   from its site, brand kit or Simple Icons hex. Note where each came from.
   When the Simple Icons hex is plain black or white (it would vanish as a
   mask on that look), take the accent from the brand's site and say so in
   the preset's comment.
4. **Light or dark** look, and the **packages** the brand is for (exact
   package names, for the usage skill's brand table).

## Steps

### 1. Set up

Fork the repository first (`gh repo fork leandrocp/supagist --clone`) unless
you can push to it.

```sh
npm ci
git switch -c add-<id>-brand
```

### 2. Add the logo

Save it as `public/brands/<id>.svg`. The picker paints a mark as a CSS mask
in the accent colour, so a single-colour silhouette works best. For a
multi-colour mark, set `logoFullColor: true` instead.

Add the source and licence to
[`public/brands/README.md`](../../public/brands/README.md), next to the
marks from the same source.

### 3. Pick the theme

Choose an existing Lumis theme whose appearance matches the brand's look (a
light theme for a light card, a dark one for a dark card):

```sh
node -e 'import("@lumis-sh/lumis/client").then((m) => console.table(m.availableThemes()))'
```

Popular choices in the existing presets are `github_dark`,
`github_light`, `tokyonight_night`, `catppuccin_mocha`, `nightfly` and
`vscode_dark`. If nothing fits, see "Out of scope" above.

### 4. Add the preset

Append the preset to the **end** of `BRAND_PRESETS` in
`lib/brand-presets.ts`. The digest test pins every preset before it, so
inserting it anywhere else fails the test. Start from a scene preset:

```ts
  // <Project>: <one line on where the look comes from>. Colours from <source>.
  {
    id: "<id>",
    name: "<Project>",
    logoUrl: "/brands/<id>.svg",
    accent: "#RRGGBB", // the brand colour; tints the picker mark
    appearance: "dark", // or "light"
    // Optional: a bespoke ambient scene (glows, guide, rim). Without one,
    // the scene is derived from appearance and accent.
    // scene: <ID>_SCENE,
    background: {
      label: "<Project>", // the canvas name users pass to --background
      from: "#RRGGBB", // canvas gradient start
      to: "#RRGGBB", // canvas gradient end (same as from for a flat canvas)
      brandId: "<id>",
      frame: darkFrame("#CARD_FILL", "#CARD_BORDER", 8), // or lightFrame(...)
    },
    settings: defaults("<lumis_theme_id>", {
      fontId: "geist", // system | jetbrains | fira | geist | hack
      cornerRadius: 8, // 0 | 4 | 8 | 12 | 16, same as the frame radius
      // outerPadding: 32, // 0 | 16 | 32 | 64 | 96 | 128
      // innerPadding: 16, // 8 | 12 | 16 | 24 | 32 | 48
      // windowDecoration: "minimal", // macos | macos-subtle | windows | minimal | none
      // lineNumbers: false,
    }),
  },
```

- `defaults()` supplies the rest: Geist, padding 32/16, corners 8, no line
  numbers, a header and a footer without author or character count.
- For a bespoke scene, add a `const <ID>_SCENE = signatureScene(...)` next to
  the others (see `LINEAR_SCENE`); the digest covers only the preset list, so
  a new constant is fine. Guides are `none`, `crosshair`,
  `registration`, `studio`, `stripe-planes`, `halo` and `beam`.
- Keep the code readable on the card: the card fill must contrast with the
  theme's text and the canvas with the card.

### 5. Update the usage skill's brand table

Append a row to the table in
[`skills/supagist/reference/brands.md`](../supagist/reference/brands.md), in
the same position as in `BRAND_PRESETS` (last). The id, name and look must
match the preset; a test checks them. List exact package names, or
"None: only on request".

### 6. Add the tests

In `lib/brand-presets.test.ts`:

- Bump `expect(BRAND_PRESETS).toHaveLength(N)` by one and add the name to the
  list under it.
- Add a `describe("<Project> preset")` block like the Inertia one: assert the
  canvas, frame and settings you chose with `toMatchObject`, and that
  `logoUrl` points to a file in `public/` that exists.

Don't touch the "leaves the shipped presets exactly as they were" digest.

### 7. Regenerate the MCP Edge copy

The MCP server and the CLI's render API run a generated copy of the preset
list. Regenerate it and commit the result:

```sh
node supabase/functions/mcp/spike/prepare-render.mjs
```

Then check what changed:

```sh
git status --short supabase/functions/mcp/spike/generated
```

Only `generated/brand-presets.js` and `generated/sources.json` should change.
If anything under `generated/vendor/` changed, your `node_modules` differs from
the lockfile: run `npm ci` and regenerate rather than committing it. The
script's Rolldown `[EVAL]` warnings are expected. A source-drift test in
`npm test` fails if you skip this step.

### 8. Render a sample card and look at it

```sh
mkdir -p /tmp/brand-sample
# A short excerpt in a language the brand's users write; the filename's
# extension picks the language.
deno run --config supabase/functions/mcp/deno.json --allow-read --allow-net \
  --allow-env --allow-write skills/supagist-add-brand/scripts/render-sample.mjs \
  <id> path/to/example.ts /tmp/brand-sample/<id>.svg
rm -f /tmp/brand-sample/<id>.png   # the converter never overwrites
node skills/supagist/scripts/convert-png.mjs /tmp/brand-sample/<id>.svg \
  /tmp/brand-sample/<id>.png 2
```

`deno` can be `mise exec deno@2.9.0 -- deno`. The render downloads parser WASM
from jsDelivr, so it needs network access. Check the social canvas too by
rendering to `/tmp/brand-sample/<id>-16x9.svg` with `16:9` as a fourth
argument. Open the PNGs and check that:

- the canvas, card fill, border and corners match the brand colours;
- every token is readable on the card (no dark-on-dark or light-on-light);
- the header and footer look right and nothing is clipped.

Fix the preset and render again until it looks right. Keep the PNG for the
pull request; don't commit it.

### 9. Check the shipped presets didn't change, then run everything

```sh
npx vitest run lib/brand-presets.test.ts lib/supagist-skill.test.ts
npm run lint
npm run fmt:check   # npx oxfmt <file> to fix
npm run typecheck
npm test
deno test --config supabase/functions/mcp/deno.json --allow-read --allow-net \
  --allow-env supabase/functions/mcp/spike/render.deno.ts
```

The Deno tests also download parser WASM; if one fails with a network error
(a TLS or body read error), rerun it once before investigating.

"leaves the shipped presets exactly as they were" is the digest check: it
hashes every preset before yours. If it fails, you changed an existing preset
(often by editing a shared helper such as `darkFrame` or `defaults`). Undo
that change instead of updating the digest.

### 10. Open a pull request

Follow the Workflow section of
[`CONTRIBUTING.md`](../../CONTRIBUTING.md): one focused commit with a plain
message that says what changed and why. Then open the pull request against
`main`:

```sh
git add lib/brand-presets.ts lib/brand-presets.test.ts public/brands \
  skills/supagist/reference/brands.md \
  supabase/functions/mcp/spike/generated/brand-presets.js \
  supabase/functions/mcp/spike/generated/sources.json
git commit -m "Add the <Project> brand preset"
git push -u origin add-<id>-brand
gh pr create --repo leandrocp/supagist --base main \
  --title "Add the <Project> brand preset" --body-file pr.md
```

Fill in `pr.md` (outside the repo, or delete it after) from the repository's
pull request template,
[`.github/pull_request_template.md`](../../.github/pull_request_template.md):
copy it, fill in "What and why" and the "Brand preset" section (logo source
and licence, where each colour came from, the theme and why), and tick every
box that holds. After the pull request opens, drag the sample PNGs into it.

CI runs the full suite, including the end-to-end and Deno tests. A
maintainer merges; pushes to `main` deploy.
