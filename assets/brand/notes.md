# Notes: Supagist brand v3 (full kit)

Written Oct 31, 2026, about 8:10 PM EDT. Nothing published, uploaded or committed. v1, v2 and google-connected-apps are untouched.

## Picks
- **R3 photoreal for raster, R2 for vector.** R3 is used for the seal from 96 px up, plus the apple and PWA icons and the Google app icon. Flat C is used at 48 px and below.
  - This changes v2, where the PWA and Apple icons were flat A.
  - The flat versions are in `favicon/_compare/` if he prefers them.
- **Envelope B** everywhere there's an envelope (site, banner, social, OG defaults).
- **Per-snippet OG: direction A** ("Opened letter"), in `../../og/v1/`.

## Checks
| Check | Result |
|---|---|
| Sizes | OG/Twitter 1200×630; GitHub preview 1280×640; README 1280×400; apple 180; icons 192/512 (+maskable); ico 16/32/48 |
| AA | All site text tokens ≥4.5:1. Light primary button label is 4.52:1 (tight, passes). Faint was darkened to `#6C6358` / `#948C7F` to pass on surf2 (4.67 / 4.77). |
| Layout QA | Fixed OG default and GitHub preview: the subline ran under the code card. The text column is now 470/490 px. |
| Fonts | Fraunces, Geist, IBM Plex Mono: all OFL. No other font files. |
| Assets | All art is our own (generated or drawn). R3 is AI-assisted from our flat mark (see v2 notes on rights). |

## Anything off
- **R3 at favicon-adjacent sizes:** apple-touch at about 60 px on a home screen sits under the 96 px rule. It reads because the tile is mostly seal, but flat is the safer choice.
- **Mock card vs real render:** the code card in the banner, social and OG defaults is an HTML replica of the default render. When building, swap in a real render, or keep the replica (it's ours).
- **README banner** has no headline, on purpose, since GitHub shows the repo name right above it.
- **Copy:** "Code worth sending." and the other sample lines are proposed, not approved.
- `brand/v3/site-board.png` is a copy of `site/v1/site-board.png`.
