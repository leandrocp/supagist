/**
 * Server half of the per-snippet share image: renders the snippet with the
 * export renderer (the same picture Save as PNG downloads), fits it into the
 * 1200×630 frame on its own background, and adds the Supagist footer band.
 * Where things go is decided by `ogLayout` (lib/og-image.ts).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { loadTheme } from "@/lib/theme-loader";
import { PngTooLargeError, rasterizeSvg } from "@/lib/render-api";
import { findExportBackground, parseSnippetAppearance } from "@/lib/snippet-appearance";
import { renderSnippetPng, type RenderableSnippet } from "@/lib/snippet-render";
import { normalizeSnippetCode } from "@/lib/snippet-utils";
import { OG_BAND, OG_SIZE, ogLayout, type OgLayout } from "@/lib/og-image";

const ASSETS = join(process.cwd(), "assets", "og");

/**
 * WhatsApp asks for under 600 KB and in practice drops large previews well
 * before that; every other platform allows megabytes. PNG keeps code crisp,
 * so it is used whenever it fits; a busy background falls back to JPEG.
 */
export const OG_MAX_BYTES = 280 * 1024;

export type OgSnippet = RenderableSnippet & { visibility: "public" | "unlisted" };

export type OgImage = {
  body: Uint8Array;
  type: "image/png" | "image/jpeg";
  layout: OgLayout;
};

let bandAssets: Promise<{ font: string; seal: string; sealDark: string }> | null = null;

function loadBandAssets() {
  bandAssets ??= Promise.all([
    readFile(join(ASSETS, "fonts", "IBMPlexMono-Medium-latin.ttf")),
    readFile(join(ASSETS, "seal-flat-c.svg")),
    readFile(join(ASSETS, "seal-flat-c-dark.svg")),
  ]).then(([font, seal, sealDark]) => ({
    font: font.toString("base64"),
    seal: seal.toString("base64"),
    sealDark: sealDark.toString("base64"),
  }));
  bandAssets.catch(() => (bandAssets = null));
  return bandAssets;
}

const escapeXml = (text: string) => text.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Supagist Paper and Night ink (assets/brand/brand.md §3). */
const INK = { light: "#1C1A17", dark: "#F1E9DA" } as const;

type Label = { text: string; x: number; anchor: "start" | "end"; dark: boolean; opacity: number };

/** The band as an SVG over the frame: the seal and `supagist.app`, then the handle. */
async function bandSvg(brand: Label, right: Label | null): Promise<string> {
  const assets = await loadBandAssets();
  const { height, seal, fontSize } = OG_BAND;
  const middle = OG_SIZE.height - height / 2;
  const baseline = middle + fontSize * 0.36;
  const text = (label: Label, x: number) =>
    `<text x="${x}" y="${baseline}" text-anchor="${label.anchor}" font-family="Plex Mono" font-size="${fontSize}" fill="${label.dark ? INK.dark : INK.light}" fill-opacity="${label.opacity}">${escapeXml(label.text)}</text>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_SIZE.width}" height="${OG_SIZE.height}">` +
    `<style>@font-face{font-family:'Plex Mono';src:url('data:font/ttf;base64,${assets.font}') format('truetype')}</style>` +
    `<image href="data:image/svg+xml;base64,${brand.dark ? assets.sealDark : assets.seal}" x="${brand.x}" y="${middle - seal / 2}" width="${seal}" height="${seal}"/>` +
    text(brand, brand.x + seal + 8) +
    (right ? text(right, right.x) : "") +
    `</svg>`
  );
}

/** Whether the frame is dark under a band label, from the composed pixels. */
async function darkUnder(frame: Buffer, left: number, width: number): Promise<boolean> {
  const region = await sharp(frame)
    .extract({
      left: Math.max(0, Math.round(left)),
      top: OG_SIZE.height - OG_BAND.height,
      width: Math.round(Math.min(width, OG_SIZE.width - left)),
      height: OG_BAND.height,
    })
    .toBuffer();
  // stats() reads the input, not the extract, so measure the cut-out itself.
  const { channels } = await sharp(region).stats();
  const [r, g, b] = channels.map((c) => c.mean);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 140;
}

