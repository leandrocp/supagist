# Supagist brand v3: full kit (2026-10-31)

Status: proposal. Nothing published, uploaded or committed.
- **Boards:** `brand-kit-board.png` (the whole kit) and `site-board.png` (a copy of `../../site/v1/site-board.png`).
- **What carries over:** v3 copies v2 forward; v1 and v2 are untouched.
- **What's locked:** "R3 photoreal, R2 for vector", envelope **B**, per-snippet OG direction **A**.

## 1. Idea and voice
**Idea:** sharing code is like sending a letter. You make it with care, seal it and send it. It's a little old-fashioned on purpose, in an AI-everything era.

**Voice:** warm, plain, a little wry. Short sentences, real verbs, no hype.
- Talk about *what happens to the code* (seal, send, open, reply), not about features.
- One metaphor per surface. If a line already says "sealed", don't add "stamped" and "delivered" too.
- No exclamation marks in UI copy, no emoji in chrome, no "unleash" or "supercharge", no sparkles.

**Proposed sample lines** (none is live copy; Leandro to approve):
| Where | Line |
|---|---|
| Hero h1 | Code worth sending. |
| Hero sub | Turn a snippet into a beautiful, branded card. Seal it, share it, or render it straight from your agent. |
| Tagline / README | Your code, sealed and sent. |
| Publish button helper | Sealed. Anyone with the link can open it. |
| Empty list | You have not published anything yet. |
| 404 | This snippet has scrolled away. |
| Error | We couldn't render this page. |
| OG footer | supagist.app (no tagline on per-snippet cards; the snippet is the message) |

Existing lines kept as-is: "Share a code snippet. Reactions and comments on every line." and "Thank you for signing up!".

## 2. Logo system (`logo/`)
| Asset | Files | Use |
|---|---|---|
| **Seal R3 photoreal (master raster)** | `mark/seal-r3-2048.png` (with contact shadow), `seal-r3-2048-noshadow.png` | 96 px and up: hero, envelope, OG, social, app icons |
| **Seal R2 (vector partner)** | `mark/seal-r2(-dark).svg`, `-2048.png` | anywhere that must stay vector: SVG lockups, print |
| **Flat A** | `mark/seal-flat-a(-dark).svg/.png` | one-colour, emboss, flat lockups |
| **Flat C (small)** | `mark/seal-flat-c(-dark).svg/.png` | 48 px and below: favicon, nav 32/28, footer 22, Google account linking |
| Wordmark | `wordmark/wordmark(-dark/-wax/-white).svg/.png`, Fraunces 600, opsz 144, SOFT 50, outlined | with or without the seal |
| Horizontal lockup | `lockup/horizontal-{r3,r2,flat}(-dark)` (r3 is PNG; r2 and flat are SVG, flat also PNG) | headers, README, social |
| Stacked lockup | `lockup/stacked-{r3,r2,flat}(-dark)` | square spaces, splash |
| Mono | `mono/{seal-a,seal-c,horizontal,stacked}-{ink,wax,white}.svg/.png` (`_preview-*` are review sheets) | single-colour print, embroidery, watermark |
| Rules | `rules/clear-space-min-size.png` | |

**Geometry:**
- The seal is 2.5× the wordmark cap height (x).
- The gap is 0.4x.
- Clear space is 1x on every side.
- In the stacked lockup, the seal is 3.4x, with 0.55x below the seal.

**Minimum sizes:**
| Asset | Minimum |
|---|---|
| R3 seal | 96 px |
| Flat A | 24 px |
| Flat C | 16 px |
| Flat lockup | 96 px wide |
| R3 lockup | 200 px wide |
| Wordmark | 72 px wide |

**Size rule:**
- R3 from 96 px up; flat C at 48 px and below.
- Between the two, R3 is allowed only on hero-like art; UI chrome stays flat.

### Seal do's and don'ts
- **Do:**
  - Press it onto something: a flap tip, a card corner, an edge.
  - Rotate it within ±12°.
  - Keep its own light (top-left) and contact shadow.
- **Don't:**
  - Mirror it, recolour it, outline it, or put it in a badge or box.
  - Add glow, sparkles or a second drop shadow.
  - Float it in empty space.
  - Put it on kraft or postal blue at small sizes.
  - Use R3 above about 1200 px displayed (use R2).
  - Use R3 below 96 px.
- R3 averages about `#B4251B`, darker than UI wax `#C7362B`. That's intended ("the seal is real wax"). It's an image, not a token.

