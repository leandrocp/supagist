import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// supagist.app/api/{render,options}: the public render API behind the CLI (#7).
// SVG rendering, validation and rate limits live in the `render` Edge Function;
// this layer forwards to it and rasterizes PNG on Vercel Node, where native
// resvg fits (Edge's CPU budget does not).

export const MAX_BODY_BYTES = 256 * 1024;
export const PNG_PIXEL_RATIOS = [1, 2, 4, 6];
export const DEFAULT_PNG_PIXEL_RATIO = 2;
const MAX_PNG_PIXELS = 16_000_000;

export function apiError(status: number, code: string, message: string, headers?: HeadersInit) {
  const response = Response.json({ error: { code, message } }, { status, headers });
  response.headers.set("cache-control", "no-store");
  return response;
}

/** Calls the Edge Function on behalf of the CLI request, passing its identity. */
export async function callRenderFunction(
  request: Request,
  path: "" | "/options",
  init: { method: "GET" | "POST"; body?: string },
): Promise<Response> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return apiError(503, "UNAVAILABLE", "Rendering is unavailable.");
  const headers = new Headers({ "content-type": "application/json" });
  for (const name of ["authorization", "user-agent"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Vercel overwrites x-vercel-forwarded-for at ingress; the OIDC token proves
  // to the function that this deployment, not the caller, supplied the IP.
  if (process.env.VERCEL === "1") {
    const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim();
    const token = request.headers.get("x-vercel-oidc-token") ?? process.env.VERCEL_OIDC_TOKEN;
    if (ip && token) {
      headers.set("x-supagist-client-ip", ip);
      headers.set("x-supagist-proxy-token", token);
    }
  }
  try {
    return await fetch(new URL(`/functions/v1/render${path}`, supabaseUrl), {
      method: init.method,
      headers,
      body: init.body,
      signal: request.signal,
      cache: "no-store",
      // Never redirect bearer credentials to a different endpoint.
      redirect: "error",
    });
  } catch {
    return apiError(502, "UPSTREAM_UNAVAILABLE", "Rendering is temporarily unavailable.");
  }
}

/** Copies an upstream response, keeping only the headers the CLI relies on. */
export function relay(upstream: Response, body: BodyInit | null = upstream.body) {
  const headers = new Headers({ "cache-control": "no-store" });
  for (const name of [
    "content-type",
    "retry-after",
    "allow",
    "x-supagist-width",
    "x-supagist-height",
  ]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(body, { status: upstream.status, headers });
}

export class PngTooLargeError extends Error {}

/**
 * Rasterizes a Supagist SVG. resvg ignores CSS @font-face data URLs, so the
 * embedded TTFs are handed to it as files, as the skill's local converter does.
 */
export async function rasterizeSvg(svg: string, pixelRatio: number) {
  const { Resvg } = await import("@resvg/resvg-js");
  const styleStart = svg.indexOf("<style>");
  const style = styleStart === -1 ? "" : svg.slice(styleStart, svg.indexOf("</style>", styleStart));
  const family = style.split("@font-face{font-family:'")[1]?.split("'")[0] ?? "JetBrains Mono";
  const marker = "data:font/ttf;base64,";
  const directory = await mkdtemp(join(tmpdir(), "supagist-fonts-"));
  try {
    const fontFiles: string[] = [];
    for (let at = style.indexOf(marker); at !== -1; at = style.indexOf(marker, at + 1)) {
      const start = at + marker.length;
      const path = join(directory, `${fontFiles.length}.ttf`);
      await writeFile(path, Buffer.from(style.slice(start, style.indexOf("'", start)), "base64"));
      fontFiles.push(path);
    }
    const renderer = new Resvg(svg, {
      fitTo: { mode: "zoom", value: pixelRatio },
      font: {
        fontFiles,
        loadSystemFonts: false,
        defaultFontFamily: family,
        monospaceFamily: family,
        sansSerifFamily: family,
      },
    });
    const width = Math.round(renderer.width * pixelRatio);
    const height = Math.round(renderer.height * pixelRatio);
    if (width * height > MAX_PNG_PIXELS) {
      throw new PngTooLargeError(
        `A ${width}×${height} PNG exceeds 16 million pixels; use a lower pixelRatio or SVG.`,
      );
    }
    const image = renderer.render();
    return { png: image.asPng(), width: image.width, height: image.height };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
