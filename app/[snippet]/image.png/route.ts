import { createClient } from "@supabase/supabase-js";
import { parseSnippetParam } from "@/lib/snippet-utils";
import { renderSnippetPng, type RenderableSnippet } from "@/lib/snippet-render";

// resvg and the Lumis parsers need Node, not Edge.
export const runtime = "nodejs";

// Linked with `?v=` from renderVersion, which changes with every edit.
const CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

/**
 * The snippet's full render (canvas, frame and card) from its live row. An
 * edit drops the publish-time canonical.png, so the /snippets thumbnail links
 * here instead. A cookie-free client keeps the response identical for every
 * viewer, so the CDN can cache it.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ snippet: string }> }) {
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
    .maybeSingle<RenderableSnippet & { visibility: "public" | "unlisted" }>();
  if (!snippet) return new Response("Not found", { status: 404 });

  const png = await renderSnippetPng(snippet, { card: false });
  return new Response(png as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": CACHE,
      ...(snippet.visibility === "unlisted" ? { "X-Robots-Tag": "noindex" } : {}),
    },
  });
}
