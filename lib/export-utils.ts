import {
  inferLanguage,
  languageDisplayName,
  codePointLength,
  type ExportReactionChip,
} from "@/lib/snippet-utils";
import { nameToColor, nameToInitials } from "@/lib/presence-utils";

export { inferLanguage };

export const EXPORT_WIDTH = 1200;
export const EXPORT_LINE_HEIGHT = 24;
export const EXPORT_FONT_SIZE = 14;
export const EXPORT_MAX_LINES = 30;
export const EXPORT_WIN_PAD_X = 18;
export const EXPORT_WIN_PAD_TOP = 56;
export const EXPORT_WIN_PAD_BOTTOM = 24;
export const EXPORT_BG_PADDING = 64;
export const EXPORT_WIN_RADIUS = 12;
export const EXPORT_MAX_CHARS_PER_LINE = 110;
export const EXPORT_CHAR_WIDTH = 8.8; // approx advance width for ui-monospace at 14px
export const EXPORT_MIN_WIDTH = 420;
export const EXPORT_LINE_NUM_WIDTH = 18; // width reserved for line number column

export type ExportFont = { id: string; label: string; family: string; file: string };
export const EXPORT_FONTS: ExportFont[] = [
  {
    id: "system",
    label: "System",
    family: "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
    file: "",
  },
  {
    id: "jetbrains",
    label: "JetBrains Mono",
    family: "JetBrains Mono",
    file: "/fonts/jetbrains-mono.woff2",
  },
  { id: "fira", label: "Fira Code", family: "Fira Code", file: "/fonts/fira-code.woff2" },
  { id: "geist", label: "Geist Mono", family: "Geist Mono", file: "/fonts/geist-mono.woff2" },
  { id: "hack", label: "Hack", family: "Hack", file: "/fonts/hack.woff2" },
];

const fontBase64Cache = new Map<string, string>();

async function loadFontBase64(file: string): Promise<string> {
  if (fontBase64Cache.has(file)) return fontBase64Cache.get(file)!;
  const resp = await fetch(file);
  const buf = await resp.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  const b64 = btoa(binary);
  fontBase64Cache.set(file, b64);
  return b64;
}

// Avatar URLs need to be embedded as data URLs in the SVG so the canvas
// rasterisation step doesn't taint the canvas (cross-origin URLs in an SVG
// painted onto a canvas would block toBlob). We cache by URL across renders
// because most exports include the same author / reactor avatars repeatedly.
const imageDataUrlCache = new Map<string, string | null>();

async function loadImageDataUrl(url: string): Promise<string | null> {
  if (imageDataUrlCache.has(url)) return imageDataUrlCache.get(url) ?? null;
  try {
    const resp = await fetch(url, { mode: "cors" });
    if (!resp.ok) {
      imageDataUrlCache.set(url, null);
      return null;
    }
    const blob = await resp.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    imageDataUrlCache.set(url, dataUrl);
    return dataUrl;
  } catch {
    imageDataUrlCache.set(url, null);
    return null;
  }
}

// Backwards-compat alias — this used to be avatar-specific, but the body is
// the same so we now reuse it for brand pattern PNGs as well.
const loadAvatarDataUrl = loadImageDataUrl;

/**
 * Per-brand chrome customisations for the editor card itself. Each brand has
 * a recognisable shape — Vercel is borderless and chromeless, Stripe sits in
 * a rounded subtle-border card, Resend uses a clean header strip, etc. The
 * default (no frame) is the macOS-style three-dots + centred filename header
 * we use everywhere else.
 */
export type BrandFrame = {
  /** macOS traffic-light dots at the top-left of the card. Default: true. */
  showDots?: boolean;
  /** Filename centred in the card's top region. Default: depends on
   *  showFilename param (the modal toggle). */
  showCenteredFilename?: boolean;
  /** Filename + optional language label rendered as a left-aligned header
   *  strip with a divider underneath (Resend/Supabase-style). */
  headerStrip?: { showLanguage?: boolean };
  /** Card stroke. `null` means no stroke (Vercel's borderless look). */
  cardBorder?: { color: string; width: number } | null;
  /** Corner radius. Defaults to EXPORT_WIN_RADIUS. Set to 0 for Vercel's
   *  sharp-cornered look. */
  cardRadius?: number;
  /** Override the editor card fill colour — useful when the card needs to
   *  read translucent or off-tone over a brand background. */
  cardFill?: string;
};

export type ExportBackground = {
  label: string;
  from: string;
  to: string;
  /** Public path to a brand SVG logo when this gradient is brand-flavoured;
   *  the export-modal picker renders it as a marker so brands stand out from
   *  the generic gradient rows. */
  logoUrl?: string;
  /** Public path to a brand-supplied PNG pattern. When set, the export
   *  renders the image as the outer canvas backdrop instead of (or on top
   *  of) the gradient — that's what ray.so does for Tailwind/Resend. */
  patternUrl?: string;
  /** Brand id ("vercel", "stripe", ...). When set, the export emits
   *  brand-specific SVG decoration on top of the flat fill (Vercel's
   *  registration brackets + gridlines, Stripe's skewed stripe + colour
   *  layers, Tailwind's gridlines). Mirrors ray.so's per-brand Frame
   *  components. */
  brandId?: "supabase" | "vercel" | "tailwind" | "resend" | "stripe";
  /** Per-brand chrome customisation — see BrandFrame. */
  frame?: BrandFrame;
};

