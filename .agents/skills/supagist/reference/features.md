# Supagist features and MCP parameters

## Choose the correct surface

| Goal                                                             | Surface                                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| Syntax-highlighted image with a brand or custom appearance       | MCP `render_snippet` → SVG file                                     |
| Discover exact styles and supported languages                    | MCP `list_options`                                                  |
| PNG, including the web app's 2×/4×/6× scale                      | Convert the saved SVG locally; default 2000px wide unless specified |
| Copy/download raw source                                         | Save the user's original code locally; an SVG is not a source file  |
| Edit interactively, preview, publish a shareable snippet         | Web composer at https://supagist.app                                |
| Saved snippets, live comments/reactions, presence, notifications | Web app; not MCP tools                                              |

Rendering is read-only: it neither publishes code nor retrieves saved snippets.
Supplied annotations are image content, not posted comments or real reactions.
Do not imply that a rendered file is stored in the user's Supagist account.

## Brand, theme, background, app color mode

- `brand` applies a complete preset. Request **`brand: "supabase"`** for Supabase
  style; `supabase-dark` is a legacy syntax theme, not the brand.
- `theme` changes syntax colors. Omit it when using a brand unless the user asks
  for a different palette. Do not automatically send `github_dark` with every
  brand: some presets are light.
- `background` is a case-sensitive canvas label, e.g. `"Supabase"` or `"Candy"`.
  It changes the backdrop/frame, not typography and metadata. `null` removes the
  outer canvas. Omission retains the brand canvas (or no canvas without a brand).
- The web app's Light/Dark/System toggle changes the surrounding application,
  not the snippet's syntax theme or brand.

Brand IDs: `supabase`, `vercel`, `tailwind`, `resend`, `stripe`, `github`, `openai`,
`cloudflare`, `linear`, `cursor`, `anthropic`, `gemini`, `perplexity`, `huggingface`,
`docker`, `clerk`, `prisma`, `aws`, `mintlify`, `nuxt`, `auth0`, `elevenlabs`,
`firecrawl`, `browserbase`, `triggerdev`, `flue`, `files-sdk`, `rivetkit`, `plz`.
Use `list_options.brands` for current recipes; do not manually reconstruct them.

Supabase's preset is `github_dark`, Geist Mono, outer padding 32, inner padding
16, corners 8, no line numbers, window `none`, header on with filename at left
and language hidden, footer off. Its dark canvas has green lighting, studio
guides and a bordered dark card. Font size is independently 14 by default; a
user's screenshot may explicitly use 18. Brand presets do not choose PNG scale.

Generic backgrounds: Candy, Breeze, Midnight, Sunset, Raindrop, Sand, Noir,
Forest, Ember, Ocean, Dusk. Branded background labels come from `list_options`.
Tailwind and Resend include bundled pattern images; their backgrounds are not
approximated with plain gradients.

## All render controls

Explicit fields override the chosen brand. Partial header/footer objects merge
with its defaults; omitted flags do not reset the rest of a preset.

| Field                           | Accepted values / behavior                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `code`                          | Required, 1–8000 Unicode code points, normalized LF newlines                                                          |
| `filename`                      | 1–120 characters, default `snippet`; set an actual filename for visible metadata and auto language                    |
| `language`                      | Exact ID from catalog; default `javascript`; `null` auto-detects using filename/code                                  |
| `brand`                         | Exact full preset ID above; optional                                                                                  |
| `theme`                         | Exact syntax theme ID; default brand theme, otherwise `github_dark`                                                   |
| `background`                    | Exact catalog label, `null`, or omitted                                                                               |
| `fontId`                        | `system`, `jetbrains`, `fira`, `geist`, `hack`                                                                        |
| `fontSize`                      | 12, 13, 14, 16, 18, 20 (default 14)                                                                                   |
| `windowDecoration`              | `macos`, `macos-subtle`, `windows`, `minimal`, `none`                                                                 |
| `outerPadding`                  | 0, 16, 32, 64, 96, 128; no visible outer padding without a background                                                 |
| `innerPadding`                  | 8, 12, 16, 24, 32, 48                                                                                                 |
| `cornerRadius`                  | 0, 4, 8, 12, 16                                                                                                       |
| `lineNumbers`                   | Boolean; default from brand, otherwise true                                                                           |
| `header`                        | Partial object detailed below                                                                                         |
| `footer`                        | Partial object detailed below                                                                                         |
| `author`                        | Author label (1–64 characters) for footer attribution; requires enabled footer with `showAuthor`                      |
| `reactions`                     | Line-keyed arrays of `{emoji, reactors: [{username}]}`; at most 5 chips/line, 10 reactors/chip, label 1–16 characters |
| `comments`                      | Line-keyed `{body, author?}`; one rendered comment per source line, body 1–2000 characters                            |
| `showReactions`, `showComments` | Booleans; default true when corresponding annotation data is supplied; false hides it                                 |
| `format`                        | Only `svg`                                                                                                            |
| `pixelRatio`                    | Keep 1; legacy 2 is accepted but is not the local PNG scale setting                                                   |
| `fixture`                       | Omit or `plain`; `vercel`/`avatars` are legacy benchmarks, incompatible with `brand`                                  |

