import {
  inferLanguage,
  languageDisplayName,
  codePointLength,
  type ExportReactionChip,
} from "@/lib/snippet-utils";
import { nameToColor, nameToInitials } from "@/lib/presence-utils";
import {
  BRAND_PRESETS,
  type BrandFramePreset,
  type BrandId,
  resolveBrandScene,
  type BrandPresetShape,
} from "@/lib/brand-presets";
import type { BrandScenePreset } from "@/lib/brand-scenes";
import {
  normalizeFooterSettings,
  normalizeHeaderSettings,
  visibleFooterItems,
  type ExportFooterSettings,
  type ExportHeaderSettings,
  type FooterItem,
} from "@/lib/export-metadata";

export { inferLanguage };

export const EXPORT_WIDTH = 1200;
export const EXPORT_LINE_HEIGHT = 24;
export const EXPORT_FONT_SIZE = 14;
export const EXPORT_MAX_LINES = 30;
export const EXPORT_CHROME_PAD_X = 18;
export const EXPORT_WINDOW_CHROME_HEIGHT = 40;
export const EXPORT_INNER_PADDING = 16;
export const EXPORT_OUTER_PADDING = 64;
export const EXPORT_OUTER_PADDING_VALUES = [0, 16, 32, 64, 96, 128] as const;
export const EXPORT_INNER_PADDING_VALUES = [8, 12, 16, 24, 32, 48] as const;
export const EXPORT_CORNER_RADIUS_VALUES = [0, 4, 8, 12, 16] as const;
export const EXPORT_WIN_RADIUS = 12;
export const EXPORT_MAX_CHARS_PER_LINE = 110;
export const EXPORT_CHAR_WIDTH = 8.43; // measured monospace advance at 14px
export const EXPORT_FONT_SIZE_VALUES = [12, 13, 14, 16, 18, 20] as const;
export const EXPORT_MIN_WIDTH = 240;
export const EXPORT_LINE_NUM_WIDTH = 18; // width reserved for line number column
export const EXPORT_LINE_NUM_GAP = 18; // visual gap between line-number gutter and code
export const EXPORT_GUTTER_WIDTH =
  EXPORT_CHROME_PAD_X + EXPORT_LINE_NUM_WIDTH + EXPORT_LINE_NUM_GAP;
export const EXPORT_METADATA_URL = "https://supagist.app";
export const EXPORT_METADATA_TEXT = `Created with Supagist (${EXPORT_METADATA_URL})`;
export const EXPORT_COMMENT_PREFIX = "↳";

function nearestExportValue(values: readonly number[], value: number) {
  return values.reduce((closest, candidate) =>
    Math.abs(candidate - value) <= Math.abs(closest - value) ? candidate : closest,
  );
}

function exportValueFromSliderIndex(values: readonly number[], index: number) {
  const safeIndex = Math.max(0, Math.min(values.length - 1, Math.round(index)));
  return values[safeIndex];
}

export function normalizeExportOuterPadding(outerPadding: number) {
  return nearestExportValue(EXPORT_OUTER_PADDING_VALUES, outerPadding);
}

export function exportOuterPaddingToSliderIndex(outerPadding: number) {
  return (EXPORT_OUTER_PADDING_VALUES as readonly number[]).indexOf(
    normalizeExportOuterPadding(outerPadding),
  );
}

export function exportOuterPaddingFromSliderIndex(index: number) {
  return exportValueFromSliderIndex(EXPORT_OUTER_PADDING_VALUES, index);
}

export function normalizeExportInnerPadding(innerPadding: number) {
  return nearestExportValue(EXPORT_INNER_PADDING_VALUES, innerPadding);
}

export function exportInnerPaddingToSliderIndex(innerPadding: number) {
  return (EXPORT_INNER_PADDING_VALUES as readonly number[]).indexOf(
    normalizeExportInnerPadding(innerPadding),
  );
}

export function exportInnerPaddingFromSliderIndex(index: number) {
  return exportValueFromSliderIndex(EXPORT_INNER_PADDING_VALUES, index);
}

export function normalizeExportCornerRadius(cornerRadius: number) {
  return nearestExportValue(EXPORT_CORNER_RADIUS_VALUES, cornerRadius);
}

export function exportCornerRadiusToSliderIndex(cornerRadius: number) {
  return (EXPORT_CORNER_RADIUS_VALUES as readonly number[]).indexOf(
    normalizeExportCornerRadius(cornerRadius),
  );
}

export function exportCornerRadiusFromSliderIndex(index: number) {
  return exportValueFromSliderIndex(EXPORT_CORNER_RADIUS_VALUES, index);
}

export function normalizeExportFontSize(fontSize: number) {
  return nearestExportValue(EXPORT_FONT_SIZE_VALUES, fontSize);
}

// Line height and character advance are both measured at the 14px default, so
// a resized code font keeps the same optical rhythm by scaling them with it.
export function exportLineHeightForFontSize(fontSize: number) {
  return Math.round(normalizeExportFontSize(fontSize) * (EXPORT_LINE_HEIGHT / EXPORT_FONT_SIZE));
}

export function exportCharWidthForFontSize(fontSize: number) {
  return (EXPORT_CHAR_WIDTH / EXPORT_FONT_SIZE) * normalizeExportFontSize(fontSize);
}

export type ExportComment = { author?: string; body: string };
export type WindowDecoration = "macos" | "macos-subtle" | "windows" | "minimal" | "none";
type ExportVisualRow = {
  tokens: SvgToken[];
  lineNum: number | null;
  sourceLine: number | null;
};

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

