import { createClient } from "@supabase/supabase-js";
import { parseSnippetParam } from "@/lib/snippet-utils";
import { renderOgImage, type OgSnippet } from "@/lib/og-render";
import { ogVersion } from "@/lib/og-image";

// sharp, resvg and the Lumis parsers need Node, not Edge.
export const runtime = "nodejs";

// Linked with `?v=` from ogVersion, which changes whenever the picture would
// (a sealed snippet only changes visibility), so the current version's URL
// never goes stale and is kept a year. Any other URL gets an hour.
const VERSIONED = "public, max-age=31536000, s-maxage=31536000, immutable";
const UNVERSIONED = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

/**
 * The per-snippet share image: the snippet's own export render (what Save as
 * PNG downloads) in the 1200×630 frame with the Supagist band. A cookie-free
 * client keeps the response identical for every viewer, so the CDN can cache
 * it.
 */
export async function GET(request: Request, { params }: { params: Promise<{ snippet: string }> }) {
  const parsed = parseSnippetParam((await params).snippet);
  if (!parsed) return new Response("Not found", { status: 404 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: snippet } = await supabase
    .rpc("get_snippet_by_link", { p_slug: parsed.slug, p_short_id: parsed.shortId })
    .select("*, author:author_id(username, avatar_url)")
    .maybeSingle<OgSnippet & { id: string; og_image_path: string | null }>();
  if (!snippet) return new Response("Not found", { status: 404 });

  const unlisted = snippet.visibility === "unlisted";
  try {
    const image = await renderOgImage(snippet);
    return new Response(image.body as BodyInit, {
      headers: {
        "Content-Type": image.type,
        "Cache-Control":
          new URL(request.url).searchParams.get("v") === ogVersion(snippet)
            ? VERSIONED
            : UNVERSIONED,
        ...(unlisted ? { "X-Robots-Tag": "noindex" } : {}),
      },
    });
  } catch (error) {
    // The publish-time og.png, else the site default. Not cached, so the
    // next crawl tries the real image again.
    console.error(`Share image failed for snippet ${snippet.id}`, error);
    const fallback = snippet.og_image_path
      ? supabase.storage.from("snippet-images").getPublicUrl(snippet.og_image_path).data.publicUrl
      : "/og-image.png";
    return new Response(null, {
      status: 307,
      headers: { Location: new URL(fallback, request.url).href, "Cache-Control": "no-store" },
    });
  }
}
