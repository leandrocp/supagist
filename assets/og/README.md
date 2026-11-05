# Per-snippet share image assets

Read at request time by `app/[snippet]/og.png/route.ts` (`lib/og-render.ts`),
which draws the snippet's own export render with a thin Supagist band. They
live outside `public/` so they are traced into that function instead of served.

- `seal-flat-c(-dark).svg`: the flat C seal for the band, copied from
  `assets/brand/logo/mark/` (flat C is the brand mark at 48 px and below).
- `fonts/IBMPlexMono-Medium-latin.ttf`: a static Latin subset of IBM Plex Mono
  Medium for the band's `supagist.app` and handle. SIL OFL 1.1.
- `fonts/NotoEmoji.ttf`: monochrome Noto Emoji (variable, drawn at its
  default weight), the emoji fallback when `lib/snippet-render.ts` draws a
  snippet on the server; resvg cannot draw color emoji fonts. From
  [google/fonts](https://github.com/google/fonts) `ofl/notoemoji/NotoEmoji[wght].ttf`
  at commit `b979dba`. SIL OFL 1.1.