export const EXPORT_BACKGROUNDS: ExportBackground[] = [
  { label: "Candy", from: "#A58EFB", to: "#E9BFF8" },
  { label: "Breeze", from: "#CF2F98", to: "#6A3DEC" },
  { label: "Midnight", from: "#4CC8C8", to: "#202033" },
  { label: "Sunset", from: "#FFCF73", to: "#FF7A2F" },
  { label: "Raindrop", from: "#8EC7FB", to: "#1C55AA" },
  { label: "Sand", from: "#EED5B6", to: "#AF8856" },
  { label: "Noir", from: "#B1B1B1", to: "#181818" },
  { label: "Forest", from: "#506853", to: "#213223" },
  { label: "Ember", from: "#FF512F", to: "#F09819" },
  { label: "Ocean", from: "#43CEA2", to: "#185A9D" },
  { label: "Dusk", from: "#C471ED", to: "#12C2E9" },
];

/**
 * Brand-flavoured gradients available alongside the generic ones in the
 * export modal. Values mirror ray.so's partner-themes catalog so each brand
 * reads the same way it does there. We only use the brand's gradient + logo
 * here — the syntax palette stays driven by whatever theme the user picked,
 * so a Vercel background can frame, say, a github_light snippet.
 */
export const EXPORT_BRAND_BACKGROUNDS: ExportBackground[] = [
  // Supabase: dark wash, header strip with filename (no traffic lights),
  // sharp-but-rounded card with a hairline border in the brand grey.
  {
    label: "Supabase",
    from: "#121212",
    to: "#121212",
    logoUrl: "/brands/supabase.svg",
    brandId: "supabase",
    frame: {
      showDots: false,
      showCenteredFilename: false,
      headerStrip: { showLanguage: false },
      cardBorder: { color: "#292929", width: 1 },
      cardRadius: 6,
      cardFill: "#171717",
    },
  },
  // Vercel: borderless, chromeless, sharp corners. The page bg's gridlines
  // and corner brackets imply where the "card" is — there is no filled card
  // rect at all (the card fill matches the bg so no card edge shows).
  {
    label: "Vercel",
    from: "#000000",
    to: "#000000",
    logoUrl: "/brands/vercel.svg",
    brandId: "vercel",
    frame: {
      showDots: false,
      showCenteredFilename: false,
      cardBorder: null,
      cardRadius: 0,
      cardFill: "#000000",
    },
  },
  // Tailwind: keeps the macOS dots, sits on the beams PNG.
  {
    label: "Tailwind",
    from: "#0F172A",
    to: "#0F172A",
    logoUrl: "/brands/tailwind.svg",
    patternUrl: "/brands/tailwind-beams.png",
    brandId: "tailwind",
    frame: {
      showDots: true,
      showCenteredFilename: false,
      cardBorder: { color: "rgba(255,255,255,0.25)", width: 1 },
      cardRadius: 8,
    },
  },
  // Resend: filename + language strip, hairline border, slightly translucent
  // card so the folded-paper pattern subtly shows through.
  {
    label: "Resend",
    from: "#B1B1B1",
    to: "#181818",
    logoUrl: "/brands/resend.svg",
    patternUrl: "/brands/resend-dark.png",
    brandId: "resend",
    frame: {
      showDots: false,
      showCenteredFilename: false,
      headerStrip: { showLanguage: true },
      cardBorder: { color: "rgba(255,255,255,0.13)", width: 1 },
      cardRadius: 8,
    },
  },
  // Stripe: chromeless rounded card with a thin border in the brand mid-blue.
  {
    label: "Stripe",
    from: "#0A2540",
    to: "#0A2540",
    logoUrl: "/brands/stripe.svg",
    brandId: "stripe",
    frame: {
      showDots: false,
      showCenteredFilename: false,
      cardBorder: { color: "#0F395E", width: 1 },
      cardRadius: 8,
      cardFill: "#0c2e4e",
    },
  },
];

export function toPngFilename(filename: string, suffix = "") {
  return `${filename.trim().replace(/\.[^.]+$/, "") || "supagist-snippet"}${suffix}.png`;
}

export function triggerDownload(url: string, filename: string, revoke: boolean) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  if (revoke) URL.revokeObjectURL(url);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not render preview image."));
    img.src = src;
  });
}

export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export type SvgToken = { text: string; color: string; bold: boolean; italic: boolean };

export function wrapTokenLine(tokens: SvgToken[], maxChars: number): SvgToken[][] {
  if (tokens.length === 0) return [[]];

  const lines: SvgToken[][] = [];
  let currentLine: SvgToken[] = [];
  let charsUsed = 0;

  for (const token of tokens) {
    let remaining = token.text;
    while (remaining.length > 0) {
      const space = maxChars - charsUsed;
      if (space <= 0) {
        lines.push(currentLine);
        currentLine = [];
        charsUsed = 0;
        continue;
      }
      if (remaining.length <= space) {
        currentLine.push({ ...token, text: remaining });
        charsUsed += remaining.length;
        remaining = "";
      } else {
        currentLine.push({ ...token, text: remaining.slice(0, space) });
        remaining = remaining.slice(space);
        lines.push(currentLine);
        currentLine = [];
        charsUsed = 0;
      }
    }
  }

  if (currentLine.length > 0 || lines.length === 0) {
    lines.push(currentLine);
  }

  return lines;
}

