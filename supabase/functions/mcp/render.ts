import {
  createHighlightedSvg,
  inferLanguage,
  EXPORT_FONTS,
  EXPORT_FONT_SIZE_VALUES,
  EXPORT_OUTER_PADDING_VALUES,
  EXPORT_INNER_PADDING_VALUES,
  EXPORT_CORNER_RADIUS_VALUES,
  EXPORT_OUTER_PADDING,
  wrapTokenLine,
  wrapCommentText,
} from "./spike/generated/export-utils.js";
import {
  BRAND_PRESETS,
  DEFAULT_HEADER_SETTINGS,
  DEFAULT_FOOTER_SETTINGS,
} from "./spike/generated/brand-presets.js";
import { renderInput, backgrounds, type RenderInput } from "./input.ts";
import { loadFontBase64 } from "./spike/assets.ts";
export type { RenderInput } from "./input.ts";
import {
  clientHighlighterPromise,
  parserEventCursor,
  parserEventsSince,
  type ParserEvent,
} from "./spike/lumis-client.ts";
import { loadTheme } from "./spike/theme-loader.ts";
import packages from "./spike/generated/parser-packages.json" with { type: "json" };
import { themes } from "./spike/generated/themes.js";
import { BRAND_THEMES } from "./spike/generated/brand-themes.js";

export const supportedLanguages: string[] = [
  "plaintext",
  ...new Set(Object.values(packages).flatMap((metadata) => Object.keys(metadata.languages))),
].sort();
export const supportedThemes: string[] = [
  ...Object.keys(themes),
  ...BRAND_THEMES.map((theme) => theme.id),
].sort();

export const appearanceOptions = {
  brands: BRAND_PRESETS.map(({ id, name, settings, background }) => ({
    id,
    name,
    ...settings,
    background: background.label,
  })),
  backgrounds: backgrounds.map(({ label }) => label),
  fonts: EXPORT_FONTS.map(({ id, label }) => ({ id, label })),
  fontSizes: EXPORT_FONT_SIZE_VALUES,
  outerPadding: EXPORT_OUTER_PADDING_VALUES,
  innerPadding: EXPORT_INNER_PADDING_VALUES,
  cornerRadius: EXPORT_CORNER_RADIUS_VALUES,
  windowDecorations: ["macos", "macos-subtle", "windows", "minimal", "none"],
  header: DEFAULT_HEADER_SETTINGS,
  footer: DEFAULT_FOOTER_SETTINGS,
  alignments: ["left", "center", "right"],
  wordDiff: {
    default: false,
    language: "diff",
    description:
      "Highlight only the changed words inside paired -/+ lines, like Lumis --word-diff.",
  },
  aspectRatios: ["16:9"],
  ligatures: [true, false],
  limits: { codePoints: 8000, visualRows: 30, wrapColumns: 110 },
  notes:
    "brand selects a complete preset; explicit fields override it. background is only a canvas. system font uses portable JetBrains Mono. PNG conversion and 2x/4x/6x scale are local, not MCP. Reactions/comments are supplied render data, not published collaboration. aspectRatio 16:9 outputs a 1600x900 canvas with the card centered; outerPadding is the minimum margin. ligatures false splits operator ligatures such as |> into separate characters.",
};
export type RenderResult = {
  svg: string;
  bytes: Uint8Array;
  contentType: "image/svg+xml";
  width: number;
  height: number;
  logicalWidth: number;
  logicalHeight: number;
  timings: {
    preloadWallMs: number;
    svgWallMs: number;
    totalWallMs: number;
  };
  parserEvents: ParserEvent[];
};

// The X/social card size Leandro posts at; the SVG scales the 16:9 frame to it.
const CANVAS_16_9 = { width: 1600, height: 900 };
// Advance widths (em) from each bundled TTF's hmtx table. Every glyph in these
// monospace fonts shares one advance, so column × advance is the natural pen position.
const FONT_ADVANCE_EM: Record<string, number> = {
  jetbrains: 600 / 1000,
  fira: 1200 / 2000,
  geist: 600 / 1000,
  hack: 1233 / 2048,
};
const ASCII_PUNCTUATION = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
const XML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
};

function svgSize(svg: string): [number, number] {
  const dimensions = /<svg\b[^>]* width="([\d.]+)" height="([\d.]+)"/.exec(svg);
  if (!dimensions) throw new Error("App renderer did not emit SVG dimensions");
  return [Number(dimensions[1]), Number(dimensions[2])];
}

/**
 * Font ligatures (JetBrains Mono's `|>` → ▷, Fira's `->` → →) are contextual
 * substitutions that renderers apply within one SVG text chunk. resvg ignores
 * font-variant-ligatures, font-feature-settings and zero-width joiners, but an
 * absolute x always starts a new chunk. Give each punctuation character that
 * follows another punctuation character its own chunk at its monospace column.
 */
