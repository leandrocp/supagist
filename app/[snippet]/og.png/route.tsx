import { createClient } from "@supabase/supabase-js";
import { parseSnippetParam, languageDisplayName, normalizeSnippetCode } from "@/lib/snippet-utils";
import { loadTheme } from "@/lib/theme-loader";
import { cardSource } from "@/lib/og-image";
import { fetchOgFacts, loadAvatar, loadCardPng, renderOgPng } from "@/lib/og-render";
import { renderSnippetPng } from "@/lib/snippet-render";

// Satori, resvg and the bundled assets need Node, not Edge.
export const runtime = "nodejs";

// The `?v=` hash in the page metadata changes whenever the picture would and
// on every edit, so a cached copy is always the right picture for its URL.
const CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

type SnippetRow = {
  id: string;
  author_id: string | null;
  filename: string;
  language: string | null;
  theme: string;
  code: string;
  font_id: string;
  appearance: unknown;
  view_count: number;
  created_at: string;
  visibility: "public" | "unlisted";
  canonical_image_path: string | null;
  og_image_path: string | null;
  svg_path: string | null;
  author: { username: string; avatar_url: string | null } | null;
};

/**
 * The per-snippet share image (og/v1 direction A, "Opened letter"), built
 * from live snippet data. A cookie-free client keeps the response identical
 * for every viewer, so the CDN can cache it.
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
    .maybeSingle<SnippetRow>();
  if (!snippet) return new Response("Not found", { status: 404 });

  const unlisted = snippet.visibility === "unlisted";
  try {
    const [facts, theme, card, avatar] = await Promise.all([
      fetchOgFacts(supabase, snippet.id),
      loadTheme(snippet.theme).catch(() => null),
      loadCardPng(supabase, cardSource(snippet))
        .catch(() => null)
        // An edit drops the stored renders: draw the card from the live row.
        // Unlisted cards keep the author out of third-party caches (spec §4).
        .then(
          (stored) =>
            stored ??
            renderSnippetPng(
              { ...snippet, author: unlisted ? null : snippet.author },
              { card: true },
            ),
        )
        .catch((error) => {
          console.error(`Share card render failed for snippet ${snippet.id}`, error);
          return null;
        }),
      unlisted ? null : loadAvatar(snippet.author?.avatar_url ?? null),
    ]);
    const png = await renderOgPng({
      snippet: {
        filename: snippet.filename,
        language: snippet.language,
        languageName: snippet.language ? languageDisplayName(snippet.language) : null,
        // Counted from the trimmed code, as the snippet page does.
        lineCount: normalizeSnippetCode(snippet.code).split("\n").length,
        viewCount: snippet.view_count,
        createdAt: snippet.created_at,
        unlisted,
        dark: theme?.data.appearance === "dark",
        author: snippet.author
          ? { username: snippet.author.username, avatarUrl: snippet.author.avatar_url }
          : null,
        reactionEmojis: facts.reactionEmojis,
        commentCount: facts.commentCount,
      },
      card,
      avatar,
    });
    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": CACHE,
        ...(unlisted ? { "X-Robots-Tag": "noindex" } : {}),
      },
    });
  } catch (error) {
    // Spec §5 fallback: the publish-time og.png, else the site default.
    console.error(`Share image failed for snippet ${snippet.id}`, error);
    const fallback = snippet.og_image_path
      ? supabase.storage.from("snippet-images").getPublicUrl(snippet.og_image_path).data.publicUrl
      : "/og-image.png";
    return Response.redirect(new URL(fallback, request.url), 307);
  }
}
