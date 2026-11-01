import {
  EXPORT_BACKGROUNDS,
  EXPORT_BRAND_BACKGROUNDS,
  EXPORT_FONT_SIZE,
  EXPORT_INNER_PADDING,
  normalizeExportCornerRadius,
  normalizeExportFontSize,
  normalizeExportInnerPadding,
  normalizeExportOuterPadding,
  type ExportAspectRatio,
  type ExportBackground,
  type WindowDecoration,
} from "@/lib/export-utils";
import {
  DEFAULT_FOOTER_SETTINGS,
  DEFAULT_HEADER_SETTINGS,
  normalizeFooterSettings,
  normalizeHeaderSettings,
  type ExportFooterSettings,
  type ExportHeaderSettings,
} from "@/lib/export-metadata";

/**
 * How a snippet was composed, stored in `snippets.appearance` at publish. The
 * theme, font and language have their own columns; everything else the
 * composer offers lives here, so the saved view and its exports can show the
 * snippet the way its author published it.
 */
export type SnippetAppearance = {
  background: string | null;
  outerPadding: number;
  innerPadding: number;
  cornerRadius: number;
  pixelRatio: number;
  lineNumbers: boolean;
  showReactions: boolean;
  header: ExportHeaderSettings;
  footer: ExportFooterSettings;
  windowDecoration: WindowDecoration;
  fontSize: number;
  aspectRatio: ExportAspectRatio | null;
  ligatures: boolean;
};

export const WINDOW_DECORATIONS: readonly WindowDecoration[] = [
  "macos",
  "macos-subtle",
  "windows",
  "minimal",
  "none",
  "lumis",
  "markdown",
];

export const EXPORT_PIXEL_RATIOS = [2, 4, 6] as const;

/** What a snippet published before appearance was stored looks like. */
export const DEFAULT_SNIPPET_APPEARANCE: SnippetAppearance = {
  background: null,
  outerPadding: 64,
  innerPadding: EXPORT_INNER_PADDING,
  cornerRadius: 12,
  pixelRatio: 4,
  lineNumbers: false,
  showReactions: false,
  header: DEFAULT_HEADER_SETTINGS,
  footer: DEFAULT_FOOTER_SETTINGS,
  windowDecoration: "macos",
  fontSize: EXPORT_FONT_SIZE,
  aspectRatio: null,
  ligatures: true,
};

const ALL_BACKGROUNDS = [...EXPORT_BACKGROUNDS, ...EXPORT_BRAND_BACKGROUNDS];

export function findExportBackground(label: string | null): ExportBackground | null {
  return label === null ? null : (ALL_BACKGROUNDS.find((b) => b.label === label) ?? null);
}

/**
 * Reads a stored or submitted appearance. Unknown fields are dropped and every
 * value is snapped to an option the composer offers, so the result is always
 * renderable; anything missing or invalid falls back to the default.
 */
export function parseSnippetAppearance(value: unknown): SnippetAppearance {
  const input: Record<string, unknown> =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const fallback = DEFAULT_SNIPPET_APPEARANCE;
  const number = (key: string, normalize: (n: number) => number, defaultValue: number) => {
    const raw = input[key];
    return typeof raw === "number" && Number.isFinite(raw) ? normalize(raw) : defaultValue;
  };
  const boolean = (key: string, defaultValue: boolean) => {
    const raw = input[key];
    return typeof raw === "boolean" ? raw : defaultValue;
  };

  return {
    background:
      typeof input.background === "string"
        ? (findExportBackground(input.background)?.label ?? null)
        : fallback.background,
    outerPadding: number("outerPadding", normalizeExportOuterPadding, fallback.outerPadding),
    innerPadding: number("innerPadding", normalizeExportInnerPadding, fallback.innerPadding),
    cornerRadius: number("cornerRadius", normalizeExportCornerRadius, fallback.cornerRadius),
    pixelRatio: EXPORT_PIXEL_RATIOS.includes(input.pixelRatio as 2 | 4 | 6)
      ? (input.pixelRatio as number)
      : fallback.pixelRatio,
    lineNumbers: boolean("lineNumbers", fallback.lineNumbers),
    showReactions: boolean("showReactions", fallback.showReactions),
    header: input.header === undefined ? fallback.header : normalizeHeaderSettings(input.header),
    footer: input.footer === undefined ? fallback.footer : normalizeFooterSettings(input.footer),
    windowDecoration: WINDOW_DECORATIONS.includes(input.windowDecoration as WindowDecoration)
      ? (input.windowDecoration as WindowDecoration)
      : fallback.windowDecoration,
    fontSize: number("fontSize", normalizeExportFontSize, fallback.fontSize),
    aspectRatio: input.aspectRatio === "16:9" ? "16:9" : null,
    ligatures: boolean("ligatures", fallback.ligatures),
  };
}
