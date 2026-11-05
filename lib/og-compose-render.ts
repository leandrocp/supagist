/**
 * Pixels for the public share image (OG spec v2.1). The snippet is rendered
 * with the export renderer (lib/snippet-render.ts), placed by `ogFit`, and
 * marked per `planOgMarks` (lib/og-compose.ts). Encoded as JPEG q90
 * progressive.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { rasterizeSvg } from "@/lib/render-api";
import { loadTheme } from "@/lib/theme-loader";
import { findExportBackground, parseSnippetAppearance } from "@/lib/snippet-appearance";
import {
  renderSnippetSceneSvg,
  renderSnippetSvg,
  type RenderableSnippet,
} from "@/lib/snippet-render";
import { normalizeSnippetCode } from "@/lib/snippet-utils";
import {
  OG_COLORS,
  OG_FRAME,
  OG_MARKS,
  ogFit,
  ogSource,
  planOgMarks,
  sampleCorner,
  type OgFit,
  type OgMarksPlan,
  type Rgb,
  type SealVariant,
  type WordmarkVariant,
} from "@/lib/og-compose";

// Literal paths, so file tracing ships these files and not the whole logo kit.
const cwd = process.cwd();
const PLEX_MONO = join(cwd, "assets/og/fonts/IBMPlexMono-Medium-latin.ttf");
const SEAL_FILES: Record<SealVariant, string> = {
  flat: join(cwd, "assets/brand/logo/mark/seal-flat-c.svg"),
  "flat-dark": join(cwd, "assets/brand/logo/mark/seal-flat-c-dark.svg"),
  "mono-white": join(cwd, "assets/brand/logo/mono/seal-c-white.svg"),
  "mono-ink": join(cwd, "assets/brand/logo/mono/seal-c-ink.svg"),
};
const WORDMARK_FILES: Record<WordmarkVariant, string> = {
  ink: join(cwd, "assets/brand/logo/wordmark/wordmark.svg"),
  dark: join(cwd, "assets/brand/logo/wordmark/wordmark-dark.svg"),
  white: join(cwd, "assets/brand/logo/wordmark/wordmark-white.svg"),
};

/** The §6.6 log fields, plus what was decided. */
export type OgMetrics = {
  export_px_area_pct: number;
  code_font_px_in_frame: number;
  band_style: string;
  pool_alpha: { lockup: number; url: number | null };
  jpeg_kb: number;
  source: string;
  scale: number;
  url_dropped: boolean;
  lockup_corner: "left" | "right";
  seal: SealVariant;
};

export type ShareImage = { jpeg: Buffer; metrics: OgMetrics };

const svgDataUrl = async (file: string) =>
  `data:image/svg+xml;base64,${(await readFile(file)).toString("base64")}`;

let plexMono: Promise<string> | null = null;

const rgb = ([r, g, b]: Rgb) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Plex Mono Medium's cap height, for centring the url on the mark line. */
const PLEX_CAP_EM = 0.698;
/** The wordmark viewBox is 200 units tall with its baseline 144 down (cap top at 0). */
const WORDMARK_BASELINE = 144 / 200;

/** Seal, wordmark, url and their scrim pools, as one frame-sized SVG. */
async function marksSvg(plan: OgMarksPlan): Promise<string> {
  const { inset, centerY, seal, wordmark, gap, urlFontSize } = OG_MARKS;
  const { width: W, height: H } = OG_FRAME;
  const lockupWidth = seal + gap + wordmark.width;
  const lockupLeft = plan.lockup.corner === "left" ? inset : W - inset - lockupWidth;
  const capHeight = wordmark.height * WORDMARK_BASELINE;
  const wordmarkTop = centerY - capHeight / 2;
  const urlWidth = "supagist.app".length * urlFontSize * 0.6 + 11 * urlFontSize * 0.01;

  const pools: string[] = [];
  const pool = (id: string, cx: number, halfWidth: number, alpha: number, tone: Rgb) => {
    if (alpha <= 0) return;
    pools.push(
      `<radialGradient id="${id}"><stop offset="0" stop-color="${rgb(tone)}" stop-opacity="${alpha}"/><stop offset="0.55" stop-color="${rgb(tone)}" stop-opacity="${alpha}"/><stop offset="1" stop-color="${rgb(tone)}" stop-opacity="0"/></radialGradient>` +
        `<ellipse cx="${round2(cx)}" cy="${centerY}" rx="${round2((halfWidth + 8) / 0.55)}" ry="${round2((seal / 2 + 4) / 0.55)}" fill="url(#${id})"/>`,
    );
  };
  pool(
    "pool-lockup",
    lockupLeft + lockupWidth / 2,
    lockupWidth / 2,
    plan.lockup.alpha,
    plan.lockup.tone,
  );
  if (plan.url)
    pool("pool-url", W - inset - urlWidth / 2, urlWidth / 2, plan.url.alpha, plan.url.tone);

  plexMono ??= readFile(PLEX_MONO).then((bytes) => bytes.toString("base64"));
  plexMono.catch(() => (plexMono = null));
  const [sealHref, wordmarkHref, font] = await Promise.all([
    svgDataUrl(SEAL_FILES[plan.lockup.seal]),
    svgDataUrl(WORDMARK_FILES[plan.lockup.wordmark]),
    plan.url ? plexMono : Promise.resolve(""),
  ]);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    (plan.url
      ? `<style>@font-face{font-family:'IBM Plex Mono';font-weight:500;src:url('data:font/ttf;base64,${font}') format('truetype')}</style>`
      : "") +
    pools.join("") +
    `<image href="${sealHref}" x="${lockupLeft}" y="${centerY - seal / 2}" width="${seal}" height="${seal}"/>` +
    `<image href="${wordmarkHref}" x="${round2(lockupLeft + seal + gap)}" y="${round2(wordmarkTop)}" width="${wordmark.width}" height="${wordmark.height}"/>` +
    (plan.url
      ? `<text x="${W - inset}" y="${round2(centerY + (urlFontSize * PLEX_CAP_EM) / 2)}" text-anchor="end" font-family="IBM Plex Mono" font-weight="500" font-size="${urlFontSize}" letter-spacing="${urlFontSize * 0.01}" fill="${plan.url.ink}">supagist.app</text>`
      : "") +
    `</svg>`
  );
}

