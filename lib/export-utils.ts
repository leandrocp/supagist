import {
  inferLanguage,
  languageDisplayName,
  codePointLength,
  type ExportReactionChip,
} from "@/lib/snippet-utils";
import {
  highlightTokenLines,
  loadLanguageOrPlaintext,
  lineAnnotations,
  lineFormatter,
} from "@/lib/lumis-lines";
import { nameToColor, nameToInitials } from "@/lib/presence-utils";
import {
  BRAND_PRESETS,
  type BrandDecorationLayer,
  type BrandFramePreset,
  type BrandWindowDecoration,
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
export type WindowDecoration = BrandWindowDecoration;

// ── Brand window bars (`lumis`, `markdown`) ─────────────────────────────────
// Design px at a 22px code font; both bars scale with the export font size so
// they keep the design's proportions to the code.
const BRAND_HEADER_DESIGN_FONT_SIZE = 22;
export const LUMIS_HEADER = {
  height: 72,
  padX: 30,
  markGap: 14,
  filenameSize: 19,
  labelSize: 17,
  labelGap: 22,
  dash: { width: 16, height: 6, gap: 5 },
} as const;
export const MARKDOWN_HEADER = {
  height: 58,
  padX: 24,
  fontSize: 21,
  gap: 24,
  controls: "[-][□][x]",
} as const;
/** The Lumis sun, top to bottom, in units of its diameter / 152. */
export const LUMIS_SUN_BANDS = [
  { color: "#8C6BFF", from: 0, to: 30 },
  { color: "#FF5FAE", from: 33, to: 58 },
  { color: "#FF6F6F", from: 62, to: 84 },
  { color: "#FF7A45", from: 89, to: 108 },
  { color: "#FFC23D", from: 114, to: 152 },
] as const;
/** The tree on its hill from the Lumis badge (leandrocp/lumis
 *  assets/brand/logo/badge-*.svg), verbatim, in the badge's 260px units. */
const LUMIS_TREE_PATH =
  "M56.53 120.41 L56.45 120.99 L56.11 121.51 L54.72 122.37 L53.9 122.98 L53.13 123.67 L52.26 124.67 L51.19 126.39 L50.47 128.28 L50.26 129.29 L50.13 130.61 L50.14 131.65 L50.26 132.65 L50.56 133.94 L50.9 134.9 L51.34 135.83 L52.05 136.96 L52.9 138.01 L53.88 138.93 L54.98 139.72 L56.17 140.36 L57.13 140.74 L58.42 141.08 L59.75 141.26 L61.2 141.28 L61.85 141.56 L62.28 142.14 L62.61 143.43 L63.08 144.69 L64.1 146.44 L64.94 147.47 L65.68 148.19 L66.74 148.99 L67.63 149.53 L68.83 150.07 L70.13 150.47 L71.46 150.69 L72.81 150.73 L74.15 150.6 L75.46 150.3 L76.73 149.82 L77.9 149.2 L80.74 151.31 L83.57 153.67 L85.3 155.26 L86.89 156.87 L89 159.29 L90.76 161.7 L92.15 164.08 L93.13 166.42 L93.55 167.94 L93.29 170.8 L92.99 172.64 L92.36 175.3 L91.48 177.79 L90.93 178.99 L90.6 177.92 L89.77 181.02 L89.08 181.99 L85.04 182.3 L79.88 182.81 L72.83 183.71 L72.6 180.22 L70.38 184.07 L69.96 184.13 L69.6 179.22 L67.64 184.51 L58.61 186.16 L54.22 187.1 L52.6 182.52 L52.03 187.6 L51.93 187.62 L49.6 181.32 L49.08 188.3 L43.12 189.82 L46.3 194.22 L48.45 196.93 L50.68 199.56 L53 202.12 L55.4 204.6 L57.88 207 L60.44 209.32 L63.07 211.55 L65.78 213.7 L68.55 215.76 L71.39 217.72 L74.29 219.59 L77.25 221.37 L80.27 223.04 L83.34 224.62 L86.46 226.1 L89.63 227.47 L92.84 228.74 L96.09 229.9 L99.37 230.96 L102.69 231.91 L106.04 232.74 L109.42 233.47 L112.81 234.09 L116.23 234.6 L119.66 234.99 L123.1 235.27 L126.55 235.44 L130 235.5 L133.45 235.44 L136.9 235.27 L140.34 234.99 L143.77 234.6 L147.19 234.09 L150.58 233.47 L153.96 232.74 L157.31 231.91 L160.63 230.96 L163.91 229.9 L167.16 228.74 L170.37 227.47 L173.54 226.1 L176.66 224.62 L179.73 223.04 L182.75 221.37 L185.71 219.59 L188.61 217.72 L191.45 215.76 L194.22 213.7 L196.93 211.55 L199.56 209.32 L202.12 207 L204.6 204.6 L207 202.12 L209.32 199.56 L211.45 197.05 L198.61 195.31 L197.6 190.97 L196.18 194.97 L195.86 194.92 L194.6 189.97 L193.55 194.58 L170.92 191.09 L170.6 184.99 L168.19 190.65 L167.97 190.61 L167.6 183.59 L165.68 190.24 L152.22 188 L150.6 183.94 L150.11 187.64 L149.62 187.56 L147.6 182.94 L147.24 187.16 L122 183 L117.91 182.44 L113.64 182.02 L110.88 181.84 L109.86 180.53 L108.92 179.01 L108.14 177.41 L107.52 175.71 L107.04 173.92 L106.71 172.03 L106.51 170.04 L106.45 167.94 L107.11 165.36 L108.11 162.79 L109.42 160.25 L110.46 158.56 L111.61 156.9 L113.55 154.43 L115.32 152.46 L116.31 152.42 L117.17 152.29 L118.23 152.01 L119.04 151.69 L120.5 150.84 L121.35 150.14 L122.17 149.3 L122.6 149.05 L123.05 148.97 L123.5 149.04 L125.28 149.95 L126.89 150.47 L128.22 150.69 L129.59 150.73 L131.26 150.54 L132.86 150.08 L134.11 149.52 L135.51 148.61 L136.53 147.73 L137.42 146.71 L138.17 145.59 L138.77 144.38 L139.12 143.4 L139.42 142.11 L139.55 140.75 L139.5 139.09 L139.59 138.7 L139.77 138.39 L140.09 138.08 L140.49 137.88 L142.44 137.64 L144.38 137.05 L146.14 136.11 L147.48 135.04 L148.81 133.52 L149.82 131.77 L150.47 129.85 L150.73 127.85 L150.65 126.18 L150.3 124.54 L149.68 122.97 L148.99 121.78 L148.17 120.71 L147.22 119.75 L145.86 118.75 L144.11 117.84 L143.82 117.56 L143.62 117.22 L143.53 116.6 L143.8 114.95 L143.86 113.75 L143.8 112.57 L143.55 111.04 L143.22 109.88 L142.78 108.78 L142.24 107.73 L141.33 106.28 L141.25 105.88 L141.25 104.47 L141.04 103.37 L140.57 102.11 L139.85 100.96 L139.11 100.15 L138.4 99.56 L137.43 98.98 L136.41 98.58 L135.53 98.37 L134.64 98.28 L133.51 98.34 L132.23 98.58 L131.83 98.52 L131.5 98.38 L131.03 97.91 L130.19 96.08 L128.98 94.21 L127.78 92.84 L126.43 91.66 L124.56 90.45 L122.92 89.71 L121.17 89.18 L119.09 88.84 L118.6 88.61 L118.32 88.33 L118.13 87.97 L117.95 86.69 L117.73 85.72 L117.37 84.76 L116.89 83.86 L116.15 82.87 L115.43 82.15 L114.63 81.53 L113.75 81.02 L112.82 80.63 L111.84 80.37 L110.84 80.24 L110.06 80.22 L108.33 80.48 L107.37 80.81 L106.51 81.2 L105.98 81.28 L103.72 80.65 L102.14 80.36 L100.55 80.23 L98.94 80.25 L97.86 80.36 L96.3 80.64 L93.89 81.35 L91.67 81.08 L90.57 81.12 L89.73 81.24 L88.12 81.73 L86.61 82.54 L85.72 83.22 L84.76 84.22 L84.1 85.13 L83.56 86.14 L83.17 87.19 L82.88 88.55 L82.8 89.67 L82.86 91.18 L82.73 91.57 L82.46 91.93 L81.84 92.27 L79.49 92.64 L77.66 93.19 L75.9 93.99 L74.28 95 L73.15 95.9 L72.14 96.88 L70.65 98.75 L69.49 100.84 L68.96 102.17 L68.55 103.54 L68.2 104.05 L67.65 104.36 L66.12 104.63 L64.9 104.98 L62.95 105.83 L61.86 106.48 L60.85 107.24 L59.91 108.09 L59.06 109.03 L58.09 110.38 L57.47 111.5 L56.83 113.04 L56.47 114.28 L56.2 115.92 L56.14 117.21 L56.25 118.87ZM92.18 150.07 L93.38 148.65 L93.95 147.67 L94.29 146.88 L94.83 145.24 L95.33 144.78 L95.93 144.61 L100.01 144.72 L102.54 144.68 L105.69 144.5 L106.13 144.56 L106.57 144.8 L106.91 145.2 L107.54 147.16 L107.9 147.92 L108.44 148.79 L105.75 151.12 L103.3 153.61 L101.08 156.3 L99.57 158.48 L98.34 156.83 L96.42 154.52 L94.2 152.11Z";
/** Where the badge hill meets the badge circle, in badge units. */
const LUMIS_HILL_LEFT = { x: 43.12, y: 189.82 } as const;
const LUMIS_HILL_RIGHT = { x: 211.45, y: 197.05 } as const;
/** The `lumis` window controls: the sun's ends and middle (violet, coral, gold). */
export const LUMIS_HEADER_DASHES = [0, 2, 4].map((band) => LUMIS_SUN_BANDS[band]!.color);
const MONO_ADVANCE_EM = 0.6;

export function isBrandHeaderDecoration(
  decoration: WindowDecoration,
): decoration is "lumis" | "markdown" {
  return decoration === "lumis" || decoration === "markdown";
}

export function brandHeaderScale(fontSize: number) {
  return normalizeExportFontSize(fontSize) / BRAND_HEADER_DESIGN_FONT_SIZE;
}

/** Height of the window bar above the code; 0 when there is none. */
export function exportHeaderHeight(
  decoration: WindowDecoration,
  fontSize: number = EXPORT_FONT_SIZE,
  frame?: BrandFramePreset,
) {
  if (decoration === "none") return 0;
  if (!isBrandHeaderDecoration(decoration)) return EXPORT_WINDOW_CHROME_HEIGHT;
  const design =
    frame?.headerHeight ?? (decoration === "lumis" ? LUMIS_HEADER.height : MARKDOWN_HEADER.height);
  return Math.round(design * brandHeaderScale(fontSize));
}

export type BrandHeaderRun = { text: string; color: string; opacity: number; weight: number };

/** The filename and language runs of a `lumis` / `markdown` bar. Frames
 *  without brand colours fall back to the card's readable chrome colour. */
export function brandHeaderRuns(
  decoration: "lumis" | "markdown",
  frame: BrandFramePreset | undefined,
  header: ExportHeaderSettings,
  filename: string,
  language: string,
  chromeColor: string,
): { filename: BrandHeaderRun | null; language: BrandHeaderRun | null } {
  const lumis = decoration === "lumis";
  const run = (
    style: BrandFramePreset["filenameLabel"],
    format: string,
    opacity: number,
    weight: number,
  ): BrandHeaderRun => ({
    text: (style?.format ?? format)
      .replaceAll("{filename}", filename)
      .replaceAll("{Language}", languageDisplayName(language))
      .replaceAll("{lang}", language === "plaintext" ? "" : language),
    color: style?.color ?? chromeColor,
    opacity: style ? (style.opacity ?? 1) : opacity,
    weight: style?.weight ?? weight,
  });
  return {
    filename:
      header.showFilename && filename
        ? run(frame?.filenameLabel, lumis ? "{filename}" : "# {filename}", 0.7, lumis ? 400 : 800)
        : null,
    language: header.showLanguage
      ? run(frame?.languageLabel, lumis ? "< {Language} />" : "```{lang}", 0.6, lumis ? 600 : 400)
      : null,
  };
}

function brandHeaderRequiredWidth(
  decoration: "lumis" | "markdown",
  frame: BrandFramePreset | undefined,
  runs: ReturnType<typeof brandHeaderRuns>,
  fontSize: number,
) {
  const s = brandHeaderScale(fontSize);
  const width = (run: BrandHeaderRun | null, size: number) =>
    run ? run.text.length * MONO_ADVANCE_EM * size * s : 0;
  if (decoration === "lumis") {
    const mark = frame?.headerMark ? frame.headerMark.size + LUMIS_HEADER.markGap : 0;
    const { dash } = LUMIS_HEADER;
    return (
      (2 * LUMIS_HEADER.padX + mark + LUMIS_HEADER.labelGap + 3 * dash.width + 2 * dash.gap) * s +
      width(runs.filename, LUMIS_HEADER.filenameSize) +
      width(runs.language, LUMIS_HEADER.labelSize) +
      (runs.filename && runs.language ? 2 * LUMIS_HEADER.labelGap * s : 0)
    );
  }
  const { padX, fontSize: size, gap, controls } = MARKDOWN_HEADER;
  return (
    (2 * padX + gap) * s +
    width(runs.filename, size) +
    (runs.filename && runs.language ? gap * s : 0) +
    width(runs.language, size) +
    controls.length * MONO_ADVANCE_EM * size * s
  );
}

// ── Brand canvas layers ─────────────────────────────────────────────────────

/** The lumis.sh hero code field, one 28-row cycle. «…» marks italic runs. */
const LUMIS_CODE_FIELD = [
  "«# CLI»",
  "«$» «curl» «-LsSf» «https://lumis.sh/install.sh» «|» «sh»",
  "«$» «lumis» highlight app.js «--theme» «dracula»",
  "",
  "«// Rust»",
  "«use» lumis«::{»highlight«,» «HtmlInlineBuilder»«};»",
  '«let» html «=» «highlight»«(»«"const x = 1"»«,» formatter«);»',
  "",
  "«# Elixir»",
  '«Lumis»«.»«highlight!»«(»«"const x = 1"»«,»',
  '  «formatter»«:» «{:»html_inline«,» «language»«:» «"javascript"»«})»',
  "",
  "«// JavaScript / TypeScript»",
  "«import» «{» highlight «}» «from» «'@lumis-sh/lumis'»",
  "«const» html «=» «await» «highlight»«(»«'const x = 1'»«,» options«)»",
  "",
  "«// Browsers / CDN»",
  "«import» «{» highlight «}» «from»",
  "  «'https://cdn.jsdelivr.net/npm/@lumis-sh/lumis/+esm'»",
  "",
  "«// Java (Lumis4J)»",
  "«var» lumis «=» «Lumis»«.»«builder»«().»«build»«();»",
  '«var» result «=» lumis«.»«highlight»«(»«"const x = 1"»«);»',
  "",
  "«# Python (fastpylight)»",
  "«from» fastpylight «import» highlight_spans«,» theme_css",
  'html «=» «highlight_spans»«(»«"const x = 1"»«,» «"javascript"»«)»',
  "",
];
const CODE_FIELD = {
  fontSize: 17,
  lineHeight: 29.75,
  firstBaseline: 11,
  columns: [0, 552, 1104],
} as const;

function codeFieldRow(line: string) {
  let italic = false;
  let run = "";
  let out = "";
  const flush = () => {
    if (run) out += `<tspan${italic ? ' font-style="italic"' : ""}>${escapeXml(run)}</tspan>`;
    run = "";
  };
  for (const char of line) {
    if (char === "«" || char === "»") {
      flush();
      italic = char === "«";
    } else run += char;
  }
  flush();
  return out;
}

export type ExportViewport = { left: number; top: number; width: number; height: number };

/**
 * SVG markup for a brand's canvas layers, laid out on the visible canvas so
 * card size and padding never move them. Shared by the export and the live
 * preview; `idPrefix` keeps gradient/pattern ids unique when several render
 * on one page.
 */
export function renderBrandLayers(
  layers: readonly BrandDecorationLayer[],
  viewport: ExportViewport,
  fontFamily: string,
  idPrefix = "brand-layer",
): string {
  const { left, top, width, height } = viewport;
  const s = width / EXPORT_CANVAS_16_9.width;
  return layers
    .map((layer, index) => {
      const id = `${idPrefix}-${index}`;
      if (layer.kind === "linear-gradient") {
        const stops = layer.stops
          .map((stop) => `<stop offset="${stop.offset}" stop-color="${escapeXml(stop.color)}"/>`)
          .join("");
        return (
          `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${left}" y1="${top}" x2="${left}" y2="${top + height}">${stops}</linearGradient></defs>` +
          `<rect data-brand-layer="linear-gradient" x="${left}" y="${top}" width="${width}" height="${height}" fill="url(#${id})"/>`
        );
      }
      if (layer.kind === "horizon-bands") {
        const y = top + layer.top * height;
        const unit = (layer.height * height) / 152;
        const bands = LUMIS_SUN_BANDS.map(
          (band) =>
            `<rect x="${left}" y="${+(y + band.from * unit).toFixed(2)}" width="${width}" height="${+((band.to - band.from) * unit).toFixed(2)}" fill="${band.color}"/>`,
        ).join("");
        return `<g data-brand-layer="horizon-bands">${bands}</g>`;
      }
      if (layer.kind === "silhouette") {
        // Drawn in badge units: k maps them to canvas px, (ox, oy) is the badge origin.
        const k = layer.scale * s;
        const ox = left + layer.x * width - LUMIS_HILL_LEFT.x * k;
        const oy = top + layer.y * height - LUMIS_HILL_LEFT.y * k;
        const u = (n: number) => +n.toFixed(2);
        // The badge hill stops at its circle; carry it 20 design px past the
        // canvas edges and bottom so it reads as the ground.
        const edgeLeft = u((left - 20 * s - ox) / k);
        const edgeRight = u((left + width + 20 * s - ox) / k);
        const edgeBottom = u((top + height + 20 * s - oy) / k);
        const { x: lx, y: ly } = LUMIS_HILL_LEFT;
        const { x: rx, y: ry } = LUMIS_HILL_RIGHT;
        const hill =
          `M${lx} ${ly} Q${u(lx - 22.5)} ${u(ly + 6.5)} ${edgeLeft} ${u(ly + 31.5)}` +
          ` L${edgeLeft} ${edgeBottom} L${edgeRight} ${edgeBottom} L${edgeRight} ${u(ry + 10)}` +
          ` Q${u(rx + 30)} ${u(ry + 6.5)} ${rx} ${ry} L150 200 L60 195Z`;
        return (
          `<g data-brand-layer="silhouette" transform="translate(${u(ox)} ${u(oy)}) scale(${+k.toFixed(4)})" fill="${escapeXml(layer.color)}">` +
          `<path d="${hill}"/><path d="${LUMIS_TREE_PATH}"/></g>`
        );
      }
      if (layer.kind === "dot-grid") {
        const size = layer.size * s;
        return (
          `<defs><pattern id="${id}" patternUnits="userSpaceOnUse" x="${left}" y="${top}" width="${size}" height="${size}">` +
          `<circle cx="${2 * s}" cy="${2 * s}" r="${s}" fill="${escapeXml(layer.color)}" fill-opacity="${layer.opacity}"/>` +
          `</pattern></defs>` +
          `<rect data-brand-layer="dot-grid" x="${left}" y="${top}" width="${width}" height="${height}" fill="url(#${id})"/>`
        );
      }
      const rows = Math.ceil(
        (EXPORT_CANVAS_16_9.width * (height / width) - CODE_FIELD.firstBaseline) /
          CODE_FIELD.lineHeight,
      );
      const text = CODE_FIELD.columns
        .flatMap((column) =>
          Array.from({ length: rows + 1 }, (_, row) => {
            const line = LUMIS_CODE_FIELD[row % LUMIS_CODE_FIELD.length]!;
            if (!line) return "";
            const x = +(left + column * s).toFixed(2);
            const y = +(top + (CODE_FIELD.firstBaseline + row * CODE_FIELD.lineHeight) * s).toFixed(
              2,
            );
            return `<text x="${x}" y="${y}" xml:space="preserve">${codeFieldRow(line)}</text>`;
          }),
        )
        .join("");
      return (
        `<g data-brand-layer="code-field" font-family="${escapeXml(fontFamily)}" font-size="${+(CODE_FIELD.fontSize * s).toFixed(2)}" font-weight="500" fill="${escapeXml(layer.color)}" fill-opacity="${layer.opacity}" style="font-variant-ligatures:none">` +
        text +
        `</g>`
      );
    })
    .join("");
}
type ExportVisualRow = {
  tokens: SvgToken[];
  lineNum: number | null;
  sourceLine: number | null;
  /** Set on a row holding a comment rather than source, so the renderer can
   *  style it and the gutter can leave its line number blank. */
  comment?: ExportComment;
};

export type ExportFont = {
  id: string;
  label: string;
  family: string;
  file: string;
  /** Advance width in em from the font's hmtx table; every glyph shares it. */
  advanceEm?: number;
};
export type ExportAspectRatio = "16:9";
/** The X/social card size; a 16:9 export scales its frame to it. */
export const EXPORT_CANVAS_16_9 = { width: 1600, height: 900 } as const;
const ASCII_PUNCTUATION = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
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
    advanceEm: 600 / 1000,
  },
  {
    id: "fira",
    label: "Fira Code",
    family: "Fira Code",
    file: "/fonts/fira-code.woff2",
    advanceEm: 1200 / 2000,
  },
  {
    id: "geist",
    label: "Geist Mono",
    family: "Geist Mono",
    file: "/fonts/geist-mono.woff2",
    advanceEm: 600 / 1000,
  },
  { id: "hack", label: "Hack", family: "Hack", file: "/fonts/hack.woff2", advanceEm: 1233 / 2048 },
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
  /** Brand canvas layers; brands with these have no ambient scene. */
  decoration?: { layers: readonly BrandDecorationLayer[] };
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
    scene: preset.background.decoration ? undefined : resolveBrandScene(preset),
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
  fontSize = EXPORT_FONT_SIZE,
  frame?: BrandFramePreset,
) {
  return exportHeaderHeight(windowDecoration, fontSize, frame) + innerPadding;
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
  comments,
  showComments = false,
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
  comments?: Record<number, ExportComment> | null;
  showComments?: boolean;
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
  const topPad = exportTopPad(
    effectiveWindowDecoration,
    innerPaddingPx,
    fontSize,
    background?.frame,
  );
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
  const headerWidthPx = !renderHeader
    ? 0
    : isBrandHeaderDecoration(effectiveWindowDecoration)
      ? brandHeaderRequiredWidth(
          effectiveWindowDecoration,
          background?.frame,
          brandHeaderRuns(
            effectiveWindowDecoration,
            background?.frame,
            resolvedHeader,
            filename,
            language,
            "",
          ),
          fontSize,
        )
      : headerRequiredWidth(
          resolvedHeader,
          filename,
          language,
          headerInsets.left,
          headerInsets.right,
          Boolean(background?.frame?.headerStrip) ||
            (background?.frame?.showCenteredFilename ?? true),
        );
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
  // Each commented line adds a row under it, so the estimate has to count them
  // or the preview card comes out shorter than what createHighlightedSvg draws.
  const commentRowCount =
    showComments && comments
      ? visibleRawLines.reduce((count, _line, index) => {
          const comment = comments[index + 1];
          return count + (comment ? wrapCommentText(comment.body).length : 0);
        }, 0)
      : 0;
  const displayLineCount = visibleRawLines.length + commentRowCount + (sourceTruncated ? 1 : 0);
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

export type SvgToken = {
  text: string;
  color: string;
  bold: boolean;
  italic: boolean;
  /** Word-diff highlight painted behind the token. */
  highlight?: { fill: string; opacity: number };
};

/** Fallback word-diff highlights for themes without `diff.*.word` colours
 *  (the brand themes), translucent so they sit on any editor background. */
const DIFF_WORD_FALLBACK: Record<string, { fill: string; opacity: number } | undefined> = {
  "diff.minus.word": { fill: "#f85149", opacity: 0.3 },
  "diff.plus.word": { fill: "#3fb950", opacity: 0.3 },
};

/** The lines a comment occupies under the code, prefix included and wrapped.
 *
 *  `createHighlightedSvg` renders these and `estimateExportDimensions` counts
 *  them, so a long comment cannot render taller than the card sized for it. */
export function wrapCommentText(body: string): string[] {
  const text = `${EXPORT_COMMENT_PREFIX} ${body}`;
  return wrapTokenLine(
    [{ text, color: "", bold: false, italic: false }],
    EXPORT_MAX_CHARS_PER_LINE,
  ).map((row) => row.map((token) => token.text).join(""));
}

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
  wordDiff = false,
  aspectRatio?: ExportAspectRatio | null,
  ligatures = true,
): Promise<string> {
  const language = languageOverride || inferLanguage(filename, code);
  const [{ clientHighlighterPromise }, { loadTheme }] = await Promise.all([
    import("@/lib/lumis-client"),
    import("@/lib/theme-loader"),
  ]);
  const loaded = await loadTheme(theme);
  const themeData = loaded.data;
  const highlighter = await clientHighlighterPromise;
  const highlightedLanguage = await loadLanguageOrPlaintext(highlighter, language);

  const editorBg: string =
    (themeData.highlights?.["normal"] as { bg?: string } | undefined)?.bg ??
    (themeData.appearance === "dark" ? "#282c34" : "#f8f8f8");
  const editorFg: string =
    (themeData.highlights?.["normal"] as { fg?: string } | undefined)?.fg ??
    (themeData.appearance === "dark" ? "#abb2bf" : "#383a42");

  const commentTokenStyle = { color: editorFg, bold: false, italic: true };

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
  const headerHeight = exportHeaderHeight(
    renderedWindowDecoration,
    codeFontSize,
    background?.frame,
  );
  const topPad = exportTopPad(
    renderedWindowDecoration,
    innerPaddingPx,
    codeFontSize,
    background?.frame,
  );
  const maxSourceLines =
    height !== undefined
      ? Math.max(1, Math.floor((height - topPad - innerPaddingPx) / codeLineHeight))
      : EXPORT_MAX_LINES;

  const rawLines = code.split(/\r?\n/);
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
  const brandHeader = isBrandHeaderDecoration(renderedWindowDecoration)
    ? renderedWindowDecoration
    : null;
  const headerWidthPx = !renderHeader
    ? 0
    : brandHeader
      ? brandHeaderRequiredWidth(
          brandHeader,
          background?.frame,
          brandHeaderRuns(brandHeader, background?.frame, resolvedHeader, filename, language, ""),
          codeFontSize,
        )
      : headerRequiredWidth(
          resolvedHeader,
          filename,
          language,
          headerInsets.left,
          headerInsets.right,
          Boolean(background?.frame?.headerStrip) ||
            (background?.frame?.showCenteredFilename ?? true),
        );
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

  // Let Lumis resolve comment annotations, preserving comments on blank lines.
  const renderComments = Boolean(showComments) && Boolean(comments);
  const annotations = renderComments ? lineAnnotations(code, comments ?? {}) : [];
  // This pass only needs annotation positions. Plaintext avoids parsing the
  // syntax twice, and no extra pass runs when comments are hidden.
  const lineFmt = lineFormatter<ExportComment>("plaintext", themeData);
  if (annotations.length) highlighter.highlight(code, lineFmt, { annotations });

  // Collect tokens per source line
  const tokenLines: SvgToken[][] = highlightTokenLines(
    highlighter,
    code,
    highlightedLanguage,
    themeData,
    { wordDiff },
  )
    .slice(0, sourceLines.length)
    .map((line) =>
      line.map(({ text, scope, style }) => {
        const token: SvgToken = {
          text,
          color: style?.fg ?? editorFg,
          bold: !!style?.bold,
          italic: !!style?.italic,
        };
        const fallback = wordDiff ? DIFF_WORD_FALLBACK[scope] : undefined;
        if (fallback) token.highlight = style?.bg ? { fill: style.bg, opacity: 1 } : fallback;
        return token;
      }),
    );

  // Wrap each source line and track source row metadata for reaction placement.
  const allVisualRows: ExportVisualRow[] = [];
  tokenLines.forEach((line, srcIdx) => {
    const srcLine = srcIdx + 1;
    const wrapped = wrapTokenLine(line, EXPORT_MAX_CHARS_PER_LINE);
    wrapped.forEach((vl, wi) => {
      allVisualRows.push({ tokens: vl, lineNum: wi === 0 ? srcLine : null, sourceLine: srcLine });
    });
    // A comment follows the whole wrapped line, matching the composer, where it
    // is an extra row under the source rather than an overlay on it.
    const comment = lineFmt.lines[srcIdx]?.overlays[0];
    if (comment) {
      for (const text of wrapCommentText(comment.body)) {
        allVisualRows.push({
          tokens: [{ text, ...commentTokenStyle }],
          lineNum: null,
          sourceLine: srcLine,
          comment,
        });
      }
    }
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
    if (row.sourceLine !== null && !row.comment) lastVisualIdxBySrcLine.set(row.sourceLine, i);
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

  const margin = background ? (outerPadding ?? EXPORT_OUTER_PADDING) : 0;
  let outerPaddingPx = margin;
  // The canvas area shown in the image. Normally the whole canvas; for 16:9 the
  // card is padded by the larger 16:9 slack so the background covers a centred
  // 16:9 frame, and the viewBox crops the other axis to it.
  let viewport = {
    left: 0,
    top: 0,
    width: actualWidth + margin * 2,
    height: actualHeight + margin * 2,
  };
  if (aspectRatio === "16:9") {
    const width = Math.max(viewport.width, (viewport.height * 16) / 9);
    const height = (width * 9) / 16;
    if (background) {
      outerPaddingPx = Math.ceil(Math.max(width - actualWidth, height - actualHeight) / 2);
    }
    viewport = {
      left: outerPaddingPx - (width - actualWidth) / 2,
      top: outerPaddingPx - (height - actualHeight) / 2,
      width,
      height,
    };
  }
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
  const gutterDividerTop = outerPaddingPx + headerHeight;
  const gutterDividerBottom = outerPaddingPx + actualHeight - (renderFooter ? FOOTER_HEIGHT : 0);
  const gutterDividerMarkup = lineNumbers
    ? `<line data-export-gutter-divider="true" x1="${gutterDividerX}" y1="${gutterDividerTop}" x2="${gutterDividerX}" y2="${gutterDividerBottom}" stroke="${escapeXml(editorFg)}" stroke-opacity="0.12" stroke-width="1"/>`
    : "";

  const fontAttrs =
    `font-size="${codeFontSize}" font-family="${escapeXml(fontFamily)}" xml:space="preserve" text-rendering="geometricPrecision" letter-spacing="0"` +
    (ligatures ? "" : ` style="font-variant-ligatures:none"`);
  // Browsers honour font-variant-ligatures, but resvg (local PNG conversion)
  // ignores it. Neither shapes across text chunks, so with a known advance each
  // punctuation character after another one starts a chunk at its own column.
  const ligatureAdvance =
    !ligatures && exportFont.advanceEm ? codeFontSize * exportFont.advanceEm : null;

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
        let column = 0;
        let previous = "";
        tspans = tokens
          .map(({ text, color, bold, italic }) => {
            const fw = bold ? ' font-weight="bold"' : "";
            const fs = italic ? ' font-style="italic"' : "";
            const pieces: { text: string; x?: number }[] = [];
            for (const char of ligatureAdvance === null ? [text] : text) {
              const split =
                ligatureAdvance !== null &&
                previous !== "" &&
                ASCII_PUNCTUATION.includes(previous) &&
                ASCII_PUNCTUATION.includes(char);
              if (split || pieces.length === 0) {
                pieces.push({
                  text: "",
                  x: split ? +(codeX + column * ligatureAdvance!).toFixed(3) : undefined,
                });
              }
              pieces[pieces.length - 1]!.text += char;
              previous = char;
              column++;
            }
            return pieces
              .map(
                (piece) =>
                  `<tspan fill="${escapeXml(color)}"${fw}${fs}${piece.x === undefined ? "" : ` x="${piece.x}"`}>${escapeXml(piece.text)}</tspan>`,
              )
              .join("");
          })
          .join("");
      }
      const commentAttrs = row.comment ? ' fill-opacity="0.6"' : "";
      const codeMarkup = `<text x="${codeX}" y="${y}" ${fontAttrs}${commentAttrs}>${tspans}</text>`;

      // SVG text has no background, so word-diff highlights are rects laid on
      // the same monospace grid the layout already sizes the card with.
      let highlightMarkup = "";
      let column = 0;
      const rowTop = outerPaddingPx + topPad + i * codeLineHeight;
      for (const { text, highlight } of tokens) {
        if (highlight) {
          const opacity = highlight.opacity < 1 ? ` fill-opacity="${highlight.opacity}"` : "";
          highlightMarkup += `<rect data-word-diff="true" x="${+(codeX + column * codeCharWidth).toFixed(2)}" y="${rowTop}" width="${+(text.length * codeCharWidth).toFixed(2)}" height="${codeLineHeight}" rx="2" fill="${escapeXml(highlight.fill)}"${opacity}/>`;
        }
        column += text.length;
      }

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
              `<text x="${emojiX}" y="${cy}" font-size="13" fill="${escapeXml(editorFg)}" text-anchor="middle" dominant-baseline="central">${escapeXml(chip.emoji)}</text>` +
              avatarsMarkup +
              overflowMarkup +
              `</g>`;
            chipX += chipW + CHIP_INTER_GAP;
            return markup;
          })
          .join("");
      }

      return numMarkup + highlightMarkup + codeMarkup + reactionMarkup;
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
  const sceneCanvasLayers = scene
    ? renderBrandCanvasLayers(scene, totalWidth, totalHeight, viewport)
    : "";
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
      (background.decoration
        ? renderBrandLayers(background.decoration.layers, viewport, fontFamily)
        : "") +
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
    !brandHeader &&
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
    renderHeader && !brandHeader && resolvedHeader.showLanguage && language
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

  const brandHeaderMarkup = brandHeader
    ? renderBrandHeader({
        decoration: brandHeader,
        frame,
        runs: brandHeaderRuns(brandHeader, frame, resolvedHeader, filename, language, chromeColor),
        x: outerPaddingPx,
        y: outerPaddingPx,
        width: actualWidth,
        height: headerHeight,
        cardHeight: actualHeight,
        cardRadius,
        fontSize: codeFontSize,
        fontFamily,
        chromeColor,
        markDataUrl:
          brandHeader === "lumis" && frame?.headerMark
            ? await loadImageDataUrl(frame.headerMark.src)
            : null,
      })
    : "";

  const windowDividerY = outerPaddingPx + (frame?.headerStrip ? 36 : EXPORT_WINDOW_CHROME_HEIGHT);
  const windowDividerMarkup =
    renderedWindowDecoration !== "none" && !brandHeader
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
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${aspectRatio ? EXPORT_CANVAS_16_9.width : totalWidth}" height="${aspectRatio ? EXPORT_CANVAS_16_9.height : totalHeight}" viewBox="${viewport.left} ${viewport.top} ${viewport.width} ${viewport.height}">` +
    metadataMarkup +
    fontStyleBlock +
    avatarPatternsBlock +
    bgSection +
    dotsMarkup +
    windowsControlsMarkup +
    headerMarkup +
    windowDividerMarkup +
    brandHeaderMarkup +
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
  aspectRatio?: ExportAspectRatio | null,
  ligatures?: boolean,
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
    false,
    aspectRatio,
    ligatures,
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
  /** Visible canvas area; the rim outlines it rather than the padded canvas. */
  rim: { left: number; top: number; width: number; height: number },
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
    `<rect data-scene-layer="canvas-rim" x="${rim.left + 0.5}" y="${rim.top + 0.5}" width="${Math.max(0, rim.width - 1)}" height="${Math.max(0, rim.height - 1)}" rx="${scene.canvasRadius}" ry="${scene.canvasRadius}" fill="none" stroke="${escapeXml(scene.canvasBorder)}" stroke-width="1"/>`
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