/** The export render, at 2× unless that is too large to rasterize. */
async function renderExport(
  snippet: RenderableSnippet,
): Promise<{ png: Uint8Array; ratio: number }> {
  try {
    return { png: await renderSnippetPng(snippet, { pixelRatio: 2 }), ratio: 2 };
  } catch (error) {
    if (!(error instanceof PngTooLargeError)) throw error;
    return { png: await renderSnippetPng(snippet, { pixelRatio: 1 }), ratio: 1 };
  }
}

/**
 * The share image. Unlisted snippets leave the author out of third-party
 * caches: no handle in the band and none in the render's footer.
 */
export async function renderOgImage(snippet: OgSnippet): Promise<OgImage> {
  const unlisted = snippet.visibility === "unlisted";
  const appearance = parseSnippetAppearance(snippet.appearance);
  const background = findExportBackground(appearance.background);
  const { png, ratio } = await renderExport({
    ...snippet,
    // The saved view and its Export show the trimmed code.
    code: normalizeSnippetCode(snippet.code),
    author: unlisted ? null : snippet.author,
    // Without an author the footer would read "@you"; leave the item out.
    appearance: unlisted
      ? { ...appearance, footer: { ...appearance.footer, showAuthor: false } }
      : appearance,
  });
  const meta = await sharp(png).metadata();
  const layout = ogLayout({
    width: meta.width!,
    height: meta.height!,
    // With a background, the canvas margin is the render's own edge.
    padding: background ? appearance.outerPadding * ratio : 0,
  });

  // The rest of the frame: the render's own edge pixels (its background)
  // carried out to the frame and softened, so it reads as one picture; for
  // a card with no background, the editor colour.
  const frame = OG_SIZE;
  const fitted = await sharp(png)
    .extract(layout.crop)
    .resize(layout.width, layout.height)
    .png()
    .toBuffer();
  const margins = {
    top: layout.top,
    bottom: frame.height - layout.top - layout.height,
    left: layout.left,
    right: frame.width - layout.left - layout.width,
  };
  const backdrop = background
    ? await sharp(
        await sharp(fitted)
          .extend({ ...margins, extendWith: "copy" })
          .png()
          .toBuffer(),
      )
        .blur(12)
        .png()
        .toBuffer()
    : await sharp({
        create: {
          ...frame,
          channels: 3,
          background:
            (await loadTheme(snippet.theme).catch(() => null))?.data.highlights?.normal?.bg ??
            "#000000",
        },
      })
        .png()
        .toBuffer();

  const composed = await sharp(backdrop)
    .composite([{ input: fitted, left: layout.left, top: layout.top }])
    .png()
    .toBuffer();

  // On a wide render the band lines up with its edges; on a narrow one, the
  // frame's. Each label's ink comes from what is actually under it.
  const wide = layout.width >= frame.width / 2;
  const start = (wide ? layout.left : 0) + OG_BAND.inset;
  const end = (wide ? layout.left + layout.width : frame.width) - OG_BAND.inset;
  const handle = unlisted ? "unlisted" : snippet.author ? `@${snippet.author.username}` : null;
  const labelWidth = (text: string) => text.length * OG_BAND.fontSize * 0.6;
  const brandWidth = OG_BAND.seal + 8 + labelWidth("supagist.app");
  const band = await bandSvg(
    {
      text: "supagist.app",
      x: start,
      anchor: "start",
      dark: await darkUnder(composed, start, brandWidth),
      opacity: 0.88,
    },
    handle
      ? {
          text: handle,
          x: end,
          anchor: "end",
          dark: await darkUnder(composed, end - labelWidth(handle), labelWidth(handle)),
          opacity: 0.7,
        }
      : null,
  );
  const bandPng = (await rasterizeSvg(band, 1)).png;

  const flat = sharp(composed)
    .composite([{ input: Buffer.from(bandPng) }])
    .removeAlpha();
  const asPng = await flat.clone().png({ compressionLevel: 9 }).toBuffer();
  if (asPng.byteLength <= OG_MAX_BYTES) {
    return { body: new Uint8Array(asPng), type: "image/png", layout };
  }
  let jpeg = Buffer.alloc(0);
  for (const quality of [90, 84, 76]) {
    jpeg = await flat
      .clone()
      .jpeg({ quality, mozjpeg: true, chromaSubsampling: "4:4:4" })
      .toBuffer();
    if (jpeg.byteLength <= OG_MAX_BYTES) break;
  }
  return { body: new Uint8Array(jpeg), type: "image/jpeg", layout };
}
