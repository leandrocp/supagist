import { NextResponse } from "next/server";
import { getRequestOrigin, hasEnvVars } from "@/lib/utils";
import { backgroundLabels, brandIds, fontIds, CLI_WINDOW_DECORATIONS } from "@/lib/cli-appearance";

export const dynamic = "force-dynamic";

/**
 * Discovery endpoint for `npx supagist`.
 *
 * The CLI ships with no baked-in project credentials so it can be pointed at
 * any deployment (`--host`, or a local `next dev`). It asks the host for the
 * Supabase URL + publishable key it should refresh tokens against, plus the
 * option vocabulary, so `--help` and validation stay accurate without needing
 * a CLI release every time a brand or theme is added.
 *
 * Everything here is already public: the publishable key is the same anon key
 * the browser bundle ships, and the option lists are visible in the composer.
 */
export async function GET(request: Request) {
  if (!hasEnvVars) {
    return NextResponse.json({ error: "Supagist is not configured." }, { status: 503 });
  }

  return NextResponse.json(
    {
      appUrl: getRequestOrigin(request.headers),
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      options: {
        brands: brandIds(),
        backgrounds: backgroundLabels(),
        fonts: fontIds(),
        windows: CLI_WINDOW_DECORATIONS,
      },
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