Header fields: `enabled`, `showFilename`, `showLanguage` (booleans),
`filenamePosition`, `languagePosition` (`left`, `center`, `right`). Disabling
the header also removes its window chrome; hidden labels do not take space.

Footer fields: `enabled`, `showLanguage`, `showTheme`, `showLineCount`,
`showCharCount`, `showAuthor` (booleans), `alignment` (`left`, `center`, `right`).
Turning on individual items while `enabled: false` does not display the footer.

Annotations use **1-based source line keys**, not wrapped visual-row numbers.
Keys must refer to existing source lines. Reactor usernames produce colored
initial avatars; arbitrary remote avatar/image URLs are deliberately unsupported.
Use only user-supplied or explicitly fictional annotation names; do not invent
social proof. Emoji appearance depends on glyph availability; no bundled color
emoji font is promised. Inspect it, and disclose missing glyphs rather than
claiming success. ASCII labels such as `+1` are portable.

All four named fonts are embedded in the SVG as TTF for offline conversion.
`system` resolves to portable JetBrains Mono in MCP rather than depending on
the Edge worker or converter machine's installed fonts. Fira preserves the
app's bundled Fira Code Light face. No custom font uploads are supported.

The image is limited to 30 visual rows: source wraps at 110 columns, and visible
comments also consume rows. Overflows are rejected rather than truncated.
Use shorter excerpts or user-approved separate images. The 8000-character
ceiling alone does not imply all that source fits in one image.

## Advanced example matching the Supabase settings panel

Request 18px Geist, no window controls/line numbers, 32px outer/16px inner
padding, 8px corners, filename left, language hidden, footer off:

```json
{
  "code": "const greeting = \"Olá, Supagist!\";\nconsole.log(greeting);",
  "filename": "greeting.js",
  "language": "javascript",
  "brand": "supabase",
  "fontSize": 18,
  "format": "svg",
  "pixelRatio": 1
}
```

The other requested controls already match the preset; don't override them
needlessly. If the user also requests the screenshot's **6× Scale**, pass `6`
to the local PNG converter. Without an explicit resolution, keep the 2000px
default. Save both files and report their distinct dimensions.

For an explicitly annotated custom image:

```json
{
  "code": "const total = prices.reduce((sum, price) => sum + price, 0);\nconsole.log(total);",
  "filename": "total.js",
  "language": "javascript",
  "brand": "vercel",
  "fontId": "fira",
  "fontSize": 16,
  "outerPadding": 64,
  "innerPadding": 24,
  "cornerRadius": 12,
  "lineNumbers": true,
  "windowDecoration": "minimal",
  "header": { "showLanguage": true, "languagePosition": "right", "filenamePosition": "left" },
  "footer": {
    "enabled": true,
    "showLanguage": false,
    "showTheme": false,
    "showLineCount": true,
    "showCharCount": true,
    "showAuthor": true,
    "alignment": "right"
  },
  "author": "Demo author",
  "reactions": { "1": [{ "emoji": "+1", "reactors": [{ "username": "Demo reader" }] }] },
  "comments": { "2": { "body": "Inspect the accumulated total." } },
  "format": "svg",
  "pixelRatio": 1
}
```

## Web features the skill should know, without inventing MCP tools

- **Composer:** edit code and filename, auto/explicit language, choose/search
  themes or random theme, complete brand presets, individual appearance controls,
  live preview/dimensions/counts. Changed presets show Custom. Browser-local draft
  storage survives login. Draft emoji reactions allow one emoji per line; draft
  comments are unavailable until published.
- **Export:** PNG, SVG, raw source download and copy code are separate actions.
  Web PNG scale is 2×/4×/6×. MCP uses SVG plus local conversion instead. Exports
  include Supagist source attribution. Desktop export is a dialog, mobile a drawer.
- **Publish:** requires sign-in and at most 8000 code points; creates saved source,
  image assets and a shareable snippet URL, clears the draft and best-effort copies
  the link. Publishing is an external write requiring user authorization; there
  is currently no publish MCP tool.
- **Saved snippet:** public read-only code and metadata, copy code, copy share link,
  exports and social-link preview. Signed-in users add/remove their own reactions
  or add per-line comments (up to 2000 characters). Reactions and threaded comments
  update live with reader presence; authors receive notification toasts. Export
  includes current reactions but only the first comment per line, not whole threads.
- **Saved export settings:** uses the saved theme/font but does not restore every
  composer brand/layout setting. Don't promise that sharing preserves the full
  customized export recipe.
- **Your snippets:** https://supagist.app/snippets lists the signed-in user's
  snippets, newest first, with metadata and view counts.
- **Account:** GitHub OAuth or email/password sign-in, confirmation and password
  recovery. Remote MCP uses OAuth consent at `/oauth/consent`. Let users sign in
  themselves; never request their password/token or use an admin key.
- **Presence and app mode:** homepage lobby presence and saved-snippet reader
  presence, including guests; Light/Dark/System application mode is separate
  from the image's theme. These are UI features, not render parameters.

If the user wants one of these web-only operations, point them to the appropriate
page or use an authorized browser workflow when available. Do not fabricate a
tool name, public URL, account save, or successful publish.
