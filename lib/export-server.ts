import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { Resvg } from "@resvg/resvg-js";
import { decompress } from "wawoff2";
import { createHighlighter } from "@lumis-sh/lumis/client";
import { bundledLanguages } from "@lumis-sh/lumis/bundles/full";
import {
  EXPORT_FONTS,
  setExportAssetLoader,
  setExportHighlighterProvider,
  type ExportHighlighter,
} from "@/lib/export-utils";

/**
 * Server-side half of the export pipeline.
 *
 * The browser renders snippet assets with Lumis WASM plus a `<canvas>`; the CLI
 * has no DOM, so `POST /api/cli/publish` runs the same `createHighlightedSvg`
 * here and rasterises with resvg. Two things have to be bridged:
 *
 * 1. `createHighlightedSvg` loads `/fonts/*` and `/brands/*` with `fetch`,
 *    which has no origin to resolve against on the server. We install an asset
 *    loader that reads those same files out of `public/` instead.
 * 2. resvg cannot read woff2 at all — neither via a `@font-face` data URL nor
 *    via `fontFiles` (both render zero glyphs). The embedded `@font-face` block
 *    is therefore inert during rasterisation, and we decompress each woff2 to a
 *    real sfnt once per process so resvg has something to match on.
 */

const PUBLIC_DIR = join(process.cwd(), "public");
// Statically scoped so the bundler's filesystem tracing stays narrow instead of
// pulling the whole project into the deployment.
const FONTS_DIR = join(process.cwd(), "public", "fonts");

// Kept small and explicit rather than pulling in a mime database: these are the
// only asset types the export pipeline ever loads from `public/`.
const CONTENT_TYPES: Record<string, string> = {
  woff2: "font/woff2",
  png: "image/png",
  svg: "image/svg+xml",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

function contentTypeFor(path: string): string {
  const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}

/**
 * Rejects anything that could escape `public/`, returning the path relative to
 * it. Paths come from our own registries today, but this stays a hard boundary
 * because the loader is reachable from a request-scoped render.
 */
export function safePublicRelativePath(assetPath: string): string | null {
  if (!assetPath.startsWith("/") || assetPath.includes("..") || assetPath.includes("\0")) {
    return null;
  }
  const relative = assetPath.slice(1);
  if (relative.length === 0) return null;
  return join(PUBLIC_DIR, assetPath).startsWith(`${PUBLIC_DIR}/`) ? relative : null;
}

/**
 * Node highlighter for the export pipeline.
 *
 * `lib/lumis-client.ts` builds its bundle with `withWasmBundle`, where each
 * parser is a `new URL(..., import.meta.url)` the runtime fetches — that is a
 * `file://` URL under Node, which `fetch` refuses. The prebuilt `bundles/full`
 * entry resolves its parsers itself and works in both runtimes, so the server
 * uses that. Created once per process, like the saved-snippet renderer.
 */
const serverHighlighterPromise: Promise<ExportHighlighter> = createHighlighter({
  languages: [bundledLanguages],
}) as unknown as Promise<ExportHighlighter>;

/**
 * Reads a root-relative export asset out of `public/`. Returns null for
 * anything outside that directory or missing, so a render degrades rather than
 * throwing.
 */
export async function readPublicAsset(
  assetPath: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const relative = safePublicRelativePath(assetPath);
  if (relative === null) return null;
  try {
    // Joined inline against a statically-known root so the bundler's
    // filesystem tracing stays scoped to `public/`.
    const bytes = await readFile(join(process.cwd(), "public", relative));
    return { bytes: new Uint8Array(bytes), contentType: contentTypeFor(assetPath) };
  } catch {
    return null;
  }
}

let exportServerInstalled = false;

/**
 * Idempotently swaps the export pipeline's two browser-only seams — asset
 * `fetch` and the WASM highlighter — for their Node equivalents.
 */
export function installExportAssetLoader() {
  if (exportServerInstalled) return;
  exportServerInstalled = true;

  setExportAssetLoader(readPublicAsset);
  setExportHighlighterProvider(() => serverHighlighterPromise);
}

let fontFilesPromise: Promise<string[]> | null = null;

/**
 * Decompresses every bundled export woff2 into `sfnt` files resvg can load.
 * Cached per process; a font that fails to convert is skipped so one bad file
 * degrades to a fallback family instead of failing the whole render.
 */
export function loadExportFontFiles(): Promise<string[]> {
  if (!fontFilesPromise) {
    fontFilesPromise = (async () => {
      const outputDir = join(tmpdir(), "supagist-fonts");
      await mkdir(outputDir, { recursive: true });

      const converted = await Promise.all(
        EXPORT_FONTS.filter((font) => font.file).map(async (font) => {
          const source = join(FONTS_DIR, basename(font.file));
          const target = join(outputDir, `${font.id}.ttf`);
          try {
            // Reuse an already-converted file from a previous invocation on the
            // same warm instance rather than paying the decompress again.
            await readFile(target);
            return target;
          } catch {
            // Not converted yet — fall through and build it.
          }
          try {
            const sfnt = Buffer.from(await decompress(await readFile(source)));
            await writeFile(target, sfnt);
            return target;
          } catch {
            return null;
          }
        }),
      );

      return converted.filter((path): path is string => path !== null);
    })();
  }
  return fontFilesPromise;
}

export type RasterizeOptions = {
  /** Device pixel ratio. The OG image uses 1; canonical exports use 2/4/6. */
  scale: number;
  /** Intrinsic SVG width in CSS pixels, used to derive the output width. */
  width: number;
};

/**
 * Rasterises an export SVG to PNG bytes at `scale`× its intrinsic size.
 *
 * `defaultFontFamily`/`monospaceFamily` both point at JetBrains Mono so the
 * "System" font option — whose family is the CSS stack
 * `ui-monospace,SFMono-Regular,Menlo,…,monospace` — resolves to a real face
 * instead of rendering nothing. System fonts are deliberately not loaded: a
 * serverless filesystem has none, and enabling the scan only adds cold-start
 * latency for a lookup that always misses.
 */
export async function rasterizeSvg(svg: string, options: RasterizeOptions): Promise<Uint8Array> {
  const fontFiles = await loadExportFontFiles();

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: Math.ceil(options.width * options.scale) },
    font: {
      loadSystemFonts: false,
      fontFiles,
      defaultFontFamily: "JetBrains Mono",
      monospaceFamily: "JetBrains Mono",
      sansSerifFamily: "JetBrains Mono",
      serifFamily: "JetBrains Mono",
    },
  });

  return new Uint8Array(resvg.render().asPng());
}
