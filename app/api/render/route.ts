import {
  DEFAULT_PNG_PIXEL_RATIO,
  MAX_BODY_BYTES,
  PNG_PIXEL_RATIOS,
  PngTooLargeError,
  apiError,
  callRenderFunction,
  rasterizeSvg,
  relay,
} from "@/lib/render-api";

// Renders only: nothing is published, stored or shared. The Edge Function
// validates input and charges rate limits before any SVG or PNG is produced.
export async function POST(request: Request) {
  const body = await request.text();
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
    return apiError(413, "PAYLOAD_TOO_LARGE", "Request body exceeds 256 KB.");
  }
  let input: unknown;
  try {
    input = JSON.parse(body);
  } catch {
    // Let the function reject it, so malformed requests are charged like any other.
    return relay(await callRenderFunction(request, "", { method: "POST", body }));
  }
  const fields = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  if (fields.format !== "png") {
    return relay(await callRenderFunction(request, "", { method: "POST", body }));
  }

  const { format: _format, pixelRatio = DEFAULT_PNG_PIXEL_RATIO, ...svgInput } = fields;
  if (typeof pixelRatio !== "number" || !PNG_PIXEL_RATIOS.includes(pixelRatio)) {
    return apiError(
      400,
      "INVALID_INPUT",
      `pixelRatio: PNG supports ${PNG_PIXEL_RATIOS.join(", ")}`,
    );
  }
  const upstream = await callRenderFunction(request, "", {
    method: "POST",
    body: JSON.stringify(svgInput),
  });
  if (!upstream.ok) return relay(upstream);
  try {
    const { png, width, height } = await rasterizeSvg(await upstream.text(), pixelRatio);
    return new Response(new Uint8Array(png), {
      headers: {
        "content-type": "image/png",
        "cache-control": "no-store",
        "x-supagist-width": String(width),
        "x-supagist-height": String(height),
      },
    });
  } catch (error) {
    if (error instanceof PngTooLargeError) return apiError(400, "INVALID_INPUT", error.message);
    console.error("PNG rasterization failed", error);
    return apiError(500, "RENDER_FAILED", "Rendering failed. Try again later.");
  }
}
