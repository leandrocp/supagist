import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createExportSceneSvg,
  createHighlightedSvg,
  EXPORT_WIDTH,
  type ExportAspectRatio,
  type ExportLayout,
  type ExportRuntime,
} from "@/lib/export-utils";
import { rasterizeSvg } from "@/lib/render-api";
import { findExportBackground, parseSnippetAppearance } from "@/lib/snippet-appearance";
import parsers from "@/supabase/functions/mcp/spike/generated/parser-packages.json";

/**
 * Renders a saved snippet from its live row on the server, with the same
 * export renderer and stored appearance the composer used at publish. The
 * share image (lib/og-render.ts) and, for snippets with no stored PNG (MCP
 * publishes), the list thumbnail come from here.
 */
export type RenderableSnippet = {
  code: string;
  filename: string;
  language: string | null;
  theme: string;
  font_id: string;
  appearance: unknown;
  author: { username: string; avatar_url: string | null } | null;
};

// resvg cannot read woff2, so the server embeds the same faces as TTF: the
// copies the MCP renderer bundles (supabase/functions/mcp/assets).
const TTF = new Map([
  ["/fonts/jetbrains-mono.woff2", "JetBrainsMono-Regular.ttf"],
  ["/fonts/geist-mono.woff2", "GeistMono.ttf"],
  ["/fonts/fira-code.woff2", "FiraCode.ttf"],
  ["/fonts/hack.woff2", "Hack.ttf"],
]);
const FONT_DIR = join(process.cwd(), "supabase/functions/mcp/assets");
// resvg-js cannot draw color emoji fonts, so emoji fall back to monochrome
// Noto Emoji rather than going missing.
const EMOJI_FONT = join(process.cwd(), "assets/og/fonts/NotoEmoji.ttf");
let emojiFace: Promise<string> | null = null;
const PUBLIC_DIR = join(process.cwd(), "public");

/** `?v=` for a live render: changes whenever the row's picture would. */
export function renderVersion(snippet: Omit<RenderableSnippet, "author">): string {
  const key = JSON.stringify([
    snippet.code,
    snippet.filename,
    snippet.language,
    snippet.theme,
    snippet.font_id,
    snippet.appearance,
  ]);
  return createHash("sha256").update(key).digest("hex").slice(0, 12);
}

let highlighter: ExportRuntime["highlighter"] | null = null;

const runtime: ExportRuntime = {
  // Like the browser and the MCP renderer, fetch only the parser a snippet
  // needs, pinned to the installed version and digest. Bundling them all
  // would put this function over Vercel's 250 MB limit.
  get highlighter() {
    highlighter ??= import("@lumis-sh/lumis/client").then(({ createHighlighter }) =>
      createHighlighter({
        languagePackageResolver(packageName: string) {
          const metadata = (parsers as Record<string, unknown>)[packageName];
          if (!metadata) throw new Error(`Unknown parser package: ${packageName}`);
          return `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}`;
        },
        wasmResolver(
          _language: string,
          wasm: { packageName: string; name: string; version: string },
        ) {
          return `https://cdn.jsdelivr.net/npm/${wasm.packageName}@${wasm.version}/${wasm.name}.wasm`;
        },
      }),
    );
    return highlighter;
  },
  async loadFontBase64(file) {
    const name = TTF.get(file);
    if (!name) throw new Error(`No TTF for ${file}`);
    return (await readFile(join(FONT_DIR, name))).toString("base64");
  },
  async loadImageDataUrl(url) {
    try {
      if (url.startsWith("/")) {
        const type = url.endsWith(".svg") ? "image/svg+xml" : "image/png";
        const bytes = await readFile(join(PUBLIC_DIR, url));
        return `data:${type};base64,${bytes.toString("base64")}`;
      }
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.startsWith("image/")) return null;
      return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
    } catch {
      return null;
    }
  },
};

/** resvg reads TTF, not woff2, and needs the emoji face embedded. */
async function forResvg(svg: string): Promise<string> {
  emojiFace ??= readFile(EMOJI_FONT).then(
    (bytes) =>
      `@font-face{font-family:'Noto Emoji';src:url('data:font/ttf;base64,${bytes.toString("base64")}') format('truetype')}`,
  );
  return svg
    .replace("data:font/woff2;base64,", "data:font/ttf;base64,")
    .replace("format('woff2')", "format('truetype')")
    .replace("</style>", `${await emojiFace}</style>`);
}

/**
 * The full canonical render with its canvas, as Save as PNG draws it, at
 * `pixelRatio` (2× by default).
 */
export async function renderSnippetPng(
  snippet: RenderableSnippet,
  { pixelRatio = 2 }: { pixelRatio?: number } = {},
): Promise<Uint8Array> {
  const { svg } = await renderSnippetSvg(snippet);
  const { png } = await rasterizeSvg(svg, pixelRatio);
  return new Uint8Array(png);
}

/**
 * The export as resvg-ready SVG, with where its card is. `aspectRatio`
 * overrides the stored one (the share image asks for the 16:9 render).
 */
export async function renderSnippetSvg(
  snippet: RenderableSnippet,
  options: { aspectRatio?: ExportAspectRatio | null } = {},
): Promise<{ svg: string; layout: ExportLayout }> {
  const appearance = parseSnippetAppearance(snippet.appearance);
  const background = findExportBackground(appearance.background);
  let layout: ExportLayout | null = null;
  const svg = await createHighlightedSvg(
    snippet.code,
    snippet.filename,
    snippet.theme,
    EXPORT_WIDTH,
    undefined,
    background,
    background ? appearance.outerPadding : 0,
    appearance.lineNumbers,
    // `system` names no file to embed, and resvg loads no system fonts; draw
    // it in JetBrains Mono, as the MCP renderer does.
    snippet.font_id === "system" ? "jetbrains" : snippet.font_id,
    snippet.language,
    null,
    false,
    appearance.header.enabled && appearance.header.showFilename,
    appearance.footer.enabled,
    snippet.author?.username ?? null,
    snippet.author?.avatar_url ?? null,
    undefined,
    false,
    undefined,
    appearance.windowDecoration,
    appearance.cornerRadius,
    appearance.innerPadding,
    appearance.header,
    appearance.footer,
    appearance.fontSize,
    false,
    options.aspectRatio === undefined ? appearance.aspectRatio : options.aspectRatio,
    appearance.ligatures,
    { ...runtime, onLayout: (value) => (layout = value) },
  );
  return { svg: await forResvg(svg), layout: layout! };
}

/**
 * The snippet's background (its canvas with no card) at `width`×`height`,
 * resvg-ready; null when the snippet has no background.
 */
export async function renderSnippetSceneSvg(
  snippet: Pick<RenderableSnippet, "appearance" | "font_id">,
  width: number,
  height: number,
): Promise<string | null> {
  const background = findExportBackground(parseSnippetAppearance(snippet.appearance).background);
  if (!background) return null;
  const fontId = snippet.font_id === "system" ? "jetbrains" : snippet.font_id;
  return forResvg(await createExportSceneSvg(background, width, height, fontId, runtime));
}
