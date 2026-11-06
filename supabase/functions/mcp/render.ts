import {
  renderExport,
  EXPORT_FONTS,
  EXPORT_FONT_SIZE,
  EXPORT_FONT_SIZE_VALUES,
  EXPORT_INNER_PADDING,
  EXPORT_OUTER_PADDING_VALUES,
  EXPORT_INNER_PADDING_VALUES,
  EXPORT_CORNER_RADIUS_VALUES,
  EXPORT_MAX_CHARS_PER_LINE,
  EXPORT_MAX_LINES,
  EXPORT_WIDTH,
  EXPORT_WINDOW_DECORATIONS,
  wrapTokenLine,
  wrapCommentText,
} from "./spike/generated/export-utils.js";
import { inferLanguage } from "./spike/generated/snippet-utils.js";
import {
  BRAND_PRESETS,
  DEFAULT_HEADER_SETTINGS,
  DEFAULT_FOOTER_SETTINGS,
} from "./spike/generated/brand-presets.js";
import { renderInput, backgrounds, type RenderInput } from "./input.ts";
import { loadFontBase64, loadImageDataUrl } from "./spike/assets.ts";
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
import { closeMatches } from "./themes.ts";

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
  windowDecorations: EXPORT_WINDOW_DECORATIONS,
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
  limits: {
    codePoints: 8000,
    visualRows: EXPORT_MAX_LINES,
    wrapColumns: EXPORT_MAX_CHARS_PER_LINE,
  },
  notes:
    "brand selects a complete preset; explicit fields override it. background is only a canvas. system font uses portable JetBrains Mono. Reactions/comments are supplied render data, not published collaboration. aspectRatio 16:9 outputs a 1600x900 canvas with the card centered; outerPadding is the minimum margin. ligatures false splits operator ligatures such as |> into separate characters.",
};
/** Input the renderer cannot draw, as opposed to an internal failure. */
export class RenderInputError extends Error {}

function unsupported(kind: "language" | "theme", value: string, supported: string[]) {
  const matches = closeMatches(value, supported);
  return matches.length
    ? `Unsupported ${kind}: ${value}. Close matches: ${matches.join(", ")}`
    : `Unsupported ${kind}: ${value}`;
}

export type RenderResult = {
  svg: string;
  bytes: Uint8Array;
  contentType: "image/svg+xml";
  width: number;
  height: number;
  /** Resolved appearance, after brand defaults and auto-detection. */
  theme: string;
  language: string;
  fontId: string;
  /** The rest of the resolved appearance, as `snippets.appearance` stores it
   *  so the saved view shows a published snippet as rendered. */
  appearance: {
    background: string | null;
    outerPadding?: number;
    innerPadding: number;
    cornerRadius?: number;
    lineNumbers: boolean;
    showReactions: false;
    header: typeof DEFAULT_HEADER_SETTINGS;
    footer: typeof DEFAULT_FOOTER_SETTINGS;
    windowDecoration: string;
    fontSize: number;
    aspectRatio: "16:9" | null;
    ligatures: boolean;
  };
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
  const brand = BRAND_PRESETS.find((preset) => preset.id === input.brand);
  const settings = brand?.settings;
  // Only some presets set these, so the type inferred from the generated JS lacks them.
  const presetAspectRatio =
    settings && "aspectRatio" in settings ? (settings.aspectRatio as "16:9" | null) : null;
  const presetLigatures =
    settings && "ligatures" in settings ? (settings.ligatures as boolean) : true;
  const theme = input.theme ?? settings?.theme ?? "github_dark";
  const language = input.language ?? inferLanguage(input.filename, input.code);
  if (!supportedLanguages.includes(language))
    throw new RenderInputError(unsupported("language", language, supportedLanguages));
  if (!supportedThemes.includes(theme))
    throw new RenderInputError(unsupported("theme", theme, supportedThemes));
  const showComments = input.showComments ?? Boolean(input.comments);
  const visualRows = input.code
    .split("\n")
    .reduce(
      (count, text, index) =>
        count +
        wrapTokenLine([{ text }], EXPORT_MAX_CHARS_PER_LINE).length +
        (showComments && input.comments?.[index + 1]
          ? wrapCommentText(input.comments[index + 1].body).length
          : 0),
      0,
    );
  if (visualRows > EXPORT_MAX_LINES)
    throw new RenderInputError(
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
  const footer = { ...DEFAULT_FOOTER_SETTINGS, ...settings?.footer, ...input.footer };
  const appearance: RenderResult["appearance"] = {
    background: background?.label ?? null,
    outerPadding: input.outerPadding ?? settings?.outerPadding,
    innerPadding: input.innerPadding ?? settings?.innerPadding ?? EXPORT_INNER_PADDING,
    cornerRadius: input.cornerRadius ?? settings?.cornerRadius,
    lineNumbers: input.lineNumbers ?? settings?.lineNumbers ?? true,
    showReactions: false,
    header,
    footer,
    windowDecoration: input.windowDecoration ?? settings?.windowDecoration ?? "macos",
    fontSize: input.fontSize ?? EXPORT_FONT_SIZE,
    aspectRatio: input.aspectRatio ?? presetAspectRatio,
    ligatures: input.ligatures ?? presetLigatures,
  };
  // `system` draws in JetBrains Mono: Edge has no system fonts to fall back on.
  const renderFontId = fontId === "system" ? "jetbrains" : fontId;
  const rendered = await renderExport(
    {
      code: input.code,
      filename: input.filename,
      theme,
      width: EXPORT_WIDTH,
      background,
      outerPadding: appearance.outerPadding,
      lineNumbers: appearance.lineNumbers,
      fontId: renderFontId,
      // App font subsets rely on browser fallback for the comment arrow; embed
      // Hack too, so native conversion never turns it into a missing glyph.
      fallbackFontId:
        showComments && input.comments && renderFontId !== "hack" ? "hack" : undefined,
      language,
      reactions: input.reactions,
      showReactions: input.showReactions ?? Boolean(input.reactions),
      footerAuthorUsername: input.author,
      comments: input.comments,
      showComments,
      windowDecoration: appearance.windowDecoration,
      cornerRadius: appearance.cornerRadius,
      innerPadding: appearance.innerPadding,
      header,
      footer,
      fontSize: appearance.fontSize,
      wordDiff: input.wordDiff ?? false,
      aspectRatio: appearance.aspectRatio,
      ligatures: appearance.ligatures,
    },
    {
      highlighter: clientHighlighterPromise,
      loadFontBase64,
      loadImageDataUrl,
      fontFormat: "truetype",
    },
  );
  let svg = rendered.svg;
  const logicalWidth = rendered.layout.width;
  const logicalHeight = rendered.layout.height;
  // PNG is rasterized elsewhere from a 1x SVG; here pixelRatio only sizes the SVG.
  const pixelRatio = input.format === "svg" ? (input.pixelRatio ?? 1) : 1;
  const width = Math.round(logicalWidth * pixelRatio);
  const height = Math.round(logicalHeight * pixelRatio);
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
      pixelRatio,
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
    theme,
    language,
    fontId,
    appearance,
    logicalWidth,
    logicalHeight,
    timings,
    parserEvents: parserEventsSince(cursor),
  };
}