function separateLigatures(svg: string, fontSize: number, advanceEm: number): string {
  const advance = fontSize * advanceEm;
  return svg.replace(
    /<text x="([\d.]+)"([^>]*xml:space="preserve"[^>]*)>(.*?)<\/text>/g,
    (_text, x: string, attrs: string, body: string) => {
      let column = 0;
      let previous = "";
      const spans = body.replace(
        /<tspan([^>]*)>([^<]*)<\/tspan>/g,
        (_span, spanAttrs: string, content: string) => {
          const pieces: { text: string; position: string }[] = [];
          for (const [unit] of content.matchAll(/&[a-z]+;|[^&]/gu)) {
            const char = XML_ENTITIES[unit] ?? unit;
            const split =
              previous !== "" &&
              ASCII_PUNCTUATION.includes(previous) &&
              ASCII_PUNCTUATION.includes(char);
            if (split || pieces.length === 0) {
              const left = Number((Number(x) + column * advance).toFixed(3));
              pieces.push({ text: "", position: split ? ` x="${left}"` : "" });
            }
            pieces[pieces.length - 1].text += unit;
            previous = char;
            column++;
          }
          if (pieces.length === 0) return _span;
          return pieces
            .map(({ text, position }) => `<tspan${spanAttrs}${position}>${text}</tspan>`)
            .join("");
        },
      );
      return `<text x="${x}"${attrs}>${spans}</text>`;
    },
  );
}