/** Multiplies the alpha of an RGBA raster by a linear ramp on each feathered edge. */
function feather(pixels: Buffer, width: number, height: number, edges: OgFit["feather"]) {
  const ramp = (distance: number, size: number) =>
    size <= 0 ? 1 : Math.min(1, Math.max(0, (distance + 0.5) / size));
  for (let y = 0; y < height; y++) {
    const vertical = Math.min(ramp(y, edges.top), ramp(height - 1 - y, edges.bottom));
    for (let x = 0; x < width; x++) {
      const factor = Math.min(vertical, ramp(x, edges.left), ramp(width - 1 - x, edges.right));
      if (factor < 1)
        pixels[(y * width + x) * 4 + 3] = Math.round(pixels[(y * width + x) * 4 + 3]! * factor);
    }
  }
}

/** The render, scaled and feathered, cropped to the part inside the frame. */
async function placedRender(svg: string, fit: OgFit) {
  const { png } = await rasterizeSvg(svg, fit.scale);
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  feather(data, info.width, info.height, fit.feather);
  const left = Math.round(fit.canvas.left);
  const top = Math.round(fit.canvas.top);
  const crop = {
    left: Math.max(0, -left),
    top: Math.max(0, -top),
    width: Math.min(info.width, OG_FRAME.width - left) - Math.max(0, -left),
    height: Math.min(info.height, OG_FRAME.height - top) - Math.max(0, -top),
  };
  const input = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract(crop)
    .png()
    .toBuffer();
  return { input, left: Math.max(0, left), top: Math.max(0, top) };
}

/** What the render sits on when it doesn't cover the frame. */
async function ground(
  snippet: RenderableSnippet,
  source: ReturnType<typeof ogSource>,
): Promise<Buffer> {
  if (source !== "transparent") {
    const scene = await renderSnippetSceneSvg(snippet, OG_FRAME.width, OG_FRAME.height);
    if (scene) return Buffer.from((await rasterizeSvg(scene, 1)).png);
  }
  // No canvas: the brand ground of the opposite polarity to the card (§3a.5).
  const dark = (await loadTheme(snippet.theme)).data.appearance === "dark";
  return sharp({
    create: {
      ...OG_FRAME,
      channels: 3,
      background: dark ? OG_COLORS.paper : OG_COLORS.night,
    },
  })
    .png()
    .toBuffer();
}

/** The public share image for `snippet`, with its §6.6 log fields. */
export async function renderShareImage(snippet: RenderableSnippet): Promise<ShareImage> {
  const appearance = parseSnippetAppearance(snippet.appearance);
  const background = findExportBackground(appearance.background);
  const source = ogSource(Boolean(background), appearance.outerPadding);
  const renderable = { ...snippet, code: normalizeSnippetCode(snippet.code) };
  // §3a: the engine's own 16:9 render for a snippet with a canvas; the auto
  // export for a bare card or one with no background.
  const { svg, layout } = await renderSnippetSvg(renderable, {
    aspectRatio: source === "scene" ? "16:9" : null,
  });
  const fit = ogFit(layout, source);

  const placed = await placedRender(svg, fit);
  const base = fit.covers
    ? await sharp({ create: { ...OG_FRAME, channels: 3, background: "#000000" } })
        .png()
        .toBuffer()
    : await ground(renderable, source);
  const composed = await sharp(base)
    .composite([{ input: placed.input, left: placed.left, top: placed.top }])
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { zoneWidth, sampleTop, sampleBottom } = OG_MARKS;
  const region = (left: number) => ({
    left,
    top: sampleTop,
    width: zoneWidth,
    height: sampleBottom - sampleTop,
  });
  const channels = composed.info.channels;
  const plan = planOgMarks(
    sampleCorner(composed.data, OG_FRAME.width, channels, region(0)),
    sampleCorner(composed.data, OG_FRAME.width, channels, region(OG_FRAME.width - zoneWidth)),
  );
  const marks = await rasterizeSvg(await marksSvg(plan), 1);

  const jpeg = await sharp(composed.data, {
    raw: { width: OG_FRAME.width, height: OG_FRAME.height, channels },
  })
    .composite([{ input: Buffer.from(marks.png) }])
    .jpeg({ quality: 90, progressive: true, chromaSubsampling: "4:4:4" })
    .toBuffer();

  const fill = fit.covers ? "" : source === "transparent" ? " on brand ground" : " on scene";
  return {
    jpeg,
    metrics: {
      export_px_area_pct: round2(fit.exportAreaPct),
      code_font_px_in_frame: round2(fit.codeFontPx),
      band_style: `corners, ${fit.layout}${fill}`,
      pool_alpha: { lockup: plan.lockup.alpha, url: plan.url?.alpha ?? null },
      jpeg_kb: round2(jpeg.byteLength / 1024),
      source,
      scale: Math.round(fit.scale * 1000) / 1000,
      url_dropped: plan.url === null,
      lockup_corner: plan.lockup.corner,
      seal: plan.lockup.seal,
    },
  };
}