// height: when provided (e.g. OG image), clips to fit and keeps the passed width.
//         when undefined, both dimensions are computed from the code content.
export async function createHighlightedSvg(
  code: string,
  filename: string,
  theme: string,
  width: number,
  height: number | undefined,
  background?: ExportBackground | null,
  padding?: number,
  lineNumbers?: boolean,
  fontId?: string,
  languageOverride?: string | null,
  reactions?: Record<number, ExportReactionChip[]> | null,
  showReactions?: boolean,
  showFilename?: boolean,
  showFooter?: boolean,
  footerAuthorUsername?: string | null,
  footerAuthorAvatarUrl?: string | null,
): Promise<string> {
  const language = languageOverride || inferLanguage(filename, code);
  const [{ clientHighlighterPromise }, { loadTheme }] = await Promise.all([
    import("@/lib/lumis-client"),
    import("@/lib/theme-loader"),
  ]);
  const loaded = await loadTheme(theme);
  const themeData = loaded.data;
  const highlighter = await clientHighlighterPromise;
  await highlighter.loadLanguage(language);

  // When the snippet uses a brand theme but no explicit export background
  // was picked, default to the matching brand bg so the export shows the
  // brand framing without forcing the user to also click the bg swatch.
  // The user can still override by picking any other bg in the picker —
  // this only fills in the empty default.
  if (!background && loaded.brand) {
    const match = EXPORT_BRAND_BACKGROUNDS.find(
      (b) => b.label.toLowerCase() === loaded.brand!.brand,
    );
    if (match) background = match;
  }

  const editorBg: string =
    (themeData.highlights?.["normal"] as { bg?: string } | undefined)?.bg ??
    (themeData.appearance === "dark" ? "#282c34" : "#f8f8f8");
  const editorFg: string =
    (themeData.highlights?.["normal"] as { fg?: string } | undefined)?.fg ??
    (themeData.appearance === "dark" ? "#abb2bf" : "#383a42");

  const exportFont = EXPORT_FONTS.find((f) => f.id === fontId) ?? EXPORT_FONTS[0]!;
  const fontFamily = exportFont.file
    ? `"${exportFont.family}",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`
    : exportFont.family;
  let fontStyleBlock = "";
  if (exportFont.file) {
    const b64 = await loadFontBase64(exportFont.file);
    fontStyleBlock = `<style>@font-face{font-family:'${exportFont.family}';font-style:normal;font-weight:400;src:url('data:font/woff2;base64,${b64}') format('woff2')}</style>`;
  }

  const maxSourceLines =
    height !== undefined
      ? Math.max(
          1,
          Math.floor((height - EXPORT_WIN_PAD_TOP - EXPORT_WIN_PAD_BOTTOM) / EXPORT_LINE_HEIGHT),
        )
      : EXPORT_MAX_LINES;

  const rawLines = code.split("\n");
  const sourceLines = rawLines.slice(0, maxSourceLines);
  const sourceTruncated = rawLines.length > sourceLines.length;

  // Compute dynamic width from longest source line (only in auto-height mode).
  // Reactions are placed inline AFTER the code on each line — matching the
  // editor — so we no longer reserve a left column for them. We use the
  // ACTUAL chip width in pixels (not a char approximation) so the card
  // hugs the content tightly without leftover slack on the right.
  const hasReactions = showReactions && reactions && Object.keys(reactions).length > 0;
  const lineNumOffset = lineNumbers ? EXPORT_LINE_NUM_WIDTH : 0;
  // Chip width: padding + emoji + inner gap + avatar + padding = 39 px.
  // First chip starts 6 px after the code; subsequent chips have a 5 px gap.
  const CHIP_WIDTH = 39;
  const CHIP_FIRST_GAP = 6;
  const CHIP_INTER_GAP = 5;

  // Pre-fetch every unique avatar URL we'll need (chip reactor[0] + footer
  // author) and inline them as <pattern> defs. Patterns are referenced by id
  // in circle fills — one def per URL even if reused across many chips. URLs
  // that fail to load fall back to the initial-circle render.
  const avatarUrls = new Set<string>();
  if (hasReactions) {
    for (const chips of Object.values(reactions!)) {
      for (const chip of chips) {
        const url = chip.reactors[0]?.avatarUrl;
        if (url) avatarUrls.add(url);
      }
    }
  }
  if (showFooter && footerAuthorAvatarUrl) avatarUrls.add(footerAuthorAvatarUrl);

  const avatarDataUrls = new Map<string, string>();
  await Promise.all(
    Array.from(avatarUrls).map(async (u) => {
      const data = await loadAvatarDataUrl(u);
      if (data) avatarDataUrls.set(u, data);
    }),
  );

  // Stable id per URL so we can reference the same pattern from multiple
  // circles. Hashing the URL keeps ids deterministic + safe for SVG.
  const avatarPatternIds = new Map<string, string>();
  let avatarSeq = 0;
  for (const url of avatarDataUrls.keys()) {
    avatarSeq += 1;
    avatarPatternIds.set(url, `avatar-${avatarSeq}`);
  }
  // Pixel-accurate width of the longest source line including its chips.
  // Used to size the card so the content fits with consistent left/right
  // gutters — the older char-based estimate over-counted chip width by
  // ~8 px and produced a noticeable right-side slack.
  const longestLinePx = Math.min(
    Math.max(
      ...sourceLines.map((l, idx) => {
        const lineNum = idx + 1;
        const chipCount = hasReactions ? (reactions![lineNum]?.length ?? 0) : 0;
        const chipExtra =
          chipCount > 0
            ? CHIP_FIRST_GAP + CHIP_WIDTH * chipCount + CHIP_INTER_GAP * (chipCount - 1)
            : 0;
        return Math.ceil(l.length * EXPORT_CHAR_WIDTH) + chipExtra;
      }),
      0,
    ),
    Math.ceil(EXPORT_MAX_CHARS_PER_LINE * EXPORT_CHAR_WIDTH),
  );
  // The footer's rendered width can exceed the longest code line — if we
  // don't size the card for it the footer pushes against the right edge
  // and reads asymmetric vs the line-number gutter. Approx widths from
  // the renderer: 7 px per char + 18 px between segments, then 14 px
  // avatar + 6 px gap + author handle.
  const renderFooter = Boolean(showFooter);
  const author = footerAuthorUsername || "you";
  const footerWidthPx = renderFooter
    ? [languageDisplayName(language), theme, `${rawLines.length} lines`].reduce(
        (acc, s) => acc + s.length * 7 + 18,
        0,
      ) +
      `${codePointLength(code).toLocaleString()} / 8,000`.length * 7 +
      18 +
      14 +
      6 +
      `@${author}`.length * 7
    : 0;
  // Card width = max content width + symmetric WIN_PAD_X on each side.
  // Line numbers below are LEFT-aligned at the same WIN_PAD_X inset, so
  // the gutters are equal by construction — no centring or phantom-pad
  // gymnastics needed.
  const naturalWidth =
    Math.max(longestLinePx + lineNumOffset, footerWidthPx) + 2 * EXPORT_WIN_PAD_X;
  const computedWidth = Math.max(EXPORT_MIN_WIDTH, naturalWidth);
  const actualWidth = height !== undefined ? width : Math.min(width, computedWidth);

  // Collect tokens per source line
  const tokenLines: SvgToken[][] = sourceLines.map(() => []);
  let lineIdx = 0;
  highlighter.highlightIter(code, language, themeData, (text, _lang, _range, scope) => {
    const chunks = text.split("\n");
    chunks.forEach((chunk, ci) => {
      if (lineIdx < tokenLines.length && chunk) {
        const hl = scope
          ? (themeData.highlights?.[scope] as
              | { fg?: string; bold?: boolean; italic?: boolean }
              | undefined)
          : null;
        tokenLines[lineIdx].push({
          text: chunk,
          color: hl?.fg ?? editorFg,
          bold: !!hl?.bold,
          italic: !!hl?.italic,
        });
      }
      if (ci < chunks.length - 1) lineIdx += 1;
    });
  });

  // Wrap each source line and track the source line number for each visual line
  const allVisualLines: SvgToken[][] = [];
  const allVisualLineNums: (number | null)[] = [];
  tokenLines.forEach((line, srcIdx) => {
    const wrapped = wrapTokenLine(line, EXPORT_MAX_CHARS_PER_LINE);
    wrapped.forEach((vl, wi) => {
      allVisualLines.push(vl);
      allVisualLineNums.push(wi === 0 ? srcIdx + 1 : null);
    });
  });

  const maxVisualLines =
    height !== undefined
      ? Math.max(
          1,
          Math.floor((height - EXPORT_WIN_PAD_TOP - EXPORT_WIN_PAD_BOTTOM) / EXPORT_LINE_HEIGHT),
        )
      : EXPORT_MAX_LINES;

  const visualTruncated = allVisualLines.length > maxVisualLines;
  const displayLines = allVisualLines.slice(0, maxVisualLines);
  const displayLineNums = allVisualLineNums.slice(0, maxVisualLines);
  if (sourceTruncated || visualTruncated) {
    displayLines.push([{ text: "…", color: editorFg, bold: false, italic: false }]);
    displayLineNums.push(null);
  }

  // For each source line, find the index of its LAST visual row — chips need
  // to render after the actual end of the wrapped text, not at the (full)
  // first wrap row. `displayLineNums[i]` is the source line number on a row
  // that starts a source line and `null` on continuation rows; we walk the
  // array, tracking the active source, and remember its largest visual idx.
  const lastVisualIdxBySrcLine = new Map<number, number>();
  let activeSrcLine: number | null = null;
  displayLineNums.forEach((srcLn, i) => {
    if (srcLn !== null) activeSrcLine = srcLn;
    if (activeSrcLine !== null) lastVisualIdxBySrcLine.set(activeSrcLine, i);
  });

  // Footer strip mirrors the editor's status bar — language, line count,
  // char count, author chip — opted into via `showFooter`. ~36px tall plus
  // a 1px top divider. (renderFooter declared earlier for the width calc.)
  const FOOTER_HEIGHT = 36;
  const actualHeight =
    height ??
    EXPORT_WIN_PAD_TOP +
      Math.max(displayLines.length, 1) * EXPORT_LINE_HEIGHT +
      EXPORT_WIN_PAD_BOTTOM +
      (renderFooter ? FOOTER_HEIGHT : 0);

  const pad = background ? (padding ?? EXPORT_BG_PADDING) : 0;
  const totalWidth = actualWidth + pad * 2;
  const totalHeight = actualHeight + pad * 2;

  const dotsY = pad + Math.round(EXPORT_WIN_PAD_TOP / 2);
  const firstLineY =
    pad +
    EXPORT_WIN_PAD_TOP +
    Math.round((EXPORT_LINE_HEIGHT - EXPORT_FONT_SIZE) / 2 + EXPORT_FONT_SIZE * 0.8);
  // Line numbers are LEFT-aligned at the inner pad — same inset as the
  // right edge, so left/right visible gaps match. Code starts after the
  // line-number column + a small gap.
  const lineNumX = pad + EXPORT_WIN_PAD_X;
  const codeX = pad + EXPORT_WIN_PAD_X + lineNumOffset;

  const fontAttrs = `font-size="${EXPORT_FONT_SIZE}" font-family="${escapeXml(fontFamily)}" xml:space="preserve" text-rendering="geometricPrecision" letter-spacing="0"`;

  const lineMarkup = displayLines
    .map((tokens, i) => {
      const y = firstLineY + i * EXPORT_LINE_HEIGHT;

      let numMarkup = "";
      if (lineNumbers) {
        const num = displayLineNums[i];
        numMarkup =
          num !== null
            ? `<text x="${lineNumX}" y="${y}" ${fontAttrs} fill="${escapeXml(editorFg)}" fill-opacity="0.4">${num}</text>`
            : "";
      }
      let tspans: string;
      if (tokens.length === 0) {
        tspans = `<tspan fill="${escapeXml(editorFg)}"> </tspan>`;
      } else {
        tspans = tokens
          .map(({ text, color, bold, italic }) => {
            const fw = bold ? ' font-weight="bold"' : "";
            const fs = italic ? ' font-style="italic"' : "";
            return `<tspan fill="${escapeXml(color)}"${fw}${fs}>${escapeXml(text)}</tspan>`;
          })
          .join("");
      }
      const codeMarkup = `<text x="${codeX}" y="${y}" ${fontAttrs}>${tspans}</text>`;

      // Reactions sit AFTER the code as chip-style pills — rounded rect
      // background, emoji, and one avatar initial circle per chip — matching
      // the editor's inline reaction layout. Emitted on the LAST visual row
      // of each source line so a wrapped paragraph's chips end up after the
      // last word, not floating at the end of the (full) first wrap row.
      let reactionMarkup = "";
      const chipSrcLine = (() => {
        for (const [src, lastIdx] of lastVisualIdxBySrcLine) {
          if (lastIdx === i) return src;
        }
        return null;
      })();
      if (hasReactions && chipSrcLine !== null && reactions![chipSrcLine]?.length) {
        const lineChars = tokens.reduce((n, t) => n + t.text.length, 0);
        let chipX = codeX + Math.ceil(lineChars * EXPORT_CHAR_WIDTH) + 6;

        const chipH = 18;
        // Align the chip's vertical CENTRE with the code line's optical centre.
        // SVG `<text y>` is the baseline; the optical centre of a
        // line of text sits roughly fontSize*0.35 above the baseline.
        const lineCenterY = y - EXPORT_FONT_SIZE * 0.35;
        const chipY = lineCenterY - chipH / 2;
        const cy = chipY + chipH / 2;

        const chipR = chipH / 2;
        const chipPad = 5;
        const emojiW = 14;
        const avatarSize = 12;
        const innerGap = 3;
        const interChipGap = 5;
        reactionMarkup = reactions![chipSrcLine]
          .map((chip) => {
            const reactor = chip.reactors[0];
            const patternId = reactor?.avatarUrl ? avatarPatternIds.get(reactor.avatarUrl) : null;
            const chipW = chipPad + emojiW + innerGap + avatarSize + chipPad;
            const x = chipX;
            const emojiX = x + chipPad + emojiW / 2;
            const avatarCx = x + chipPad + emojiW + innerGap + avatarSize / 2;
            const avatarMarkup = patternId
              ? `<circle cx="${avatarCx}" cy="${cy}" r="${avatarSize / 2}" fill="url(#${patternId})"/>`
              : (() => {
                  const avatarColor = reactor ? nameToColor(reactor.username) : "#888";
                  const avatarLetter = reactor ? nameToInitials(reactor.username)[0] : "·";
                  return (
                    `<circle cx="${avatarCx}" cy="${cy}" r="${avatarSize / 2}" fill="${escapeXml(avatarColor)}"/>` +
                    `<text x="${avatarCx}" y="${cy}" font-size="8" font-family="${escapeXml(fontFamily)}" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${escapeXml(avatarLetter)}</text>`
                  );
                })();
            const markup =
              `<g>` +
              `<rect x="${x}" y="${chipY}" width="${chipW}" height="${chipH}" rx="${chipR}" ry="${chipR}" ` +
              `fill="${escapeXml(editorBg)}" stroke="${escapeXml(editorFg)}" stroke-opacity="0.22" stroke-width="1"/>` +
              `<text x="${emojiX}" y="${cy}" font-size="13" text-anchor="middle" dominant-baseline="central">${chip.emoji}</text>` +
              avatarMarkup +
              `</g>`;
            chipX += chipW + interChipGap;
            return markup;
          })
          .join("");
      }

      return numMarkup + codeMarkup + reactionMarkup;
    })
    .join("");

  // When a brand background ships a pattern PNG (Tailwind beams, Resend
  // folded-paper), embed it as a data URL so the canvas rasteriser doesn't
  // taint the canvas. The pattern paints the whole outer canvas. Brand bgs
  // can ALSO ship a `brandId` that drives extra inline SVG decoration
  // (Vercel registration brackets, Stripe diagonal stripes, etc.) — the
  // equivalent of ray.so's per-brand Frame components.
  const patternDataUrl = background?.patternUrl
    ? await loadImageDataUrl(background.patternUrl)
    : null;

  const brandDecoration = background?.brandId
    ? renderBrandDecoration({
        brandId: background.brandId,
        pad,
        actualWidth,
        actualHeight,
        totalWidth,
        totalHeight,
      })
    : "";

  // Frame config: per-brand chrome customisation. Defaults reproduce the
  // generic macOS-style window we render on non-brand exports.
  const frame = background?.frame;
  const cardRadius = frame?.cardRadius ?? EXPORT_WIN_RADIUS;
  const cardFill = frame?.cardFill ?? editorBg;
  const cardStrokeAttrs =
    frame?.cardBorder === undefined
      ? "" // generic macOS card has no stroke
      : frame.cardBorder === null
        ? ""
        : ` stroke="${escapeXml(frame.cardBorder.color)}" stroke-width="${frame.cardBorder.width}"`;
  const cardRect =
    `<rect x="${pad}" y="${pad}" width="${actualWidth}" height="${actualHeight}" ` +
    `rx="${cardRadius}" ry="${cardRadius}" fill="${escapeXml(cardFill)}"${cardStrokeAttrs}/>`;

  let bgSection: string;
  if (background && patternDataUrl) {
    bgSection =
      `<image href="${escapeXml(patternDataUrl)}" xlink:href="${escapeXml(patternDataUrl)}" ` +
      `x="0" y="0" width="${totalWidth}" height="${totalHeight}" preserveAspectRatio="xMidYMid slice"/>` +
      brandDecoration +
      cardRect;
  } else if (background) {
    bgSection =
      `<defs>` +
      `<linearGradient id="outerBg" x1="0%" y1="0%" x2="100%" y2="100%">` +
      `<stop offset="0%" stop-color="${escapeXml(background.from)}"/>` +
      `<stop offset="100%" stop-color="${escapeXml(background.to)}"/>` +
      `</linearGradient>` +
      `</defs>` +
      `<rect width="${totalWidth}" height="${totalHeight}" fill="url(#outerBg)"/>` +
      brandDecoration +
      cardRect;
  } else {
    bgSection = `<rect width="${totalWidth}" height="${totalHeight}" fill="${escapeXml(editorBg)}"/>`;
  }

  // Centred filename — present unless the frame opts out. Brand frames that
  // use a left-aligned header strip render their own filename below.
  const useCenteredFilename = showFilename && filename && (frame?.showCenteredFilename ?? true);
  const filenameMarkup = useCenteredFilename
    ? `<text x="${pad + Math.round(actualWidth / 2)}" y="${dotsY}" font-size="12" font-family="${escapeXml(fontFamily)}" text-anchor="middle" dominant-baseline="middle" fill="${escapeXml(editorFg)}" fill-opacity="0.5">${escapeXml(filename)}</text>`
    : "";

  // Brand-style header strip — left-aligned filename + optional language
  // label on the right, with a divider underneath. Used by Supabase + Resend.
  // Gated on showFilename so the toggle hides the strip on branded themes
  // the same way it hides the centred filename on the default frame.
  let headerStripMarkup = "";
  if (frame?.headerStrip && filename && showFilename) {
    const stripY = pad;
    const stripHeight = 36;
    const stripBottom = stripY + stripHeight;
    const leftX = pad + EXPORT_WIN_PAD_X;
    const rightX = pad + actualWidth - EXPORT_WIN_PAD_X;
    const labelY = stripY + stripHeight / 2;
    const fileText =
      `<text x="${leftX}" y="${labelY}" font-size="13" font-family="${escapeXml(fontFamily)}" ` +
      `dominant-baseline="central" fill="${escapeXml(editorFg)}" fill-opacity="0.85">${escapeXml(filename)}</text>`;
    const langText =
      frame.headerStrip.showLanguage && language
        ? `<text x="${rightX}" y="${labelY}" font-size="12" font-family="${escapeXml(fontFamily)}" ` +
          `text-anchor="end" dominant-baseline="central" fill="${escapeXml(editorFg)}" fill-opacity="0.55">${escapeXml(languageDisplayName(language))}</text>`
        : "";
    const divider =
      `<line x1="${pad}" y1="${stripBottom}" x2="${pad + actualWidth}" y2="${stripBottom}" ` +
      `stroke="${escapeXml(editorFg)}" stroke-opacity="0.12" stroke-width="1"/>`;
    headerStripMarkup = fileText + langText + divider;
  }

  // Footer: lang · theme · line count · char count · author chip. Mirrors the
  // editor's status bar minus viewer count (which has no meaning offline).
  // Author is shown unconditionally when the footer is on — the snippet
  // page guarantees an author for every saved snippet, and the home composer
  // falls back to the viewer's display name.
  let footerMarkup = "";
  if (renderFooter) {
    const footerY = pad + actualHeight - FOOTER_HEIGHT;
    const footerCenterY = footerY + FOOTER_HEIGHT / 2;
    const footerLeftX = pad + EXPORT_WIN_PAD_X;
    const dimAttrs = `font-size="12" font-family="${escapeXml(fontFamily)}" fill="${escapeXml(editorFg)}" fill-opacity="0.55" dominant-baseline="central"`;

    const charSpacing = 18;
    const segments: string[] = [
      languageDisplayName(language),
      theme,
      `${rawLines.length} lines`,
      `${codePointLength(code).toLocaleString()} / 8,000`,
    ];

    let cursor = footerLeftX;
    const items: string[] = [];

    for (const seg of segments) {
      items.push(`<text x="${cursor}" y="${footerCenterY}" ${dimAttrs}>${escapeXml(seg)}</text>`);
      cursor += seg.length * 7 + charSpacing;
    }

    // `author` already declared up top for the footerWidthPx estimate.
    const avatarSize = 14;
    const avatarCx = cursor + avatarSize / 2;
    const footerPatternId = footerAuthorAvatarUrl
      ? avatarPatternIds.get(footerAuthorAvatarUrl)
      : null;
    if (footerPatternId) {
      items.push(
        `<circle cx="${avatarCx}" cy="${footerCenterY}" r="${avatarSize / 2}" fill="url(#${footerPatternId})"/>`,
      );
    } else {
      const avatarColor = nameToColor(author);
      const avatarLetter = nameToInitials(author)[0] ?? "?";
      items.push(
        `<circle cx="${avatarCx}" cy="${footerCenterY}" r="${avatarSize / 2}" fill="${escapeXml(avatarColor)}"/>` +
          `<text x="${avatarCx}" y="${footerCenterY}" font-size="9" font-family="${escapeXml(fontFamily)}" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${escapeXml(avatarLetter)}</text>`,
      );
    }
    cursor += avatarSize + 6;
    const handle = `@${author}`;
    items.push(`<text x="${cursor}" y="${footerCenterY}" ${dimAttrs}>${escapeXml(handle)}</text>`);

    footerMarkup =
      `<rect x="${pad}" y="${footerY}" width="${actualWidth}" height="1" fill="${escapeXml(editorFg)}" fill-opacity="0.12"/>` +
      items.join("");
  }

  // One <pattern> per unique avatar URL — circles reference these by id.
  // Both patternUnits AND patternContentUnits must be objectBoundingBox so the
  // image's width=1/height=1 means "full pattern tile" rather than 1×1 user-
  // space pixel (the default patternContentUnits is userSpaceOnUse, which
  // would render the avatar as a 1px speck). xlink:href is included alongside
  // href so the image resolves under the SVG-1.1 rasteriser used when the
  // canvas renders the SVG to PNG.
  let avatarPatternsBlock = "";
  if (avatarPatternIds.size > 0) {
    const patterns = Array.from(avatarPatternIds.entries())
      .map(([url, id]) => {
        const data = avatarDataUrls.get(url);
        if (!data) return "";
        const safeData = escapeXml(data);
        return (
          `<pattern id="${id}" patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width="1" height="1">` +
          `<image href="${safeData}" xlink:href="${safeData}" width="1" height="1" preserveAspectRatio="xMidYMid slice"/>` +
          `</pattern>`
        );
      })
      .join("");
    avatarPatternsBlock = `<defs>${patterns}</defs>`;
  }

  // Traffic-light dots: position by LEFT EDGE so they share the same inner
  // padding as the code, footer text, and right-side gutter. SVG <circle> is
  // anchored by its center, so we shift cx by the dot radius.
  const DOT_R = 7;
  const firstDotCx = pad + EXPORT_WIN_PAD_X + DOT_R;
  const showDots = frame?.showDots ?? true;
  const dotsMarkup = showDots
    ? `<circle cx="${firstDotCx}" cy="${dotsY}" r="${DOT_R}" fill="#ff5f57"/>` +
      `<circle cx="${firstDotCx + 22}" cy="${dotsY}" r="${DOT_R}" fill="#febc2e"/>` +
      `<circle cx="${firstDotCx + 44}" cy="${dotsY}" r="${DOT_R}" fill="#28c840"/>`
    : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">` +
    fontStyleBlock +
    avatarPatternsBlock +
    bgSection +
    dotsMarkup +
    filenameMarkup +
    headerStripMarkup +
    lineMarkup +
    footerMarkup +
    `</svg>`
  );
}

