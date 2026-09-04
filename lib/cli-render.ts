import {
  addPngTextMetadata,
  createHighlightedSvg,
  EXPORT_METADATA_URL,
  EXPORT_WIDTH,
} from "@/lib/export-utils";
import { installExportAssetLoader, rasterizeSvg } from "@/lib/export-server";
import { resolveAppearanceBackground, type CliAppearance } from "@/lib/cli-appearance";

/** Social cards must be exactly 1200×630 or platforms reject the image. */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export type CliRenderInput = {
  code: string;
  filename: string;
  language: string;
  appearance: CliAppearance;
  authorUsername: string;
  authorAvatarUrl: string | null;
  /** Canonical snippet URL, embedded as SVG metadata and a PNG `Source` chunk. */
  sourceUrl?: string | null;
};

export type CliRenderResult = {
  canonicalPng: Uint8Array;
  ogPng: Uint8Array;
  svg: string;
};

/**
 * Produces the same three assets the browser composer uploads at publish time,
 * from the same `createHighlightedSvg` and the same appearance fields — the
 * only difference is resvg standing in for `<canvas>`.
 *
 * Note the deliberate asymmetries, both copied from the composer: the OG image
 * drops the background and forces line numbers on so the card reads at
 * thumbnail size, and it carries the author's handle/avatar in the footer while
 * the canonical export does not.
 */
export async function renderCliSnippetAssets(input: CliRenderInput): Promise<CliRenderResult> {
  installExportAssetLoader();

  const { appearance } = input;
  const background = resolveAppearanceBackground(appearance);
  const showFilename = appearance.header.enabled && appearance.header.showFilename;
  const sourceUrl = input.sourceUrl ?? null;

  const [canonicalSvg, ogSvg] = await Promise.all([
    createHighlightedSvg(
      input.code,
      input.filename,
      appearance.theme,
      EXPORT_WIDTH,
      undefined,
      background,
      background ? appearance.outerPadding : undefined,
      appearance.lineNumbers,
      appearance.fontId,
      input.language,
      null,
      false,
      showFilename,
      appearance.footer.enabled,
      input.authorUsername,
      input.authorAvatarUrl,
      undefined,
      false,
      sourceUrl,
      appearance.windowDecoration,
      appearance.cornerRadius,
      appearance.innerPadding,
      appearance.header,
      appearance.footer,
      appearance.fontSize,
    ),
    createHighlightedSvg(
      input.code,
      input.filename,
      appearance.theme,
      OG_WIDTH,
      OG_HEIGHT,
      null,
      undefined,
      true,
      appearance.fontId,
      input.language,
      null,
      false,
      showFilename,
      appearance.footer.enabled,
      input.authorUsername,
      input.authorAvatarUrl,
      undefined,
      false,
      sourceUrl,
      appearance.windowDecoration,
      appearance.cornerRadius,
      appearance.innerPadding,
      appearance.header,
      appearance.footer,
      appearance.fontSize,
    ),
  ]);

  const [canonicalPng, ogPng] = await Promise.all([
    rasterizeSvg(canonicalSvg, {
      scale: appearance.pixelRatio,
      width: svgIntrinsicWidth(canonicalSvg, EXPORT_WIDTH),
    }),
    rasterizeSvg(ogSvg, { scale: 1, width: OG_WIDTH }),
  ]);

  const source = sourceUrl || EXPORT_METADATA_URL;

  return {
    canonicalPng: addPngTextMetadata(canonicalPng, "Source", source),
    ogPng: addPngTextMetadata(ogPng, "Source", source),
    svg: canonicalSvg,
  };
}

/**
 * Copies a byte view into a standalone `ArrayBuffer` so it can be handed to
 * `Blob`. A `Uint8Array` may be a window onto a pooled or shared buffer, which
 * `BlobPart` does not accept.
 */
export function toBlobPart(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/**
 * The canonical card's width is content-derived (longest line + padding), so
 * the caller can't know it up front — read it back off the generated markup.
 */
export function svgIntrinsicWidth(svg: string, fallback: number): number {
  const match = /\bwidth="(\d+)"/.exec(svg);
  const parsed = match ? Number.parseInt(match[1], 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
