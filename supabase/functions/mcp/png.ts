import { base64 } from "./spike/assets.ts";

// PNG rasterizes on Vercel Node through the public render API (lib/render-api.ts),
// which re-renders the SVG on Edge and runs native resvg. Edge's CPU budget
// cannot rasterize, so this function only forwards the caller's own token.
const RENDER_API_URL = Deno.env.get("SUPAGIST_RENDER_API_URL") ?? "https://supagist.app/api/render";

export async function renderPng(
  input: Record<string, unknown>,
  authorization: string,
  fetcher: typeof fetch = fetch,
) {
  const { fixture: _fixture, ...fields } = input;
  let response: Response;
  try {
    response = await fetcher(RENDER_API_URL, {
      method: "POST",
      headers: { authorization, "content-type": "application/json" },
      body: JSON.stringify({ ...fields, format: "png", pixelRatio: fields.pixelRatio ?? 2 }),
      signal: AbortSignal.timeout(30_000),
      // Never send the bearer token anywhere else.
      redirect: "error",
    });
  } catch {
    throw new Error("PNG rendering is temporarily unavailable. Try again, or request SVG.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message: string | undefined = body?.error?.message;
    // 400s are the caller's input; 429s are the render API quota for this account.
    if ((response.status === 400 || response.status === 429) && message) throw new Error(message);
    throw new Error("PNG rendering is temporarily unavailable. Try again, or request SVG.");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  return {
    data: base64(bytes),
    width: Number(response.headers.get("x-supagist-width")),
    height: Number(response.headers.get("x-supagist-height")),
    bytes: bytes.length,
  };
}
