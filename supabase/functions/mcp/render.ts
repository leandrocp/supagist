import { createHighlightedSvg, EXPORT_BRAND_BACKGROUNDS } from "./spike/generated/export-utils.js";
import { BRAND_PRESETS } from "./spike/generated/brand-presets.js";
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
  format: "svg";
  pixelRatio: 1 | 2;
  fixture?: "plain" | "vercel" | "avatars";
};
export type RenderResult = {
  svg: string;
  bytes: Uint8Array;
  contentType: "image/svg+xml";
  width: number;
  height: number;
  logicalWidth: number;
  logicalHeight: number;
  timings: {
    preloadWallMs: number;
    svgWallMs: number;
    totalWallMs: number;
  };
  parserEvents: ParserEvent[];
};

/** M0 only. Timings are elapsed wall time, never CPU time. No user image URLs. */
export async function renderSnippet(input: RenderInput): Promise<RenderResult> {
  const start = performance.now();
  if (typeof input.code !== "string" || !input.language || !input.theme)
    throw new Error("code, language and theme are required");
  if (!supportedLanguages.includes(input.language))
    throw new Error(`Unsupported language: ${input.language}`);
  if (!supportedThemes.includes(input.theme)) throw new Error(`Unsupported theme: ${input.theme}`);
  if (input.format !== "svg") throw new Error("Only SVG is supported; convert to PNG locally");
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
  // Scale the viewport, not the viewBox; rasterization belongs to the client.
  svg = svg.replace(
    `width="${logicalWidth}" height="${logicalHeight}"`,
    `width="${width}" height="${height}"`,
  );
  const bytes = new TextEncoder().encode(svg);
  const timings = {
    preloadWallMs: preloadEnd - start,
    svgWallMs: svgEnd - preloadEnd,
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
    bytes,
    contentType: "image/svg+xml",
    width,
    height,
    logicalWidth,
    logicalHeight,
    timings,
    parserEvents: parserEventsSince(cursor),
  };
}
