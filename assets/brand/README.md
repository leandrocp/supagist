# Supagist brand assets (v3)

The approved Supagist brand kit: a red wax seal, envelope B, and the Supagist Paper and Supagist Night palettes. `brand.md` is the full guide: voice, logo geometry, minimum sizes, colour and type. `notes.md` has the designer's QA notes.

These are source files. The site serves its own copies from `public/`.

| Folder / file         | What it holds                                                                                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `logo/mark/`          | The seal. `seal-r3-*` is the photoreal master raster (use at 96 px and up), `seal-r2*` is the vector partner, and `seal-flat-{a,c}*` are flat marks (flat C at 48 px and below). |
| `logo/wordmark/`      | The Fraunces wordmark (outlined) in ink, dark, wax and white.                                                                                                                    |
| `logo/lockup/`        | Horizontal and stacked seal + wordmark lockups (`r3` PNG, `r2` and `flat` SVG).                                                                                                  |
| `logo/mono/`          | Single-colour marks and lockups in ink, wax and white. `_preview-*` are review sheets.                                                                                           |
| `logo/rules/`         | The clear-space and minimum-size sheet.                                                                                                                                          |
| `favicon/`            | `favicon.svg`/`.ico`, 16/32/48 PNGs, the Apple touch icon, 192/512 icons (with maskable versions), `site.webmanifest` and `head-snippet.html`.                                   |
| `readme/`             | README banners, 1280×400, light and dark.                                                                                                                                        |
| `social/`             | GitHub social preview, 1280×640. GitHub accepts one image, so upload the Paper one.                                                                                              |
| `og/`                 | The site's default Open Graph and Twitter images, 1200×630, light and dark.                                                                                                      |
| `google/`             | The Google app icon (R3 and flat) and the account-linking logo.                                                                                                                  |
| `brand-kit-board.png` | The whole kit on one board.                                                                                                                                                      |
| `site-board.png`      | The site redesign (v1) board.                                                                                                                                                    |

Paths in `brand.md` that start with `../../site/v1/` or `../../og/v1/` point at the design hand-off for the site and the per-snippet share image. Those are not in the repo. Their outputs are: the site chrome (`app/globals.css`, `public/brand/`), and the share image route (`app/[snippet]/opengraph-image.tsx`, `public/og/`). The generator sources (`src/`) and the `_compare/` folders were left out.

Fonts are all SIL OFL 1.1: [Fraunces](https://github.com/undercasetype/Fraunces), [Geist](https://github.com/vercel/geist-font) and [IBM Plex Mono](https://github.com/IBM/plex).