/** Timings are elapsed wall time, never CPU time. No user image URLs. */
export async function renderSnippet(rawInput: RenderInput): Promise<RenderResult> {
  const start = performance.now();
  const input = renderInput.parse(rawInput);
  const fixture = input.fixture;
  const brand = BRAND_PRESETS.find(
    (preset) => preset.id === (input.brand ?? (fixture !== "plain" ? "vercel" : undefined)),
  );
  const settings = brand?.settings;
  const theme = input.theme ?? settings?.theme ?? "github_dark";
  const language = input.language ?? inferLanguage(input.filename, input.code);
  if (!supportedLanguages.includes(language)) throw new Error(`Unsupported language: ${language}`);
  if (!supportedThemes.includes(theme)) throw new Error(`Unsupported theme: ${theme}`);
  const showComments = input.showComments ?? Boolean(input.comments);
  const visualRows = input.code
    .split("\n")
    .reduce(
      (count, text, index) =>
        count +
        wrapTokenLine([{ text }], 110).length +
        (showComments && input.comments?.[index + 1]
          ? wrapCommentText(input.comments[index + 1].body).length
          : 0),
      0,
    );
  if (visualRows > 30)
    throw new Error(
      "Export exceeds 30 visual rows after wrapping/comments; choose a shorter excerpt or split the image",
    );
  const cursor = parserEventCursor();
  const highlighter = await clientHighlighterPromise;
  // Never rely on the app's plaintext fallback. This rejects missing, corrupt,
  // unavailable and unknown parsers BEFORE invoking the copied app renderer.
  await Promise.all([highlighter.loadLanguage(language), loadTheme(theme)]);
  const preloadEnd = performance.now();
  console.log(
    JSON.stringify({
      event: "parser-preload-complete",
      language,
      preloadWallMs: preloadEnd - start,
    }),
  );

  const backgroundLabel =
    input.background === undefined ? brand?.background.label : input.background;
  const background = backgrounds.find((preset) => preset.label === backgroundLabel);
  const fontId = input.fontId ?? settings?.fontId ?? "jetbrains";
  const header = { ...DEFAULT_HEADER_SETTINGS, ...settings?.header, ...input.header };
  const footer = {
    ...DEFAULT_FOOTER_SETTINGS,
    ...(fixture === "avatars" ? { enabled: true } : settings?.footer),
    ...input.footer,
  };
  const avatars = fixture === "avatars";
  const reactions = avatars
    ? {
        3: [
          {
            emoji: "+1",
            reactors: [
              { username: "Ada", avatarUrl: "m0:avatar-1" },
              { username: "Grace", avatarUrl: "m0:avatar-2" },
            ],
          },
        ],
        15: [{ emoji: "+1", reactors: [{ username: "Grace", avatarUrl: "m0:avatar-2" }] }],
        30: [{ emoji: "+1", reactors: [{ username: "Ada", avatarUrl: "m0:avatar-1" }] }],
      }
    : undefined;
  const fontSize = input.fontSize ?? 14;
  const draw = (outerPadding: number) =>
    createHighlightedSvg(
      input.code,
      input.filename,
      theme,
      1200,
      undefined,
      background,
      outerPadding,
      input.lineNumbers ?? settings?.lineNumbers ?? true,
      fontId === "system" ? "jetbrains" : fontId,
      language,
      input.reactions ?? reactions,
      input.showReactions ?? (Boolean(input.reactions) || avatars),
      true,
      avatars,
      input.author ?? (avatars ? "Ada" : undefined),
      avatars ? "m0:avatar-1" : undefined,
      input.comments,
      showComments,
      undefined,
      input.windowDecoration ?? settings?.windowDecoration ?? "macos",
      input.cornerRadius ?? settings?.cornerRadius,
      input.innerPadding ?? settings?.innerPadding ?? 16,
      header,
      footer,
      fontSize,
      input.wordDiff ?? false,
    );
  const margin = background
    ? (input.outerPadding ?? settings?.outerPadding ?? EXPORT_OUTER_PADDING)
    : 0;
  let svg = await draw(margin);
  let frame: { left: number; top: number; width: number; height: number } | undefined;
  if (input.aspectRatio === "16:9") {
    // The app pads the card equally on all sides. Pad by the larger 16:9 slack so
    // the background covers the frame, then crop the other axis with the viewBox.
    const [drawnWidth, drawnHeight] = svgSize(svg);
    const cardWidth = drawnWidth - 2 * margin;
    const cardHeight = drawnHeight - 2 * margin;
    const width = Math.max(drawnWidth, (drawnHeight * 16) / 9);
    const height = (width * 9) / 16;
    const padding = background
      ? Math.ceil(Math.max(width - cardWidth, height - cardHeight) / 2)
      : 0;
    if (padding !== margin) svg = await draw(padding);
    frame = {
      left: padding - (width - cardWidth) / 2,
      top: padding - (height - cardHeight) / 2,
      width,
      height,
    };
    // Brand scenes outline the whole canvas; move that rim to the cropped frame.
    svg = svg.replace(
      /data-scene-layer="canvas-rim" x="0\.5" y="0\.5" width="[\d.]+" height="[\d.]+"/,
      `data-scene-layer="canvas-rim" x="${frame.left + 0.5}" y="${frame.top + 0.5}" width="${width - 1}" height="${height - 1}"`,
    );
  }
  // App font subsets rely on browser fallback for the comment arrow. Supply a
  // portable fallback too, so native conversion never turns it into a missing glyph.
  if (showComments && input.comments && fontId !== "hack") {
    const fallback = await loadFontBase64("/fonts/hack.woff2");
    svg = svg.replace(
      "</style>",
      `@font-face{font-family:'Hack';font-style:normal;font-weight:400;src:url('data:font/ttf;base64,${fallback}') format('truetype')}</style>`,
    );
    const family = EXPORT_FONTS.find(
      (font) => font.id === (fontId === "system" ? "jetbrains" : fontId),
    )!.family;
    svg = svg.replaceAll(
      `font-family="&quot;${family}&quot;,ui-monospace`,
      `font-family="&quot;${family}&quot;,&quot;Hack&quot;,ui-monospace`,
    );
  }
  if (input.ligatures === false) {
    svg = separateLigatures(
      svg,
      fontSize,
      FONT_ADVANCE_EM[fontId === "system" ? "jetbrains" : fontId],
    );
  }
  const [drawnWidth, drawnHeight] = svgSize(svg);
  const logicalWidth = frame ? CANVAS_16_9.width : drawnWidth;
  const logicalHeight = frame ? CANVAS_16_9.height : drawnHeight;
  const width = Math.round(logicalWidth * input.pixelRatio);
  const height = Math.round(logicalHeight * input.pixelRatio);
  const svgEnd = performance.now();
  // Scale the viewport, not the viewBox; rasterization belongs to the client.
  const viewBox = frame
    ? `${frame.left} ${frame.top} ${frame.width} ${frame.height}`
    : `0 0 ${drawnWidth} ${drawnHeight}`;
  svg = svg.replace(
    `width="${drawnWidth}" height="${drawnHeight}" viewBox="0 0 ${drawnWidth} ${drawnHeight}"`,
    `width="${width}" height="${height}" viewBox="${viewBox}"`,
  );
  const bytes = new TextEncoder().encode(svg);
  const timings = {
    preloadWallMs: preloadEnd - start,
    svgWallMs: svgEnd - preloadEnd,
    totalWallMs: performance.now() - start,
  };
  console.log(
    JSON.stringify({
      event: "render-complete",
      format: input.format,
      fixture,
      pixelRatio: input.pixelRatio,
      width,
      height,
      ...timings,
    }),
  );
  return {
    svg,
    bytes,
    contentType: "image/svg+xml",
    width,
    height,
    logicalWidth,
    logicalHeight,
    timings,
    parserEvents: parserEventsSince(cursor),
  };
}