// Pick a readable text colour for a known card-fill colour. Brand frames
// override `cardFill` with a fixed hex (Vercel #000, Stripe #0c2e4e, etc.),
// so the editor's `editorFg` from the syntax theme often clashes — light
// theme + dark brand card means dark-on-dark filename text.
//
// Returns "#ffffff" for cards that read dark, "#000000" otherwise. Callers
// typically wrap in fill-opacity for the soft secondary look used elsewhere.
export function readableOnFill(fill: string): "#000000" | "#ffffff" {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(fill.trim());
  if (!m) return "#000000";
  const hex = m[1].length === 3 ? m[1].replace(/(.)/g, "$1$1") : m[1];
  const n = parseInt(hex, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  // Rec. 601 luma — good enough for picking light vs dark.
  return r * 0.299 + g * 0.587 + b * 0.114 > 140 ? "#000000" : "#ffffff";
}

/**
 * Per-brand chrome customisations for the editor card itself. Each brand has
 * a recognisable shape — Vercel is borderless and chromeless, Stripe sits in
 * a rounded subtle-border card, Resend uses a clean header strip, etc. The
 * default (no frame) is the macOS-style three-dots + centred filename header
 * we use everywhere else.
 */
export type BrandFrame = BrandFramePreset;

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
  brandId?: BrandId;
  /** Per-brand chrome customisation — see BrandFrame. */
  frame?: BrandFrame;
  /** Layered canvas lighting, border, guides, and frame-depth recipe. */
  scene?: BrandScenePreset;
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
export const EXPORT_BRAND_BACKGROUNDS: ExportBackground[] = BRAND_PRESETS.map(
  (preset: BrandPresetShape) => ({
    ...preset.background,
    logoUrl: preset.logoUrl,
    brandId: preset.id as BrandId,
    frame: preset.background.frame,
    scene: resolveBrandScene(preset),
  }),
);

const CHIP_PAD = 5;
const CHIP_EMOJI_W = 14;
const CHIP_INNER_GAP = 3;
const CHIP_AVATAR_SIZE = 12;
const CHIP_AVATAR_OVERLAP = 4;
const CHIP_AVATARS_MAX = 3;
const CHIP_OVERFLOW_PAD = 4;
const CHIP_OVERFLOW_FONT = 8;
const CHIP_FIRST_GAP = 6;
const CHIP_INTER_GAP = 5;

function overflowPillWidth(overflow: number): number {
  if (overflow <= 0) return 0;
  const label = `+${overflow}`;
  return Math.ceil(label.length * CHIP_OVERFLOW_FONT * 0.62) + CHIP_OVERFLOW_PAD * 2;
}

function chipWidthFor(chip: ExportReactionChip): number {
  const visible = Math.min(chip.reactors.length, CHIP_AVATARS_MAX);
  const overflow = chip.reactors.length - visible;
  const stackedAvatars =
    visible === 0
      ? 0
      : CHIP_AVATAR_SIZE + Math.max(0, visible - 1) * (CHIP_AVATAR_SIZE - CHIP_AVATAR_OVERLAP);
  const overflowExtra = overflow > 0 ? overflowPillWidth(overflow) - CHIP_AVATAR_OVERLAP : 0;
  return CHIP_PAD + CHIP_EMOJI_W + CHIP_INNER_GAP + stackedAvatars + overflowExtra + CHIP_PAD;
}

function lineChipsWidth(chips: ExportReactionChip[]): number {
  return chips.length === 0
    ? 0
    : CHIP_FIRST_GAP +
        chips.reduce((acc, chip) => acc + chipWidthFor(chip), 0) +
        CHIP_INTER_GAP * (chips.length - 1);
}

// The editable composer renders one compact emoji-only pill per line. Its
// measured width is 30px plus the 8px inline gap; unlike exported chips it
// does not include reactor avatars.
const INLINE_REACTION_WIDTH = 38;

function inlineReactionWidth(chips: ExportReactionChip[]): number {
  return chips.length > 0 ? INLINE_REACTION_WIDTH : 0;
}

function exportMetadataText(sourceUrl: string) {
  return `Created with Supagist (${sourceUrl})`;
}

function exportTopPad(
  windowDecoration: WindowDecoration = "macos",
  innerPadding = EXPORT_INNER_PADDING,
) {
  return windowDecoration === "none" ? innerPadding : EXPORT_WINDOW_CHROME_HEIGHT + innerPadding;
}

function resolveRenderedWindowDecoration(
  headerEnabled: boolean,
  windowDecoration: WindowDecoration,
  hasHeaderStrip: boolean,
): WindowDecoration {
  if (!headerEnabled) return "none";
  if (windowDecoration === "none" && hasHeaderStrip) return "minimal";
  return windowDecoration;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint32(value: number) {
  const bytes = new Uint8Array(4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, value, false);
  return bytes;
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function pngTextChunk(keyword: string, text: string) {
  const encoder = new TextEncoder();
  const type = encoder.encode("tEXt");
  const data = concatBytes([encoder.encode(keyword), new Uint8Array([0]), encoder.encode(text)]);
  const crcInput = concatBytes([type, data]);
  return concatBytes([writeUint32(data.length), type, data, writeUint32(crc32(crcInput))]);
}

export function addPngTextMetadata(bytes: Uint8Array, keyword: string, text: string) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 33 || !signature.every((byte, index) => bytes[index] === byte)) return bytes;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const firstLength = view.getUint32(8, false);
  const firstType = new TextDecoder().decode(bytes.slice(12, 16));
  if (firstType !== "IHDR") return bytes;

  const insertAt = 8 + 4 + 4 + firstLength + 4;
  return concatBytes([
    bytes.slice(0, insertAt),
    pngTextChunk(keyword, text),
    bytes.slice(insertAt),
  ]);
}

function footerItemText(
  item: Exclude<FooterItem, "author">,
  language: string,
  theme: string,
  lineCount: number,
  code: string,
) {
  if (item === "language") return languageDisplayName(language);
  if (item === "theme") return theme;
  if (item === "lineCount") return `${lineCount} lines`;
  return `${codePointLength(code).toLocaleString()} / 8,000`;
}

function footerContentWidth(
  items: FooterItem[],
  language: string,
  theme: string,
  lineCount: number,
  code: string,
  author: string,
) {
  return items.reduce((width, item, index) => {
    const gap = index === 0 ? 0 : 18;
    if (item === "author") return width + gap + 14 + 6 + `@${author}`.length * 7;
    return width + gap + footerItemText(item, language, theme, lineCount, code).length * 7;
  }, 0);
}

function headerMetadataInsets(windowDecoration: WindowDecoration) {
  if (windowDecoration === "macos" || windowDecoration === "macos-subtle") {
    return { left: 82, right: EXPORT_CHROME_PAD_X };
  }
  if (windowDecoration === "windows") {
    return { left: EXPORT_CHROME_PAD_X, right: 82 };
  }
  return { left: EXPORT_CHROME_PAD_X, right: EXPORT_CHROME_PAD_X };
}

function headerRequiredWidth(
  settings: ExportHeaderSettings,
  filename: string,
  language: string,
  leftInset: number,
  rightInset: number,
  allowFilename = true,
) {
  const widths = { left: 0, center: 0, right: 0 };
  const add = (position: keyof typeof widths, text: string) => {
    if (!text) return;
    widths[position] += (widths[position] > 0 ? 14 : 0) + text.length * 7;
  };

  if (settings.showFilename && allowFilename) {
    add(settings.filenamePosition, filename);
  }
  if (settings.showLanguage) {
    add(settings.languagePosition, languageDisplayName(language));
  }

  const centerInset = Math.max(leftInset, rightInset);
  const leftCenter =
    widths.left > 0 && widths.center > 0
      ? 2 * (leftInset + widths.left + 14 + widths.center / 2)
      : 0;
  const centerRight =
    widths.center > 0 && widths.right > 0
      ? 2 * (rightInset + widths.right + 14 + widths.center / 2)
      : 0;
  const leftRight =
    widths.left > 0 && widths.right > 0
      ? leftInset + widths.left + 14 + widths.right + rightInset
      : 0;

  return Math.max(
    leftInset + widths.left + rightInset,
    centerInset * 2 + widths.center,
    leftInset + widths.right + rightInset,
    leftCenter,
    centerRight,
    leftRight,
  );
}

export function estimateExportDimensions({
  code,
  filename = "",
  language,
  theme,
  width = EXPORT_WIDTH,
  height,
  background,
  outerPadding,
  lineNumbers = false,
  reactions,
  showReactions = false,
  showFooter = false,
  header,
  footer,
  footerAuthorUsername,
  windowDecoration = "macos",
  innerPadding = EXPORT_INNER_PADDING,
  fontSize = EXPORT_FONT_SIZE,
  compactReactions = false,
}: {
  code: string;
  filename?: string;
  language: string;
  theme: string;
  width?: number;
  height?: number;
  background?: ExportBackground | null;
  outerPadding?: number;
  lineNumbers?: boolean;
  reactions?: Record<number, ExportReactionChip[]> | null;
  showReactions?: boolean;
  showFooter?: boolean;
  header?: ExportHeaderSettings;
  footer?: ExportFooterSettings;
  footerAuthorUsername?: string | null;
  windowDecoration?: WindowDecoration;
  innerPadding?: number;
  fontSize?: number;
  compactReactions?: boolean;
}) {
  const rawLines = code.split(/\r?\n/);
  const innerPaddingPx = normalizeExportInnerPadding(innerPadding);
  const codeLineHeight = exportLineHeightForFontSize(fontSize);
  const codeCharWidth = exportCharWidthForFontSize(fontSize);
  const resolvedHeader = normalizeHeaderSettings(header);
  const resolvedFooter = normalizeFooterSettings(footer, showFooter);
  const footerItems = visibleFooterItems(resolvedFooter);
  const renderFooter = footerItems.length > 0;
  const effectiveWindowDecoration = resolveRenderedWindowDecoration(
    resolvedHeader.enabled,
    windowDecoration,
    Boolean(background?.frame?.headerStrip),
  );
  const renderHeader = effectiveWindowDecoration !== "none";
  const topPad = exportTopPad(effectiveWindowDecoration, innerPaddingPx);
  const hasReactions = showReactions && reactions && Object.keys(reactions).length > 0;
  const longestLinePx = Math.min(
    Math.max(
      ...rawLines.map((line, idx) => {
        const lineNum = idx + 1;
        const chips = hasReactions ? (reactions![lineNum] ?? []) : [];
        const reactionWidth = compactReactions ? inlineReactionWidth(chips) : lineChipsWidth(chips);
        return Math.ceil(line.length * codeCharWidth) + reactionWidth;
      }),
      0,
    ),
    Math.ceil(EXPORT_MAX_CHARS_PER_LINE * codeCharWidth),
  );
  const author = footerAuthorUsername || "you";
  const footerWidthPx = renderFooter
    ? footerContentWidth(footerItems, language, theme, rawLines.length, code, author)
    : 0;
  const headerInsets = headerMetadataInsets(effectiveWindowDecoration);
  const headerWidthPx = renderHeader
    ? headerRequiredWidth(
        resolvedHeader,
        filename,
        language,
        headerInsets.left,
        headerInsets.right,
        Boolean(background?.frame?.headerStrip) ||
          (background?.frame?.showCenteredFilename ?? true),
      )
    : 0;
  const naturalWidth = Math.max(
    longestLinePx +
      (lineNumbers ? EXPORT_GUTTER_WIDTH + innerPaddingPx : innerPaddingPx) +
      innerPaddingPx,
    footerWidthPx + 2 * EXPORT_CHROME_PAD_X,
    headerWidthPx,
  );
  const actualWidth =
    height !== undefined ? width : Math.min(width, Math.max(EXPORT_MIN_WIDTH, naturalWidth));
  const maxLines = height
    ? Math.max(1, Math.floor((height - topPad - innerPaddingPx) / codeLineHeight))
    : EXPORT_MAX_LINES;
  const sourceTruncated = rawLines.length > maxLines;
  const visibleRawLines = rawLines.slice(0, maxLines);
  const displayLineCount = visibleRawLines.length + (sourceTruncated ? 1 : 0);
  const footerHeight = renderFooter ? 36 : 0;
  const actualHeight =
    height ??
    topPad + Math.max(displayLineCount, 1) * codeLineHeight + innerPaddingPx + footerHeight;
  const outerPaddingPx = background ? (outerPadding ?? EXPORT_OUTER_PADDING) : 0;

  return {
    width: Math.round(actualWidth + outerPaddingPx * 2),
    height: Math.round(actualHeight + outerPaddingPx * 2),
  };
}

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
  outerPadding?: number,
  lineNumbers?: boolean,
  fontId?: string,
  languageOverride?: string | null,
  reactions?: Record<number, ExportReactionChip[]> | null,
  showReactions?: boolean,
  showFilename?: boolean,
  showFooter?: boolean,
  footerAuthorUsername?: string | null,
  footerAuthorAvatarUrl?: string | null,
  comments?: Record<number, ExportComment> | null,
  showComments?: boolean,
  sourceUrl?: string | null,
  windowDecoration: WindowDecoration = "macos",
  cornerRadius?: number,
  innerPadding = EXPORT_INNER_PADDING,
  headerSettings?: ExportHeaderSettings,
  footerSettings?: ExportFooterSettings,
  fontSize = EXPORT_FONT_SIZE,
): Promise<string> {
  void comments;
  void showComments;
  const language = languageOverride || inferLanguage(filename, code);
  const [{ clientHighlighterPromise }, { loadTheme }] = await Promise.all([
    import("@/lib/lumis-client"),
    import("@/lib/theme-loader"),
  ]);
  const loaded = await loadTheme(theme);
  const themeData = loaded.data;
  const highlighter = await clientHighlighterPromise;
  await highlighter.loadLanguage(language);

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

  const innerPaddingPx = normalizeExportInnerPadding(innerPadding);
  const codeFontSize = normalizeExportFontSize(fontSize);
  const codeLineHeight = exportLineHeightForFontSize(codeFontSize);
  const codeCharWidth = exportCharWidthForFontSize(codeFontSize);
  const resolvedHeader = normalizeHeaderSettings(headerSettings, showFilename ?? true);
  const resolvedFooter = normalizeFooterSettings(footerSettings, showFooter ?? false);
  const footerItems = visibleFooterItems(resolvedFooter);
  const renderFooter = footerItems.length > 0;
  const renderedWindowDecoration = resolveRenderedWindowDecoration(
    resolvedHeader.enabled,
    windowDecoration,
    Boolean(background?.frame?.headerStrip),
  );
  const renderHeader = renderedWindowDecoration !== "none";
  const topPad = exportTopPad(renderedWindowDecoration, innerPaddingPx);
  const maxSourceLines =
    height !== undefined
      ? Math.max(1, Math.floor((height - topPad - innerPaddingPx) / codeLineHeight))
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
  // Pre-fetch every unique avatar URL we'll need (each visible reactor on
  // every chip + footer author) and inline them as <pattern> defs. Patterns
  // are referenced by id in circle fills — one def per URL even if reused
  // across many chips. URLs that fail to load fall back to the initial-
  // circle render.
  const avatarUrls = new Set<string>();
  if (hasReactions) {
    for (const chips of Object.values(reactions!)) {
      for (const chip of chips) {
        for (const reactor of chip.reactors.slice(0, CHIP_AVATARS_MAX)) {
          if (reactor.avatarUrl) avatarUrls.add(reactor.avatarUrl);
        }
      }
    }
  }
  if (footerItems.includes("author") && footerAuthorAvatarUrl) {
    avatarUrls.add(footerAuthorAvatarUrl);
  }

  const avatarDataUrls = new Map<string, string>();
  await Promise.all(
    Array.from(avatarUrls).map(async (u) => {
      const data = await loadAvatarDataUrl(u);
      if (data) avatarDataUrls.set(u, data);
      return data;
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
        const chips = hasReactions ? (reactions![lineNum] ?? []) : [];
        return Math.ceil(l.length * codeCharWidth) + lineChipsWidth(chips);
      }),
      0,
    ),
    Math.ceil(EXPORT_MAX_CHARS_PER_LINE * codeCharWidth),
  );
  // The selected footer details participate in natural-width sizing so a
  // long theme or author handle never crowds the card edge.
  const author = footerAuthorUsername || "you";
  const footerWidthPx = renderFooter
    ? footerContentWidth(footerItems, language, theme, rawLines.length, code, author)
    : 0;
  const headerInsets = headerMetadataInsets(renderedWindowDecoration);
  const headerWidthPx = renderHeader
    ? headerRequiredWidth(
        resolvedHeader,
        filename,
        language,
        headerInsets.left,
        headerInsets.right,
        Boolean(background?.frame?.headerStrip) ||
          (background?.frame?.showCenteredFilename ?? true),
      )
    : 0;
  // Line-number exports keep the gutter fixed, then apply configurable inner
  // padding on both sides of the code body. Header and footer chrome also
  // participate in natural sizing so aligned labels cannot overlap controls.
  const naturalWidth = Math.max(
    longestLinePx +
      (lineNumbers ? EXPORT_GUTTER_WIDTH + innerPaddingPx : innerPaddingPx) +
      innerPaddingPx,
    footerWidthPx + 2 * EXPORT_CHROME_PAD_X,
    headerWidthPx,
  );
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

  // Wrap each source line and track source row metadata for reaction placement.
  const allVisualRows: ExportVisualRow[] = [];
  tokenLines.forEach((line, srcIdx) => {
    const srcLine = srcIdx + 1;
    const wrapped = wrapTokenLine(line, EXPORT_MAX_CHARS_PER_LINE);
    wrapped.forEach((vl, wi) => {
      allVisualRows.push({ tokens: vl, lineNum: wi === 0 ? srcLine : null, sourceLine: srcLine });
    });
  });

  const maxVisualLines =
    height !== undefined
      ? Math.max(1, Math.floor((height - topPad - innerPaddingPx) / codeLineHeight))
      : EXPORT_MAX_LINES;

  const visualTruncated = allVisualRows.length > maxVisualLines;
  const displayRows = allVisualRows.slice(0, maxVisualLines);
  if (sourceTruncated || visualTruncated) {
    displayRows.push({
      tokens: [{ text: "…", color: editorFg, bold: false, italic: false }],
      lineNum: null,
      sourceLine: null,
    });
  }

  // For each source line, find the index of its LAST visual row — chips need
  // to render after the actual end of the wrapped text, not at the (full)
  // first wrap row. `displayLineNums[i]` is the source line number on a row
  // that starts a source line and `null` on continuation rows; we walk the
  // array, tracking the active source, and remember its largest visual idx.
  const lastVisualIdxBySrcLine = new Map<number, number>();
  displayRows.forEach((row, i) => {
    if (row.sourceLine !== null) lastVisualIdxBySrcLine.set(row.sourceLine, i);
  });

  // Footer strip mirrors the editor's status bar — language, line count,
  // char count, author chip — opted into via `showFooter`. ~36px tall plus
  // a 1px top divider. (renderFooter declared earlier for the width calc.)
  const FOOTER_HEIGHT = 36;
  const actualHeight =
    height ??
    topPad +
      Math.max(displayRows.length, 1) * codeLineHeight +
      innerPaddingPx +
      (renderFooter ? FOOTER_HEIGHT : 0);

  const outerPaddingPx = background ? (outerPadding ?? EXPORT_OUTER_PADDING) : 0;
  const totalWidth = actualWidth + outerPaddingPx * 2;
  const totalHeight = actualHeight + outerPaddingPx * 2;

  const dotsY = outerPaddingPx + Math.round(EXPORT_WINDOW_CHROME_HEIGHT / 2);
  const firstLineY =
    outerPaddingPx + topPad + Math.round((codeLineHeight - codeFontSize) / 2 + codeFontSize * 0.8);
  // The line-number gutter is fixed chrome and never expands with inner
  // padding. The code body receives inner padding on all four sides after it.
  const lineNumX = outerPaddingPx + EXPORT_CHROME_PAD_X + EXPORT_LINE_NUM_WIDTH;
  const codeX =
    outerPaddingPx + (lineNumbers ? EXPORT_GUTTER_WIDTH + innerPaddingPx : innerPaddingPx);
  const gutterDividerX = outerPaddingPx + EXPORT_GUTTER_WIDTH;
  const gutterDividerTop =
    outerPaddingPx + (renderedWindowDecoration === "none" ? 0 : EXPORT_WINDOW_CHROME_HEIGHT);
  const gutterDividerBottom = outerPaddingPx + actualHeight - (renderFooter ? FOOTER_HEIGHT : 0);
  const gutterDividerMarkup = lineNumbers
    ? `<line data-export-gutter-divider="true" x1="${gutterDividerX}" y1="${gutterDividerTop}" x2="${gutterDividerX}" y2="${gutterDividerBottom}" stroke="${escapeXml(editorFg)}" stroke-opacity="0.12" stroke-width="1"/>`
    : "";

  const fontAttrs = `font-size="${codeFontSize}" font-family="${escapeXml(fontFamily)}" xml:space="preserve" text-rendering="geometricPrecision" letter-spacing="0"`;

  const lineMarkup = displayRows
    .map((row, i) => {
      const { tokens } = row;
      const y = firstLineY + i * codeLineHeight;

      let numMarkup = "";
      if (lineNumbers) {
        const num = row.lineNum;
        numMarkup =
          num !== null
            ? `<text x="${lineNumX}" y="${y}" ${fontAttrs} text-anchor="end" fill="${escapeXml(editorFg)}" fill-opacity="0.4">${num}</text>`
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
        let chipX = codeX + Math.ceil(lineChars * codeCharWidth) + CHIP_FIRST_GAP;

        const chipH = 18;
        // Align the chip's vertical CENTRE with the code line's optical centre.
        // SVG `<text y>` is the baseline; the optical centre of a
        // line of text sits roughly fontSize*0.35 above the baseline.
        const lineCenterY = y - codeFontSize * 0.35;
        const chipY = lineCenterY - chipH / 2;
        const cy = chipY + chipH / 2;

        const chipR = chipH / 2;
        reactionMarkup = reactions![chipSrcLine]
          .map((chip) => {
            const visibleReactors = chip.reactors.slice(0, CHIP_AVATARS_MAX);
            const overflow = chip.reactors.length - visibleReactors.length;
            const chipW = chipWidthFor(chip);
            const x = chipX;
            const emojiX = x + CHIP_PAD + CHIP_EMOJI_W / 2;
            const firstAvatarLeft = x + CHIP_PAD + CHIP_EMOJI_W + CHIP_INNER_GAP;

            // Slack-style stack: each subsequent avatar overlaps the previous
            // by CHIP_AVATAR_OVERLAP, with a thin ring stroke for separation
            // (the live UI uses a box-shadow ring; SVG can't do that, so we
            // approximate with a stroke matched to the chip background).
            const avatarsMarkup = visibleReactors
              .map((reactor, i) => {
                const cxAvatar =
                  firstAvatarLeft +
                  CHIP_AVATAR_SIZE / 2 +
                  i * (CHIP_AVATAR_SIZE - CHIP_AVATAR_OVERLAP);
                const patternId = reactor.avatarUrl
                  ? avatarPatternIds.get(reactor.avatarUrl)
                  : null;
                const ringAttrs = `stroke="${escapeXml(editorBg)}" stroke-width="1"`;
                if (patternId) {
                  return `<circle cx="${cxAvatar}" cy="${cy}" r="${CHIP_AVATAR_SIZE / 2}" fill="url(#${patternId})" ${ringAttrs}/>`;
                }
                const avatarColor = nameToColor(reactor.username);
                const avatarLetter = nameToInitials(reactor.username)[0] ?? "?";
                return (
                  `<circle cx="${cxAvatar}" cy="${cy}" r="${CHIP_AVATAR_SIZE / 2}" fill="${escapeXml(avatarColor)}" ${ringAttrs}/>` +
                  `<text x="${cxAvatar}" y="${cy}" font-size="8" font-family="${escapeXml(fontFamily)}" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${escapeXml(avatarLetter)}</text>`
                );
              })
              .join("");

            let overflowMarkup = "";
            if (overflow > 0) {
              const overflowW = overflowPillWidth(overflow);
              const lastAvatarRight =
                firstAvatarLeft +
                CHIP_AVATAR_SIZE +
                Math.max(0, visibleReactors.length - 1) * (CHIP_AVATAR_SIZE - CHIP_AVATAR_OVERLAP);
              const pillX = lastAvatarRight - CHIP_AVATAR_OVERLAP;
              const pillCx = pillX + overflowW / 2;
              const pillR = CHIP_AVATAR_SIZE / 2;
              const pillY = cy - pillR;
              overflowMarkup =
                `<rect x="${pillX}" y="${pillY}" width="${overflowW}" height="${CHIP_AVATAR_SIZE}" rx="${pillR}" ry="${pillR}" ` +
                `fill="${escapeXml(editorBg)}" stroke="${escapeXml(editorFg)}" stroke-opacity="0.35" stroke-width="1"/>` +
                `<text x="${pillCx}" y="${cy}" font-size="${CHIP_OVERFLOW_FONT}" font-family="${escapeXml(fontFamily)}" font-weight="700" fill="${escapeXml(editorFg)}" text-anchor="middle" dominant-baseline="central">+${overflow}</text>`;
            }

            const markup =
              `<g>` +
              `<rect x="${x}" y="${chipY}" width="${chipW}" height="${chipH}" rx="${chipR}" ry="${chipR}" ` +
              `fill="${escapeXml(editorBg)}" stroke="${escapeXml(editorFg)}" stroke-opacity="0.22" stroke-width="1"/>` +
              `<text x="${emojiX}" y="${cy}" font-size="13" text-anchor="middle" dominant-baseline="central">${chip.emoji}</text>` +
              avatarsMarkup +
              overflowMarkup +
              `</g>`;
            chipX += chipW + CHIP_INTER_GAP;
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

  const scene = background?.scene;
  const brandDecoration =
    background?.brandId && scene
      ? renderBrandDecoration({
          brandId: background.brandId,
          scene,
          outerPadding: outerPaddingPx,
          actualWidth,
          actualHeight,
          totalWidth,
          totalHeight,
        })
      : "";

  // Frame config: per-brand chrome customisation. Defaults reproduce the
  // generic macOS-style window we render on non-brand exports.
  const frame = background?.frame;
  const cardRadius = Math.max(
    0,
    Math.min(16, cornerRadius ?? frame?.cardRadius ?? EXPORT_WIN_RADIUS),
  );
  const cardFill = frame?.cardFill ?? editorBg;
  const cardStrokeAttrs = scene
    ? ""
    : frame?.cardBorder === undefined
      ? "" // generic macOS card has no stroke
      : frame.cardBorder === null
        ? ""
        : ` stroke="${escapeXml(frame.cardBorder.color)}" stroke-width="${frame.cardBorder.width}"`;
  const cardShadowAttr = scene ? ` filter="url(#brand-card-shadow)"` : "";
  const cardRect =
    `<rect x="${outerPaddingPx}" y="${outerPaddingPx}" width="${actualWidth}" height="${actualHeight}" ` +
    `rx="${cardRadius}" ry="${cardRadius}" fill="${escapeXml(cardFill)}"${cardStrokeAttrs}${cardShadowAttr}/>`;
  const sceneDefs = scene ? renderBrandSceneDefs(scene) : "";
  const sceneCanvasLayers = scene ? renderBrandCanvasLayers(scene, totalWidth, totalHeight) : "";
  const sceneFrame = scene
    ? renderBrandFrame(scene, outerPaddingPx, actualWidth, actualHeight, cardRadius)
    : "";

  let bgSection: string;
  if (background) {
    const patternMarkup = patternDataUrl
      ? `<image href="${escapeXml(patternDataUrl)}" xlink:href="${escapeXml(patternDataUrl)}" ` +
        `x="0" y="0" width="${totalWidth}" height="${totalHeight}" preserveAspectRatio="xMidYMid slice"/>`
      : "";
    bgSection =
      `<defs>` +
      `<linearGradient id="outerBg" x1="0%" y1="0%" x2="100%" y2="100%">` +
      `<stop offset="0%" stop-color="${escapeXml(background.from)}"/>` +
      `<stop offset="100%" stop-color="${escapeXml(background.to)}"/>` +
      `</linearGradient>` +
      sceneDefs +
      `</defs>` +
      `<rect width="${totalWidth}" height="${totalHeight}" fill="url(#outerBg)"/>` +
      sceneCanvasLayers +
      patternMarkup +
      brandDecoration +
      cardRect +
      sceneFrame;
  } else {
    // No background: the card *is* the whole image. Still emit `cardRect`
    // rather than a plain full-bleed rect, otherwise the corner-radius setting
    // is silently dropped here while the live preview keeps rounding. With
    // nothing painted behind it the rounded corners come out transparent,
    // which is what a standalone snippet image should do.
    bgSection = cardRect;
  }

  // Pick a chrome text colour from the card fill, not from `editorFg`. Brand
  // frames override cardFill independently of the syntax theme, so a
  // light-themed snippet on, say, the Stripe card (#0c2e4e) needs *light*
  // chrome text — dark `editorFg` would render invisible.
  const chromeColor = readableOnFill(cardFill);

  const headerItems = [
    renderHeader &&
    resolvedHeader.showFilename &&
    filename &&
    (Boolean(frame?.headerStrip) || (frame?.showCenteredFilename ?? true))
      ? {
          text: filename,
          opacity: 0.7,
          size: 12,
          position: resolvedHeader.filenamePosition,
        }
      : null,
    renderHeader && resolvedHeader.showLanguage && language
      ? {
          text: languageDisplayName(language),
          opacity: 0.5,
          size: 11,
          position: resolvedHeader.languagePosition,
        }
      : null,
  ].filter(
    (
      item,
    ): item is {
      text: string;
      opacity: number;
      size: number;
      position: "left" | "center" | "right";
    } => item !== null,
  );
  const headerGap = 14;
  const headerMarkup = (["left", "center", "right"] as const)
    .map((position) => {
      const positionItems = headerItems.filter((item) => item.position === position);
      const contentWidth = positionItems.reduce(
        (sum, item, index) => sum + item.text.length * 7 + (index > 0 ? headerGap : 0),
        0,
      );
      let cursor =
        position === "left"
          ? outerPaddingPx + headerInsets.left
          : position === "right"
            ? outerPaddingPx + actualWidth - headerInsets.right - contentWidth
            : outerPaddingPx + (actualWidth - contentWidth) / 2;

      return positionItems
        .map((item, index) => {
          if (index > 0) cursor += headerGap;
          const markup = `<text x="${cursor}" y="${dotsY}" font-size="${item.size}" font-family="${escapeXml(fontFamily)}" dominant-baseline="middle" fill="${chromeColor}" fill-opacity="${item.opacity}">${escapeXml(item.text)}</text>`;
          cursor += item.text.length * 7;
          return markup;
        })
        .join("");
    })
    .join("");

  const windowDividerY = outerPaddingPx + (frame?.headerStrip ? 36 : EXPORT_WINDOW_CHROME_HEIGHT);
  const windowDividerMarkup =
    renderedWindowDecoration !== "none"
      ? `<line data-export-window-divider="true" x1="${outerPaddingPx}" y1="${windowDividerY}" x2="${outerPaddingPx + actualWidth}" y2="${windowDividerY}" stroke="${chromeColor}" stroke-opacity="0.12" stroke-width="1"/>`
      : "";

  // Footer items are individually selectable and share one alignment. Width
  // estimation and rendering use the same ordered item list for parity.
  let footerMarkup = "";
  if (renderFooter) {
    const footerY = outerPaddingPx + actualHeight - FOOTER_HEIGHT;
    const footerCenterY = footerY + FOOTER_HEIGHT / 2;
    const footerStartX =
      resolvedFooter.alignment === "center"
        ? outerPaddingPx + (actualWidth - footerWidthPx) / 2
        : resolvedFooter.alignment === "right"
          ? outerPaddingPx + actualWidth - EXPORT_CHROME_PAD_X - footerWidthPx
          : outerPaddingPx + EXPORT_CHROME_PAD_X;
    const dimAttrs = `font-size="12" font-family="${escapeXml(fontFamily)}" fill="${escapeXml(editorFg)}" fill-opacity="0.55" dominant-baseline="central"`;
    let cursor = footerStartX;
    const items: string[] = [];

    for (const [index, item] of footerItems.entries()) {
      if (index > 0) cursor += 18;
      if (item !== "author") {
        const text = footerItemText(item, language, theme, rawLines.length, code);
        items.push(
          `<text x="${cursor}" y="${footerCenterY}" ${dimAttrs}>${escapeXml(text)}</text>`,
        );
        cursor += text.length * 7;
        continue;
      }

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
      items.push(
        `<text x="${cursor}" y="${footerCenterY}" ${dimAttrs}>${escapeXml(`@${author}`)}</text>`,
      );
      cursor += `@${author}`.length * 7;
    }

    footerMarkup =
      `<rect x="${outerPaddingPx}" y="${footerY}" width="${actualWidth}" height="1" fill="${escapeXml(editorFg)}" fill-opacity="0.12"/>` +
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

  // Traffic-light dots use the fixed chrome inset. SVG <circle> is anchored
  // by its center, so we shift cx by the dot radius.
  const DOT_R = 7;
  const firstDotCx = outerPaddingPx + EXPORT_CHROME_PAD_X + DOT_R;
  const showDots =
    renderedWindowDecoration === "macos" || renderedWindowDecoration === "macos-subtle";
  const dotColors =
    renderedWindowDecoration === "macos-subtle"
      ? [chromeColor, chromeColor, chromeColor]
      : ["#ff5f57", "#febc2e", "#28c840"];
  const dotOpacity = renderedWindowDecoration === "macos-subtle" ? ' fill-opacity="0.22"' : "";
  const dotsMarkup = showDots
    ? `<circle cx="${firstDotCx}" cy="${dotsY}" r="${DOT_R}" fill="${escapeXml(dotColors[0]!)}"${dotOpacity}/>` +
      `<circle cx="${firstDotCx + 22}" cy="${dotsY}" r="${DOT_R}" fill="${escapeXml(dotColors[1]!)}"${dotOpacity}/>` +
      `<circle cx="${firstDotCx + 44}" cy="${dotsY}" r="${DOT_R}" fill="${escapeXml(dotColors[2]!)}"${dotOpacity}/>`
    : "";
  const windowsControlsMarkup =
    renderedWindowDecoration === "windows"
      ? `<text x="${outerPaddingPx + actualWidth - EXPORT_CHROME_PAD_X - 52}" y="${dotsY}" font-size="12" font-family="${escapeXml(fontFamily)}" text-anchor="middle" dominant-baseline="middle" fill="${chromeColor}" fill-opacity="0.55">─</text>` +
        `<rect x="${outerPaddingPx + actualWidth - EXPORT_CHROME_PAD_X - 32}" y="${dotsY - 5}" width="10" height="10" fill="none" stroke="${chromeColor}" stroke-opacity="0.55" stroke-width="1"/>` +
        `<text x="${outerPaddingPx + actualWidth - EXPORT_CHROME_PAD_X - 5}" y="${dotsY}" font-size="14" font-family="${escapeXml(fontFamily)}" text-anchor="middle" dominant-baseline="middle" fill="${chromeColor}" fill-opacity="0.55">×</text>`
      : "";
  const metadataUrl = sourceUrl || EXPORT_METADATA_URL;
  const metadataMarkup =
    `<metadata>` +
    `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/">` +
    `<rdf:Description rdf:about="${escapeXml(metadataUrl)}">` +
    `<dc:creator>Supagist</dc:creator>` +
    `<dc:source>${escapeXml(metadataUrl)}</dc:source>` +
    `<dc:description>${escapeXml(exportMetadataText(metadataUrl))}</dc:description>` +
    `</rdf:Description>` +
    `</rdf:RDF>` +
    `</metadata>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">` +
    metadataMarkup +
    fontStyleBlock +
    avatarPatternsBlock +
    bgSection +
    dotsMarkup +
    windowsControlsMarkup +
    headerMarkup +
    windowDividerMarkup +
    gutterDividerMarkup +
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
  outerPadding?: number,
  lineNumbers?: boolean,
  fontId?: string,
  languageOverride?: string | null,
  reactions?: Record<number, ExportReactionChip[]> | null,
  showReactions?: boolean,
  showFilename?: boolean,
  showFooter?: boolean,
  footerAuthorUsername?: string | null,
  footerAuthorAvatarUrl?: string | null,
  comments?: Record<number, ExportComment> | null,
  showComments?: boolean,
  sourceUrl?: string | null,
  windowDecoration?: WindowDecoration,
  cornerRadius?: number,
  innerPadding?: number,
  headerSettings?: ExportHeaderSettings,
  footerSettings?: ExportFooterSettings,
  fontSize?: number,
): Promise<File> {
  const svg = await createHighlightedSvg(
    code,
    filename,
    theme,
    width,
    height,
    background,
    outerPadding,
    lineNumbers,
    fontId,
    languageOverride,
    reactions,
    showReactions,
    showFilename,
    showFooter,
    footerAuthorUsername,
    footerAuthorAvatarUrl,
    comments,
    showComments,
    sourceUrl,
    windowDecoration,
    cornerRadius,
    innerPadding,
    headerSettings,
    footerSettings,
    fontSize,
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
    const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
    const withMetadata = addPngTextMetadata(pngBytes, "Source", sourceUrl || EXPORT_METADATA_URL);
    const pngBuffer = withMetadata.buffer.slice(
      withMetadata.byteOffset,
      withMetadata.byteOffset + withMetadata.byteLength,
    ) as ArrayBuffer;
    return new File([pngBuffer], outFilename, { type: "image/png" });
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

function renderBrandSceneDefs(scene: BrandScenePreset): string {
  const glowDefs = scene.glows
    .map(
      (glow, index) =>
        `<radialGradient id="brand-glow-${index}" cx="${glow.x}%" cy="${glow.y}%" r="${glow.radius}%">` +
        `<stop offset="0%" stop-color="${escapeXml(glow.color)}" stop-opacity="${glow.opacity}"/>` +
        `<stop offset="100%" stop-color="${escapeXml(glow.color)}" stop-opacity="0"/>` +
        `</radialGradient>`,
    )
    .join("");
  const shadow = scene.frame.shadow;
  return (
    glowDefs +
    `<radialGradient id="brand-vignette" cx="50%" cy="42%" r="72%">` +
    `<stop offset="34%" stop-color="${escapeXml(scene.vignette.color)}" stop-opacity="0"/>` +
    `<stop offset="100%" stop-color="${escapeXml(scene.vignette.color)}" stop-opacity="${scene.vignette.opacity}"/>` +
    `</radialGradient>` +
    `<linearGradient id="brand-frame-rim" x1="0%" y1="0%" x2="100%" y2="100%">` +
    `<stop offset="0%" stop-color="${escapeXml(scene.frame.rimFrom)}"/>` +
    `<stop offset="100%" stop-color="${escapeXml(scene.frame.rimTo)}"/>` +
    `</linearGradient>` +
    `<filter id="brand-card-shadow" x="-35%" y="-35%" width="170%" height="190%">` +
    `<feDropShadow dx="0" dy="${shadow.y}" stdDeviation="${shadow.blur / 2}" flood-color="${escapeXml(shadow.color)}" flood-opacity="${shadow.opacity}"/>` +
    `</filter>`
  );
}

function renderBrandCanvasLayers(
  scene: BrandScenePreset,
  totalWidth: number,
  totalHeight: number,
): string {
  const glowLayers = scene.glows
    .map(
      (_glow, index) =>
        `<rect data-scene-layer="glow-${index}" width="${totalWidth}" height="${totalHeight}" fill="url(#brand-glow-${index})"/>`,
    )
    .join("");
  return (
    glowLayers +
    `<rect data-scene-layer="vignette" width="${totalWidth}" height="${totalHeight}" fill="url(#brand-vignette)"/>` +
    `<rect data-scene-layer="canvas-rim" x="0.5" y="0.5" width="${Math.max(0, totalWidth - 1)}" height="${Math.max(0, totalHeight - 1)}" rx="${scene.canvasRadius}" ry="${scene.canvasRadius}" fill="none" stroke="${escapeXml(scene.canvasBorder)}" stroke-width="1"/>`
  );
}

function renderBrandFrame(
  scene: BrandScenePreset,
  outerPadding: number,
  actualWidth: number,
  actualHeight: number,
  cardRadius: number,
): string {
  const topHighlightY = outerPadding + 1;
  return (
    `<rect data-scene-layer="frame-rim" x="${outerPadding + 0.5}" y="${outerPadding + 0.5}" width="${Math.max(0, actualWidth - 1)}" height="${Math.max(0, actualHeight - 1)}" rx="${Math.max(0, cardRadius - 0.5)}" ry="${Math.max(0, cardRadius - 0.5)}" fill="none" stroke="url(#brand-frame-rim)" stroke-width="1"/>` +
    `<rect data-scene-layer="frame-inner-stroke" x="${outerPadding + 1.5}" y="${outerPadding + 1.5}" width="${Math.max(0, actualWidth - 3)}" height="${Math.max(0, actualHeight - 3)}" rx="${Math.max(0, cardRadius - 1.5)}" ry="${Math.max(0, cardRadius - 1.5)}" fill="none" stroke="${escapeXml(scene.frame.innerStroke)}" stroke-width="1"/>` +
    `<line data-scene-layer="frame-highlight" x1="${outerPadding + cardRadius}" y1="${topHighlightY}" x2="${outerPadding + actualWidth - cardRadius}" y2="${topHighlightY}" stroke="${escapeXml(scene.frame.highlight)}" stroke-width="1"/>`
  );
}

type BrandDecorationArgs = {
  brandId: NonNullable<ExportBackground["brandId"]>;
  scene: BrandScenePreset;
  /** Outer padding between the canvas edge and the editor card. */
  outerPadding: number;
  /** Editor card width. */
  actualWidth: number;
  /** Editor card height. */
  actualHeight: number;
  /** Outer canvas size (after outer padding). */
  totalWidth: number;
  totalHeight: number;
};

function renderBrandDecoration(args: BrandDecorationArgs): string {
  switch (args.scene.guide) {
    case "registration":
      return renderVercelDecoration(args);
    case "stripe-planes":
      return renderStripeDecoration(args);
    case "crosshair":
      return renderTailwindDecoration(args);
    case "studio":
      return renderStudioDecoration(args);
    case "halo":
      return renderHaloDecoration(args);
    case "beam":
      return renderBeamDecoration(args);
    case "none":
      return "";
  }
}

function renderStudioDecoration({
  scene,
  outerPadding,
  actualWidth,
  actualHeight,
  totalWidth,
}: BrandDecorationArgs): string {
  const color = escapeXml(scene.guideColor);
  const right = outerPadding + actualWidth;
  const top = outerPadding;
  return (
    `<line data-scene-node="studio-top" x1="0" y1="${Math.max(0, top - 18)}" x2="${totalWidth}" y2="${Math.max(0, top - 18)}" stroke="${color}" stroke-width="1"/>` +
    `<line data-scene-node="studio-bottom" x1="0" y1="${outerPadding + actualHeight + 18}" x2="${totalWidth}" y2="${outerPadding + actualHeight + 18}" stroke="${color}" stroke-width="1"/>` +
    `<line data-scene-node="studio-rail" x1="${totalWidth * 0.18}" y1="0" x2="${totalWidth * 0.18}" y2="${outerPadding * 2 + actualHeight}" stroke="${color}" stroke-opacity="0.6" stroke-width="1"/>` +
    `<circle data-scene-node="studio-ring-large" cx="${right - 34}" cy="${top + 34}" r="32" fill="none" stroke="${color}" stroke-opacity="0.45"/>` +
    `<circle data-scene-node="studio-ring-small" cx="${right - 34}" cy="${top + 34}" r="16" fill="none" stroke="${color}" stroke-opacity="0.72"/>`
  );
}

function renderHaloDecoration({ scene, totalWidth, totalHeight }: BrandDecorationArgs): string {
  const color = escapeXml(scene.guideColor);
  const cx = totalWidth / 2;
  const cy = totalHeight / 2;
  const radius = Math.min(totalWidth, totalHeight) * 0.62;
  return (
    `<circle data-scene-node="halo-outer" cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${color}" stroke-opacity="0.55"/>` +
    `<circle data-scene-node="halo-inner" cx="${cx}" cy="${cy}" r="${radius * 0.74}" fill="none" stroke="${color}" stroke-opacity="0.72" stroke-dasharray="8 10"/>` +
    `<circle data-scene-node="halo-node-a" cx="${totalWidth * 0.14}" cy="${totalHeight * 0.22}" r="3" fill="${color}"/>` +
    `<circle data-scene-node="halo-node-b" cx="${totalWidth * 0.88}" cy="${totalHeight * 0.82}" r="2.5" fill="${color}"/>`
  );
}

function renderBeamDecoration({ scene, totalWidth, totalHeight }: BrandDecorationArgs): string {
  const color = escapeXml(scene.guideColor);
  return (
    `<path data-scene-node="beam-a" d="M ${totalWidth * 0.48} -20 L ${totalWidth * 1.04} -20 L ${totalWidth * 0.74} ${totalHeight + 20} L ${totalWidth * 0.28} ${totalHeight + 20} Z" fill="${color}" fill-opacity="0.48"/>` +
    `<path data-scene-node="beam-b" d="M ${totalWidth * 0.74} -20 L ${totalWidth * 1.08} -20 L ${totalWidth * 0.88} ${totalHeight + 20} L ${totalWidth * 0.58} ${totalHeight + 20} Z" fill="${color}" fill-opacity="0.3"/>` +
    `<line data-scene-node="beam-horizon-a" x1="0" y1="${totalHeight * 0.24}" x2="${totalWidth}" y2="${totalHeight * 0.24}" stroke="${color}" stroke-opacity="0.55"/>` +
    `<line data-scene-node="beam-horizon-b" x1="0" y1="${totalHeight * 0.82}" x2="${totalWidth}" y2="${totalHeight * 0.82}" stroke="${color}" stroke-opacity="0.38"/>`
  );
}

function renderVercelDecoration({
  outerPadding: outerPaddingPx,
  actualWidth,
  actualHeight,
  totalWidth,
  totalHeight,
  scene,
}: BrandDecorationArgs): string {
  // Thin gridlines extending beyond the editor card on all four sides, plus
  // L-shaped registration brackets at the top-left and bottom-right corners.
  // Mirrors VercelFrame.module.css's .gridlinesHorizontal / .gridlinesVertical
  // / .bracketLeft / .bracketRight.
  const lineColor = escapeXml(scene.guideColor);
  const bracketColor = escapeXml(scene.guideColor);
  const bracketLen = 25;
  const top = outerPaddingPx;
  const left = outerPaddingPx;
  const right = outerPaddingPx + actualWidth;
  const bottom = outerPaddingPx + actualHeight;
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

function renderTailwindDecoration({
  outerPadding: outerPaddingPx,
  actualWidth,
  actualHeight,
  scene,
}: BrandDecorationArgs): string {
  // Thin white gridlines flanking the editor card. Roughly mirrors
  // TailwindFrame's gridlinesHorizontal/Vertical, faded near the ends so
  // the lines feel like guides rather than hard borders. We approximate the
  // mask by drawing 4 short segments that don't reach the card edges.
  const lineColor = escapeXml(scene.guideColor);
  const offsetX = Math.min(64, Math.max(0, outerPaddingPx - 12));
  const offsetY = Math.min(24, Math.max(0, outerPaddingPx - 8));
  return (
    // Horizontal lines above + below the card
    `<line data-scene-node="crosshair-top" x1="${outerPaddingPx - offsetX}" y1="${outerPaddingPx - offsetY}" x2="${outerPaddingPx + actualWidth + offsetX}" y2="${outerPaddingPx - offsetY}" stroke="${lineColor}" stroke-width="1"/>` +
    `<line data-scene-node="crosshair-bottom" x1="${outerPaddingPx - offsetX}" y1="${outerPaddingPx + actualHeight + offsetY}" x2="${outerPaddingPx + actualWidth + offsetX}" y2="${outerPaddingPx + actualHeight + offsetY}" stroke="${lineColor}" stroke-width="1"/>` +
    // Vertical lines left + right of the card
    `<line data-scene-node="crosshair-left" x1="${outerPaddingPx - offsetX}" y1="${outerPaddingPx - offsetY}" x2="${outerPaddingPx - offsetX}" y2="${outerPaddingPx + actualHeight + offsetY}" stroke="${lineColor}" stroke-width="1"/>` +
    `<line data-scene-node="crosshair-right" x1="${outerPaddingPx + actualWidth + offsetX}" y1="${outerPaddingPx - offsetY}" x2="${outerPaddingPx + actualWidth + offsetX}" y2="${outerPaddingPx + actualHeight + offsetY}" stroke="${lineColor}" stroke-width="1"/>`
  );
}

function renderStripeDecoration({
  outerPadding: outerPaddingPx,
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
    const x = outerPaddingPx + (actualWidth * i) / (lineCount - 1);
    return `<line x1="${x}" y1="${stripeY}" x2="${x}" y2="${totalHeight}" stroke="${dashColor}" stroke-dasharray="4,4" stroke-width="1"/>`;
  }).join("");

  // 3-layer set near bottom-right inside the white stripe
  const setW = Math.min(500, actualWidth * 0.55);
  const setX = outerPaddingPx + actualWidth - setW + 50;
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
