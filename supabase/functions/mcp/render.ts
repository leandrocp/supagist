import { initWasm, Resvg } from "./spike/generated/vendor/resvg.js";
import { createHighlightedSvg, EXPORT_BRAND_BACKGROUNDS } from "./spike/generated/export-utils.js";
import { BRAND_PRESETS } from "./spike/generated/brand-presets.js";
import { assetBytes } from "./spike/assets.ts";
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

export const supportedLanguages: string[] = [
  "plaintext",
  ...new Set(Object.values(packages).flatMap((metadata) => Object.keys(metadata.languages))),
].sort();
export const supportedThemes: string[] = [
  ...Object.keys(themes),
  ...BRAND_THEMES.map((theme) => theme.id),
].sort();

export type RenderInput = {
  code: string;
  language: string;
  theme: string;
  format: "svg" | "png";
  pixelRatio: 1 | 2;
  fixture?: "plain" | "vercel" | "avatars";
};
export type RenderResult = {
  svg: string;
  png?: Uint8Array;
  bytes: Uint8Array;
  contentType: "image/svg+xml" | "image/png";
  width: number;
  height: number;
  logicalWidth: number;
  logicalHeight: number;
  timings: {
    preloadWallMs: number;
    svgWallMs: number;
    resvgInitWallMs: number;
    rasterWallMs: number;
    totalWallMs: number;
  };
  parserEvents: ParserEvent[];
};

let resvgReady: Promise<void> | undefined;

/** M0 only. Timings are elapsed wall time, never CPU time. No user image URLs. */
export async function renderSnippet(input: RenderInput): Promise<RenderResult> {
  const start = performance.now();
  if (typeof input.code !== "string" || !input.language || !input.theme)
    throw new Error("code, language and theme are required");
  if (!supportedLanguages.includes(input.language))
    throw new Error(`Unsupported language: ${input.language}`);
  if (!supportedThemes.includes(input.theme)) throw new Error(`Unsupported theme: ${input.theme}`);
  if (input.format !== "svg" && input.format !== "png")
    throw new Error("format must be svg or png");
  if (input.pixelRatio !== 1 && input.pixelRatio !== 2)
    throw new Error("pixelRatio must be 1 or 2");
  const fixture = input.fixture ?? "plain";
  if (!["plain", "vercel", "avatars"].includes(fixture)) throw new Error("Unknown M0 fixture");
  const cursor = parserEventCursor();
  const highlighter = await clientHighlighterPromise;
  // Never rely on the app's plaintext fallback. This rejects missing, corrupt,
  // unavailable and unknown parsers BEFORE invoking the copied app renderer.
  await Promise.all([highlighter.loadLanguage(input.language), loadTheme(input.theme)]);
  const preloadEnd = performance.now();
  console.log(
    JSON.stringify({
      event: "parser-preload-complete",
      language: input.language,
      preloadWallMs: preloadEnd - start,
    }),
  );

  const brand =
    fixture === "plain" ? undefined : BRAND_PRESETS.find((preset) => preset.id === "vercel");
  const background = brand
    ? EXPORT_BRAND_BACKGROUNDS.find((preset) => preset.brandId === "vercel")
    : undefined;
  const settings = brand?.settings;
  const avatars = fixture === "avatars";
  const reactions = avatars
    ? {
        3: [
          {
            emoji: "+1",
            reactors: [
              { username: "Ada", avatarUrl: "m0:avatar-1" },
              { username: "Grace", avatarUrl: "m0:avatar-2" },
            ],
          },
        ],
        15: [{ emoji: "+1", reactors: [{ username: "Grace", avatarUrl: "m0:avatar-2" }] }],
        30: [{ emoji: "+1", reactors: [{ username: "Ada", avatarUrl: "m0:avatar-1" }] }],
      }
    : undefined;
  let svg = await createHighlightedSvg(
    input.code,
    "snippet",
    input.theme,
    1200,
    undefined,
    background,
    settings?.outerPadding,
    true,
    "jetbrains",
    input.language,
    reactions,
    avatars,
    true,
    avatars,
    "Ada",
    avatars ? "m0:avatar-1" : undefined,
    undefined,
    false,
    undefined,
    settings?.windowDecoration ?? "macos",
    settings?.cornerRadius,
    settings?.innerPadding ?? 16,
    settings?.header,
    avatars ? undefined : settings?.footer,
    14,
  );
  const dimensions = /<svg\b[^>]* width="([\d.]+)" height="([\d.]+)"/.exec(svg);
  if (!dimensions) throw new Error("App renderer did not emit SVG dimensions");
  const logicalWidth = Number(dimensions[1]);
  const logicalHeight = Number(dimensions[2]);
  const width = Math.round(logicalWidth * input.pixelRatio);
  const height = Math.round(logicalHeight * input.pixelRatio);
  const svgEnd = performance.now();
  let resvgInitWallMs = 0;
  let rasterWallMs = 0;
  let bytes: Uint8Array;
  if (input.format === "png") {
    const initStart = performance.now();
    resvgReady ??= assetBytes("resvg.wasm").then((wasm) => initWasm(wasm));
    await resvgReady;
    const font = await assetBytes("JetBrainsMono-Regular.ttf");
    const rasterStart = performance.now();
    resvgInitWallMs = rasterStart - initStart;
    const renderer = new Resvg(svg, {
      fitTo: { mode: "zoom", value: input.pixelRatio },
      font: {
        fontBuffers: [font],
        defaultFontFamily: "JetBrains Mono",
        monospaceFamily: "JetBrains Mono",
        sansSerifFamily: "JetBrains Mono",
      },
    });
    try {
      const image = renderer.render();
      try {
        if (image.width !== width || image.height !== height)
          throw new Error("Raster dimensions differ from SVG");
        bytes = image.asPng().slice();
      } finally {
        image.free();
      }
    } finally {
      renderer.free();
    }
    rasterWallMs = performance.now() - rasterStart;
  }
  // Scale the viewport, not the viewBox: browser SVG and PNG have equal dimensions.
  svg = svg.replace(
    `width="${logicalWidth}" height="${logicalHeight}"`,
    `width="${width}" height="${height}"`,
  );
  if (input.format === "svg") bytes = new TextEncoder().encode(svg);
  const timings = {
    preloadWallMs: preloadEnd - start,
    svgWallMs: svgEnd - preloadEnd,
    resvgInitWallMs,
    rasterWallMs,
    totalWallMs: performance.now() - start,
  };
  console.log(
    JSON.stringify({
      event: "render-complete",
      format: input.format,
      fixture,
      pixelRatio: input.pixelRatio,
      width,
      height,
      ...timings,
    }),
  );
  return {
    svg,
    png: input.format === "png" ? bytes! : undefined,
    bytes: bytes!,
    contentType: input.format === "png" ? "image/png" : "image/svg+xml",
    width,
    height,
    logicalWidth,
    logicalHeight,
    timings,
    parserEvents: parserEventsSince(cursor),
  };
}
