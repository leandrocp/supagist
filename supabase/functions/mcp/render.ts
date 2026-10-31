import {
  createHighlightedSvg,
  inferLanguage,
  EXPORT_FONTS,
  EXPORT_FONT_SIZE_VALUES,
  EXPORT_OUTER_PADDING_VALUES,
  EXPORT_INNER_PADDING_VALUES,
  EXPORT_CORNER_RADIUS_VALUES,
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
  windowDecorations: ["macos", "macos-subtle", "windows", "minimal", "none", "lumis", "markdown"],
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

/** Timings are elapsed wall time, never CPU time. No user image URLs. */
export async function renderSnippet(rawInput: RenderInput): Promise<RenderResult> {
  const start = performance.now();
  const input = renderInput.parse(rawInput);
  const fixture = input.fixture;
  const brand = BRAND_PRESETS.find(
    (preset) => preset.id === (input.brand ?? (fixture !== "plain" ? "vercel" : undefined)),
  );
  const settings = brand?.settings;
  // Only some presets set these, so the type inferred from the generated JS lacks them.
  const presetAspectRatio =
    settings && "aspectRatio" in settings ? (settings.aspectRatio as "16:9" | null) : null;
  const presetLigatures =
    settings && "ligatures" in settings ? (settings.ligatures as boolean) : true;
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
  let svg = await createHighlightedSvg(
    input.code,
    input.filename,
    theme,
    1200,
    undefined,
    background,
    input.outerPadding ?? settings?.outerPadding,
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
    input.fontSize ?? 14,
    input.wordDiff ?? false,
    input.aspectRatio ?? presetAspectRatio,
    input.ligatures ?? presetLigatures,
  );
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
  const dimensions = /<svg\b[^>]* width="([\d.]+)" height="([\d.]+)"/.exec(svg);
  if (!dimensions) throw new Error("App renderer did not emit SVG dimensions");
  const logicalWidth = Number(dimensions[1]);
  const logicalHeight = Number(dimensions[2]);
  const width = Math.round(logicalWidth * input.pixelRatio);
  const height = Math.round(logicalHeight * input.pixelRatio);
  const svgEnd = performance.now();
  // Scale the viewport, not the viewBox; rasterization belongs to the client.
  svg = svg.replace(
    `width="${logicalWidth}" height="${logicalHeight}"`,
    `width="${width}" height="${height}"`,
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
