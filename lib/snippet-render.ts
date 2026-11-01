import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHighlightedSvg, EXPORT_WIDTH, type ExportRuntime } from "@/lib/export-utils";
import { rasterizeSvg } from "@/lib/render-api";
import { findExportBackground, parseSnippetAppearance } from "@/lib/snippet-appearance";

/**
 * Renders a saved snippet from its live row on the server, with the same
 * export renderer and stored appearance the composer used at publish. An edit
 * drops the publish-time images, and an MCP publish stores no PNG, so the
 * share card and the list thumbnail of those snippets come from here.
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
const PUBLIC_DIR = join(process.cwd(), "public");

let highlighter: ExportRuntime["highlighter"] | null = null;

const runtime: ExportRuntime = {
  // The Node entry reads parsers from the installed @lumis-sh/wasm-* packages.
  // Loaded on first render, so importing renderVersion stays light.
  get highlighter() {
    highlighter ??= Promise.all([
      import("@lumis-sh/lumis"),
      import("@lumis-sh/lumis/bundles/full"),
    ]).then(([{ createHighlighter }, { bundledLanguages }]) =>
      createHighlighter({ languages: [bundledLanguages] }),
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

/**
 * At 2×. `card`: the card alone, as publish stores card.png for the share
 * image. Otherwise the full canonical render with its canvas.
 */
export async function renderSnippetPng(
  snippet: RenderableSnippet,
  { card }: { card: boolean },
): Promise<Uint8Array> {
  const appearance = parseSnippetAppearance(snippet.appearance);
  const background = card ? null : findExportBackground(appearance.background);
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
    card ? null : appearance.aspectRatio,
    appearance.ligatures,
    runtime,
  );
  const ttf = svg
    .replace("data:font/woff2;base64,", "data:font/ttf;base64,")
    .replace("format('woff2')", "format('truetype')");
  const { png } = await rasterizeSvg(ttf, 2);
  return new Uint8Array(png);
}
