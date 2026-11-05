# Share image assets

Read at request time by the server renderers. They live outside `public/` so
they are traced into those functions instead of served.

- `fonts/IBMPlexMono-Medium-latin.ttf`: a static Latin subset of IBM Plex Mono
  Medium for the share image's `supagist.app` mark (`lib/og-compose-render.ts`).
  SIL OFL 1.1.
- `fonts/NotoEmoji.ttf`: monochrome Noto Emoji (variable, drawn at its
  default weight), the emoji fallback when `lib/snippet-render.ts` draws a
  snippet on the server; resvg cannot draw color emoji fonts. From
  [google/fonts](https://github.com/google/fonts) `ofl/notoemoji/NotoEmoji[wght].ttf`
  at commit `b979dba`. SIL OFL 1.1.
