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
  // Public project info (already in the site's browser bundle). The CLI needs
  // the publishable key as the apikey for Supabase Auth calls such as logout.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return Response.json(
    {
      ...(await upstream.json()),
      ...(url && publishableKey ? { supabase: { url, publishableKey } } : {}),
      formats: ["svg", "png"],
      pixelRatios: { svg: [1, 2], png: PNG_PIXEL_RATIOS },
      defaults: { format: "svg", pixelRatio: { svg: 1, png: DEFAULT_PNG_PIXEL_RATIO } },
    },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}
