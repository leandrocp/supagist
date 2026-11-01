# Per-snippet share image assets

Read at request time by `app/[snippet]/og.png/route.tsx`. They live outside
`public/` so they are traced into that function instead of served.

- `envelope-back(-dark).png`, `envelope-front(-dark).png`: the opened envelope
  of OG direction A at 1200×630, with the R3 seal baked into the back layer.
  From the og/v1 design hand-off.
- `seal-r3-256.png`: the brand-row seal (from `assets/brand/logo/mark/seal-r3-2048.png`).
- `fonts/`: static Latin subsets of Fraunces (SemiBold, opsz 144, SOFT 50),
  Geist (Medium, SemiBold) and IBM Plex Mono (Medium). SIL OFL 1.1.
- `fonts/NotoEmoji.ttf`: monochrome Noto Emoji (variable, drawn at its
  default weight), the emoji fallback when `lib/snippet-render.ts` draws a
  snippet on the server; resvg cannot draw color emoji fonts. From
  [google/fonts](https://github.com/google/fonts) `ofl/notoemoji/NotoEmoji[wght].ttf`
  at commit `b979dba`. SIL OFL 1.1.
- `emoji/`: Noto Emoji 72 px PNGs for exactly the reactions the database allows
  (`public.is_allowed_reaction`), named by code point without U+FE0F. From
  [googlefonts/noto-emoji](https://github.com/googlefonts/noto-emoji) tag
  `v2026-09-24-unicode18_0` (commit `e20cbc2`). Image resources are Apache 2.0
  per the upstream README. Self-hosted so a render never depends on a CDN.