/** The `lumis` and `markdown` window bars (design spec v5.2), drawn on top
 *  of the card. Nothing is drawn inside the code area. */
function renderBrandHeader({
  decoration,
  frame,
  runs,
  x,
  y,
  width,
  height,
  cardHeight,
  cardRadius,
  fontSize,
  fontFamily,
  chromeColor,
  markDataUrl,
}: {
  decoration: "lumis" | "markdown";
  frame: BrandFramePreset | undefined;
  runs: ReturnType<typeof brandHeaderRuns>;
  x: number;
  y: number;
  width: number;
  height: number;
  cardHeight: number;
  cardRadius: number;
  fontSize: number;
  fontFamily: string;
  chromeColor: string;
  markDataUrl: string | null;
}): string {
  const s = brandHeaderScale(fontSize);
  const midY = y + height / 2;
  const text = (
    run: BrandHeaderRun,
    textX: number,
    size: number,
    anchor: "start" | "end",
    role: string,
  ) =>
    `<text data-brand-header="${role}" x="${+textX.toFixed(2)}" y="${+midY.toFixed(2)}" font-size="${+(size * s).toFixed(2)}" font-family="${escapeXml(fontFamily)}" font-weight="${run.weight}" dominant-baseline="central" text-anchor="${anchor}" fill="${escapeXml(run.color)}"${run.opacity < 1 ? ` fill-opacity="${run.opacity}"` : ""} xml:space="preserve" style="font-variant-ligatures:none">${escapeXml(run.text)}</text>`;
  const border = frame?.headerBorder ?? frame?.cardBorder?.color;
  const divider = `<line data-brand-header="divider" x1="${x}" y1="${y + height - 0.5}" x2="${x + width}" y2="${y + height - 0.5}" stroke="${escapeXml(border ?? chromeColor)}"${border ? "" : ' stroke-opacity="0.12"'} stroke-width="1"/>`;

  if (decoration === "lumis") {
    const { padX, markGap, filenameSize, labelSize, labelGap, dash } = LUMIS_HEADER;
    let left = x + padX * s;
    let markup = "";
    if (markDataUrl && frame?.headerMark) {
      const size = frame.headerMark.size * s;
      const href = escapeXml(markDataUrl);
      markup += `<image data-brand-header="mark" href="${href}" xlink:href="${href}" x="${+left.toFixed(2)}" y="${+(midY - size / 2).toFixed(2)}" width="${+size.toFixed(2)}" height="${+size.toFixed(2)}"/>`;
      left += size + markGap * s;
    }
    if (runs.filename) markup += text(runs.filename, left, filenameSize, "start", "filename");
    const dashesX = x + width - (padX + 3 * dash.width + 2 * dash.gap) * s;
    markup += LUMIS_HEADER_DASHES.map(
      (color, index) =>
        `<rect data-brand-header="dash" x="${+(dashesX + index * (dash.width + dash.gap) * s).toFixed(2)}" y="${+(midY - (dash.height / 2) * s).toFixed(2)}" width="${+(dash.width * s).toFixed(2)}" height="${+(dash.height * s).toFixed(2)}" rx="${+((dash.height / 2) * s).toFixed(2)}" fill="${color}"/>`,
    ).join("");
    if (runs.language)
      markup += text(runs.language, dashesX - labelGap * s, labelSize, "end", "language");
    return markup + divider;
  }

  const { padX, fontSize: size, gap, controls } = MARKDOWN_HEADER;
  const clipId = "brand-header-clip";
  let markup = frame?.headerFill
    ? `<defs><clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${width}" height="${cardHeight}" rx="${cardRadius}" ry="${cardRadius}"/></clipPath></defs>` +
      `<rect data-brand-header="strip" x="${x}" y="${y}" width="${width}" height="${height}" fill="${escapeXml(frame.headerFill)}" clip-path="url(#${clipId})"/>`
    : "";
  let left = x + padX * s;
  if (runs.filename) {
    markup += text(runs.filename, left, size, "start", "filename");
    left += (runs.filename.text.length * MONO_ADVANCE_EM * size + gap) * s;
  }
  if (runs.language) markup += text(runs.language, left, size, "start", "language");
  const muted = runs.language ?? {
    text: "",
    color: frame?.languageLabel?.color ?? chromeColor,
    opacity: frame?.languageLabel ? (frame.languageLabel.opacity ?? 1) : 0.6,
    weight: 400,
  };
  markup += text(
    { ...muted, text: controls, weight: 400 },
    x + width - padX * s,
    size,
    "end",
    "controls",
  );
  // Repaint the card edge the strip covered.
  const outline = frame?.cardBorder
    ? `<rect x="${x}" y="${y}" width="${width}" height="${cardHeight}" rx="${cardRadius}" ry="${cardRadius}" fill="none" stroke="${escapeXml(frame.cardBorder.color)}" stroke-width="${frame.cardBorder.width}"/>`
    : "";
  return markup + divider + outline;
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