export async function renderToFile(
  code: string,
  filename: string,
  theme: string,
  width: number,
  height: number | undefined,
  outFilename: string,
  pixelRatio?: number,
  background?: ExportBackground | null,
  padding?: number,
  lineNumbers?: boolean,
  fontId?: string,
  languageOverride?: string | null,
  reactions?: Record<number, ExportReactionChip[]> | null,
  showReactions?: boolean,
  showFilename?: boolean,
  showFooter?: boolean,
  footerAuthorUsername?: string | null,
  footerAuthorAvatarUrl?: string | null,
): Promise<File> {
  const svg = await createHighlightedSvg(
    code,
    filename,
    theme,
    width,
    height,
    background,
    padding,
    lineNumbers,
    fontId,
    languageOverride,
    reactions,
    showReactions,
    showFilename,
    showFooter,
    footerAuthorUsername,
    footerAuthorAvatarUrl,
  );
  const svgW = parseInt(/\bwidth="(\d+)"/.exec(svg)?.[1] ?? String(width));
  const svgH = parseInt(/\bheight="(\d+)"/.exec(svg)?.[1] ?? "400");
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    const scale = pixelRatio ?? Math.max(window.devicePixelRatio, 3);
    canvas.width = Math.ceil(svgW * scale);
    canvas.height = Math.ceil(svgH * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create image canvas.");
    ctx.scale(scale, scale);
    ctx.drawImage(image, 0, 0, svgW, svgH);
    const pngBlob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!pngBlob) throw new Error("Could not create PNG image.");
    return new File([pngBlob], outFilename, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ── Brand decorations ────────────────────────────────────────────────────────
//
// SVG equivalents of ray.so's per-brand Frame components for the brands that
// don't ship a raster pattern. Each function returns markup that paints
// alongside the gradient/pattern fill but BEHIND the editor card rect, so
// the card cleanly sits on top.

type BrandDecorationArgs = {
  brandId: NonNullable<ExportBackground["brandId"]>;
  /** Padding between the canvas edge and the editor card. */
  pad: number;
  /** Editor card width. */
  actualWidth: number;
  /** Editor card height. */
  actualHeight: number;
  /** Outer canvas size (after padding). */
  totalWidth: number;
  totalHeight: number;
};

function renderBrandDecoration(args: BrandDecorationArgs): string {
  switch (args.brandId) {
    case "vercel":
      return renderVercelDecoration(args);
    case "stripe":
      return renderStripeDecoration(args);
    case "tailwind":
      return renderTailwindDecoration(args);
    default:
      return "";
  }
}

function renderVercelDecoration({
  pad,
  actualWidth,
  actualHeight,
  totalWidth,
  totalHeight,
}: BrandDecorationArgs): string {
  // Thin gridlines extending beyond the editor card on all four sides, plus
  // L-shaped registration brackets at the top-left and bottom-right corners.
  // Mirrors VercelFrame.module.css's .gridlinesHorizontal / .gridlinesVertical
  // / .bracketLeft / .bracketRight.
  const lineColor = "#1a1a1a";
  const bracketColor = "#515356";
  const bracketLen = 25;
  const top = pad;
  const left = pad;
  const right = pad + actualWidth;
  const bottom = pad + actualHeight;
  return (
    // Top horizontal gridline (extends left + right of card)
    `<line x1="0" y1="${top}" x2="${totalWidth}" y2="${top}" stroke="${lineColor}" stroke-width="1"/>` +
    // Bottom horizontal
    `<line x1="0" y1="${bottom}" x2="${totalWidth}" y2="${bottom}" stroke="${lineColor}" stroke-width="1"/>` +
    // Left vertical
    `<line x1="${left}" y1="0" x2="${left}" y2="${totalHeight}" stroke="${lineColor}" stroke-width="1"/>` +
    // Right vertical
    `<line x1="${right}" y1="0" x2="${right}" y2="${totalHeight}" stroke="${lineColor}" stroke-width="1"/>` +
    // Top-left bracket
    `<line x1="${left - 12}" y1="${top}" x2="${left - 12 + bracketLen}" y2="${top}" stroke="${bracketColor}" stroke-width="1"/>` +
    `<line x1="${left}" y1="${top - 12}" x2="${left}" y2="${top - 12 + bracketLen}" stroke="${bracketColor}" stroke-width="1"/>` +
    // Bottom-right bracket
    `<line x1="${right - bracketLen + 12}" y1="${bottom}" x2="${right + 12}" y2="${bottom}" stroke="${bracketColor}" stroke-width="1"/>` +
    `<line x1="${right}" y1="${bottom - bracketLen + 12}" x2="${right}" y2="${bottom + 12}" stroke="${bracketColor}" stroke-width="1"/>`
  );
}

function renderTailwindDecoration({ pad, actualWidth, actualHeight }: BrandDecorationArgs): string {
  // Thin white gridlines flanking the editor card. Roughly mirrors
  // TailwindFrame's gridlinesHorizontal/Vertical, faded near the ends so
  // the lines feel like guides rather than hard borders. We approximate the
  // mask by drawing 4 short segments that don't reach the card edges.
  const lineColor = "rgba(255,255,255,0.10)";
  const offsetX = 64;
  const offsetY = 24;
  return (
    // Horizontal lines above + below the card
    `<line x1="${pad - offsetX}" y1="${pad - offsetY}" x2="${pad + actualWidth + offsetX}" y2="${pad - offsetY}" stroke="${lineColor}" stroke-width="1"/>` +
    `<line x1="${pad - offsetX}" y1="${pad + actualHeight + offsetY}" x2="${pad + actualWidth + offsetX}" y2="${pad + actualHeight + offsetY}" stroke="${lineColor}" stroke-width="1"/>` +
    // Vertical lines left + right of the card
    `<line x1="${pad - offsetX}" y1="${pad - offsetY}" x2="${pad - offsetX}" y2="${pad + actualHeight + offsetY}" stroke="${lineColor}" stroke-width="1"/>` +
    `<line x1="${pad + actualWidth + offsetX}" y1="${pad - offsetY}" x2="${pad + actualWidth + offsetX}" y2="${pad + actualHeight + offsetY}" stroke="${lineColor}" stroke-width="1"/>`
  );
}

function renderStripeDecoration({
  pad,
  actualWidth,
  actualHeight: _actualHeight,
  totalWidth,
  totalHeight,
}: BrandDecorationArgs): string {
  // Skewed white wash starting at 60% canvas height, 6deg negative rotation
  // pivot at the right edge. On top, a 3-rectangle "set" of cyan / blue /
  // purple offset slightly to read as overlapping bars at the bottom-right.
  // Same colours and proportions as StripeFrame.module.css, scaled to our
  // canvas instead of relative to the editor card.
  const stripeY = totalHeight * 0.6;
  const stripeColor = "hsla(213.69, 52%, 97.828%, 1)";
  const dashColor = "rgba(66, 71, 112, 0.18)";

  // Top-of-stripe gridlines (5 vertical dashes spanning the card width)
  const lineCount = 5;
  const lines = Array.from({ length: lineCount }, (_, i) => {
    const x = pad + (actualWidth * i) / (lineCount - 1);
    return `<line x1="${x}" y1="${stripeY}" x2="${x}" y2="${totalHeight}" stroke="${dashColor}" stroke-dasharray="4,4" stroke-width="1"/>`;
  }).join("");

  // 3-layer set near bottom-right inside the white stripe
  const setW = Math.min(500, actualWidth * 0.55);
  const setX = pad + actualWidth - setW + 50;
  const setY = totalHeight - 150;
  const layer1 = `<rect x="${setX}" y="${setY}" width="${setW}" height="50" fill="rgb(17, 239, 227)"/>`;
  const layer2 = `<rect x="${setX + 50}" y="${setY + 50}" width="${setW}" height="32" fill="rgb(153, 102, 255)"/>`;
  const intersection = `<rect x="${setX + 50}" y="${setY + 32}" width="${setW}" height="18" fill="hsla(221.1, 99.822%, 44.876%, 1)"/>`;

  return (
    // White stripe (skewed band across the lower portion)
    `<g transform="translate(${totalWidth} ${stripeY}) rotate(-6) translate(-${totalWidth} 0)">` +
    `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight - stripeY + 200}" fill="${stripeColor}"/>` +
    lines +
    layer1 +
    intersection +
    layer2 +
    `</g>`
  );
}
