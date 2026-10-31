import {
  DEFAULT_PNG_PIXEL_RATIO,
  PNG_PIXEL_RATIOS,
  callRenderFunction,
  relay,
} from "@/lib/render-api";

// The server owns the option vocabulary; the CLI only checks shapes.
export async function GET(request: Request) {
  const upstream = await callRenderFunction(request, "/options", { method: "GET" });
  if (!upstream.ok) return relay(upstream);
  return Response.json(
    {
      ...(await upstream.json()),
      formats: ["svg", "png"],
      pixelRatios: { svg: [1, 2], png: PNG_PIXEL_RATIOS },
      defaults: { format: "svg", pixelRatio: { svg: 1, png: DEFAULT_PNG_PIXEL_RATIO } },
    },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}