## 3. Colour
Light theme **Supagist Paper**, dark theme **Supagist Night**. Full token table with WCAG AA results: `../../site/v1/site-spec.md` §2.
| Role | Paper | Night |
|---|---|---|
| Background | `#F4EDE0` | `#121212` |
| Letter / surface | `#FBF8F2` | `#1C1B19` |
| Quiet panel | `#EDE4D3` | `#24221F` |
| Ink | `#1C1A17` (14.9:1) | `#F1E9DA` (15.5:1) |
| Muted | `#5E574C` (6.1:1) | `#A79F92` (7.2:1) |
| Faint (new in v3) | `#6C6358` (5.1:1) | `#948C7F` (5.6:1) |
| Wax (primary) | `#C7362B`, label `#F4EDE0` 4.52:1 | `#E0503A`, label `#121212` 4.8:1 |
| Wax text | `#A82A20` (6.0:1) | `#F07A63` (6.8:1) |
| Postal blue (links, focus) | `#24477A` (8.0:1) | `#8FB0E0` (8.4:1) |
| Kraft (decorative only) | `#C9A27A` | `#8C6E4F` |

**Rules:**
- Surfaces separate by tone, not lines.
- Red is for one primary action per view, plus the seal.
- Blue is for links and focus.

## 4. Type (all SIL OFL 1.1)
- **Fraunces**: display and wordmark. https://github.com/undercasetype/Fraunces
- **Geist**: UI and body. https://github.com/vercel/geist-font
- **IBM Plex Mono**: labels, meta, postmarks. https://github.com/IBM/plex

Code inside the product card keeps the renderer's own font stack (not restyled).

## 5. Envelope (pick B) and supporting graphics
- **Envelope B, the "sealed envelope object":** a layered envelope back with soft lift shadows, crease shading and paper grain, with the R3 seal pressed on the flap tip.
  - Rules and parameters: `../../site/v1/site-spec.md` §6.
  - Files: `../../site/v1/assets/envelope-b(-dark).svg` and `@2x.png`.
  - Options A and C: `../../site/v1/envelope/`.
- **Use one envelope per surface.** Don't outline it, don't draw it as a single V line, and don't add a postmark on the hero.
- **Postmark** (postal blue, Plex, ink texture): only in OG direction B and envelope option A. Not part of the core kit.
- **Code themes "Supagist Paper" and "Supagist Night":** `../../site/v1/code-theme/`.
  - They're proposed *additions* to `BRAND_THEMES`, so they'd add picker options (a product decision).
- **Not used:** sparkles, perforated stamp edges, letterhead rules, borders and dividers.

## 6. What does not change
- The Lumis renderer, its themes and the card it draws are unchanged.
- The brand presets `lumis`, `lumis-dark`, `mdex-purple`, `mdex-purple-dark` are unchanged.
- Only the site chrome and Supagist's own marketing assets change.
- Wherever a mock shows a product card, it's a replica of the default `github_light` output.

## 7. Files
- **`favicon/`:**
  - Icons:
    - `favicon.svg`: flat C, switches with the OS theme.
    - `favicon.ico`: 16, 32 and 48.
    - `favicon-{16,32,48}.png`: flat C.
    - `apple-touch-icon.png` (180), `icon-192.png` and `icon-512.png`: R3 on Paper.
    - `icon-{192,512}-maskable.png`: R3 inside the 80% safe zone.
  - `site.webmanifest` and `head-snippet.html`.
  - `_compare/`: flat vs R3 tiles for those sizes.
- **`google/`:**
  - `app-icon-512.png`: R3. `app-icon-512-flat.png` is the fallback; `app-icon-512-source.svg` is the source.
  - `account-linking-logo.svg`: flat C. `-r2-alt.svg` is for comparison.
- **`readme/readme-banner(-dark).png`:** 1280×400. Use them in the README like this:
  ```html
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/readme-banner-dark.png">
    <img alt="Supagist" src="docs/readme-banner.png" width="1280">
  </picture>
  ```
- **`social/github-social-preview(-dark).png`:** 1280×640. GitHub accepts one image, so use the Paper one.
- **`og/og-image(-dark).png` and `og/twitter-image(-dark).png`:** 1200×630 site defaults. The twitter images are identical to the OG ones, on purpose.
  - The repo's current `app/opengraph-image.png` is 1200×600, so replace it with 630.
- **Per-snippet OG template:** `../../og/v1/`. Direction A "Opened letter" (pick), B and C, fallbacks, legibility strip, and `og-spec.md`.
- **`src/`:** generators.
  - Scripts:
    - `seal.py`, `build_marks.py`, `realistic.py`, `cutout_r3.py`, `render_realistic.py` and `realistic_marks.py`: v2 marks.
    - `kit.py`: logo system, mono, favicons.
    - `assets3.py`: banner, social, OG defaults, rules sheet.
    - `kit_board.py`: `brand-kit-board.png`.
  - Folders:
    - `_html/`: page sources.
    - `_carryover/`: the v2 files, as copied.
    - `_superseded/`: v2 site, social and og drafts replaced in v3.
    - `_build/`: scratch.
