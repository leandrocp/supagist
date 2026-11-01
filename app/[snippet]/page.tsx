import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { cache } from "react";
import { createHighlighter } from "@lumis-sh/lumis";
import { bundledLanguages } from "@lumis-sh/lumis/bundles/full";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { SiteFooter } from "@/components/site-footer";
import { SnippetOwnerActions } from "@/components/snippet-owner-actions";
import { SnippetAnnotationsView } from "./snippet-annotations-view";
import {
  parseSnippetParam,
  escapeHtml,
  groupExportReactions,
  buildSnippetSocialAlt,
  languageDisplayName,
  normalizeSnippetCode,
  codePointLength,
} from "@/lib/snippet-utils";
import { loadTheme } from "@/lib/theme-loader";
import { highlightHtmlLines, loadLanguageOrPlaintext } from "@/lib/lumis-lines";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { recordVisit } from "@/app/actions/record-visit";
import { buildAppUrl, getRequestOrigin } from "@/lib/utils";
import { cardSource, ogVersion } from "@/lib/og-image";
import { fetchOgFacts } from "@/lib/og-render";
import { parseSnippetAppearance } from "@/lib/snippet-appearance";

// Module-level singleton — safe because this is server-only code. The Node
// entry reads parsers from the installed @lumis-sh/wasm-* packages, so
// rendering never reaches the network.
const highlighterPromise = createHighlighter({ languages: [bundledLanguages] });

type Props = {
  params: Promise<{ snippet: string }>;
};

type SnippetRow = {
  id: string;
  filename: string;
  language: string | null;
  theme: string;
  font_id: string;
  appearance: unknown;
  code: string;
  code_char_count: number;
  line_count: number;
  view_count: number;
  author_id: string | null;
  canonical_image_path: string | null;
  svg_path: string | null;
  og_image_path: string | null;
  title: string | null;
  created_at: string;
  visibility: "public" | "unlisted";
  author: { id: string; username: string; avatar_url: string } | null;
};

// Deduped per request — generateMetadata and SnippetPage share one DB round-trip.
const getSnippet = cache(async (slug: string, shortId: string) => {
  const supabase = await createClient();
  // The link is the capability: table reads never return other people's
  // unlisted snippets, so look the snippet up by its exact slug + short_id.
  const { data } = await supabase
    .rpc("get_snippet_by_link", { p_slug: slug, p_short_id: shortId })
    .select("*, author:author_id(id, username, avatar_url)")
    .maybeSingle<SnippetRow>();
  if (!data) return data;
  // Older rows may end in spaces or blank lines; show them trimmed without
  // rewriting what is stored.
  const code = normalizeSnippetCode(data.code);
  return {
    ...data,
    code,
    line_count: code.split("\n").length,
    code_char_count: codePointLength(code),
  };
});

export async function generateMetadata({ params }: Props) {
  const { snippet: param } = await params;
  const parsed = parseSnippetParam(param);
  if (!parsed) return {};

  const snippet = await getSnippet(parsed.slug, parsed.shortId);
  if (!snippet) return {};

  // The live share image (app/[snippet]/og.png). `?v=` changes exactly when
  // the picture would, which also busts X, Slack and Discord preview caches.
  // If the facts can't be read, fall back to the publish-time og.png, then to
  // the site default.
  const supabase = await createClient();
  let ogImage: string | null = null;
  try {
    const facts = await fetchOgFacts(supabase, snippet.id);
    const v = ogVersion({
      viewCount: snippet.view_count,
      reactionEmojis: facts.reactionEmojis,
      commentCount: facts.commentCount,
      theme: snippet.theme,
      unlisted: snippet.visibility === "unlisted",
      lineCount: snippet.line_count,
      language: snippet.language,
      author: snippet.author
        ? { username: snippet.author.username, avatarUrl: snippet.author.avatar_url }
        : null,
      card: cardSource(snippet),
    });
    ogImage = `/${param}/og.png?v=${v}`;
  } catch (error) {
    console.error(`Share image facts failed for snippet ${snippet.id}`, error);
    ogImage = snippet.og_image_path
      ? supabase.storage.from("snippet-images").getPublicUrl(snippet.og_image_path).data.publicUrl
      : null;
  }

  // Short, screen-reader-friendly description used as the og:image alt and
  // the social-card description — see buildSnippetSocialAlt for the shape.
  const author = snippet.author as { username: string } | null;
  const alt = buildSnippetSocialAlt({
    filename: snippet.filename,
    authorUsername: author?.username ?? null,
    language: snippet.language,
    theme: snippet.theme,
    lineCount: snippet.line_count,
    charCount: snippet.code_char_count,
  });

  // A page's openGraph replaces the layout's, so name the default share image.
  const images = ogImage
    ? [{ url: ogImage, width: 1200, height: 630, alt }]
    : [{ url: "/og-image.png", width: 1200, height: 630 }];
  const title = `${snippet.title ?? snippet.filename} — Supagist`;
  return {
    title,
    // Unlisted links are shareable, but search engines must not index them.
    ...(snippet.visibility === "unlisted" ? { robots: { index: false, follow: false } } : {}),
    description: alt,
    openGraph: {
      title,
      description: alt,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: alt,
      images,
    },
  };
}

export default async function SnippetPage({ params }: Props) {
  const { snippet: param } = await params;
  const parsed = parseSnippetParam(param);

  if (!parsed) notFound();

  const supabase = await createClient();
  // Use getClaims() rather than getUser(): getClaims() decodes the JWT
  // locally from the cookie, while getUser() round-trips to the auth
  // server and can return null on transient failures even when the
  // session cookie is perfectly valid. CLAUDE.md flags exactly this case.
  // The auth-button uses the same approach, so the snippet view and the
  // chrome stay in agreement about whether the viewer is signed in.
  const [snippet, claimsRes] = await Promise.all([
    getSnippet(parsed.slug, parsed.shortId),
    supabase.auth.getClaims(),
  ]);

  if (!snippet) notFound();

  const { data: reactionRows } = await supabase
    .from("snippet_line_reactions")
    .select("line_number, emoji, author:author_id(username, avatar_url)")
    .eq("snippet_id", snippet.id);

  // Flatten the joined author into the row shape groupExportReactions expects.
  const flattenedReactions = (reactionRows ?? []).map((r) => {
    const author = Array.isArray(r.author)
      ? (r.author[0] as { username: string; avatar_url: string | null } | undefined)
      : (r.author as { username: string; avatar_url: string | null } | null);
    return {
      line_number: r.line_number as number,
      emoji: r.emoji as string,
      username: author?.username ?? "unknown",
      avatarUrl: author?.avatar_url ?? null,
    };
  });
  const snippetReactions = groupExportReactions(flattenedReactions);

  // Fire-and-forget — do not await so it doesn't block the page render.
  void recordVisit(snippet.id);

  const currentUserId = (claimsRes.data?.claims?.sub as string | undefined) ?? null;
  const author = snippet.author as { id: string; username: string; avatar_url: string } | null;

  // Server-side Lumis rendering
  const language = snippet.language ?? "text";
  let preRenderedLines: string[] = snippet.code.split(/\r?\n/).map(escapeHtml);
  let themeIsDark = false;
  let themeBg: string | null = null;
  let themeFg: string | null = null;

  try {
    const [highlighter, loaded] = await Promise.all([highlighterPromise, loadTheme(snippet.theme)]);
    const highlightedLanguage = await loadLanguageOrPlaintext(highlighter, language);
    const themeData = loaded.data;
    themeIsDark = themeData.appearance === "dark";
    const normal = themeData.highlights?.["normal"] as { bg?: string; fg?: string } | undefined;
    themeBg = normal?.bg ?? null;
    themeFg = normal?.fg ?? null;
    preRenderedLines = highlightHtmlLines(
      highlighter,
      snippet.code,
      highlightedLanguage,
      themeData,
    );
  } catch (error) {
    // Fall back to escaped plain text, but say why: a missing parser or theme
    // otherwise degrades every snippet silently.
    console.error(`Lumis could not highlight snippet ${snippet.id}`, error);
  }

  const requestHeaders = await headers();
  const snippetUrl = buildAppUrl(param, getRequestOrigin(requestHeaders));

  const createdAt = new Date(snippet.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <AppNav />

      <section className="mx-auto flex w-full max-w-[1020px] flex-1 flex-col gap-7 px-5 pt-[34px] pb-14 md:px-12 md:pt-14">
        <header className="flex flex-col gap-3">
          <h1 className="font-display text-[34px] leading-[1.05] break-words text-foreground md:text-[52px]">
            {snippet.title ?? snippet.filename}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-muted-foreground">
            {author ? (
              <Link
                href={`https://github.com/${author.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full font-medium text-foreground focus-visible:focus-ring"
              >
                <UserAvatar
                  username={author.username}
                  avatarUrl={author.avatar_url}
                  size="default"
                />
                <span>@{author.username}</span>
              </Link>
            ) : null}
            {snippet.visibility === "unlisted" ? (
              <Badge
                variant="secondary"
                className="text-[13px] font-medium"
                title="Only people with the link can see this snippet"
              >
                Unlisted
              </Badge>
            ) : null}
            <span>{snippet.theme}</span>
            {snippet.language ? <span>{languageDisplayName(snippet.language)}</span> : null}
            <span>{snippet.line_count} lines</span>
            <span>{createdAt}</span>
          </div>
          {author && currentUserId === author.id ? (
            <SnippetOwnerActions
              snippetId={snippet.id}
              name={snippet.title ?? snippet.filename}
              variant="buttons"
              afterDelete="snippets"
            />
          ) : null}
        </header>

        {/* The collaborative code block keeps the snippet's own theme and the
            canvas and frame it was published with. max-h caps it to the
            viewport so the chrome, body, comments and status bar stay visible. */}
        <div className="flex max-h-[calc(100dvh-16rem)] min-h-0 flex-col md:max-h-[calc(100dvh-13rem)]">
          <SnippetAnnotationsView
            snippetId={snippet.id}
            filename={snippet.filename}
            code={snippet.code}
            language={language}
            snippetUrl={snippetUrl}
            snippetTheme={snippet.theme}
            fontId={snippet.font_id}
            snippetReactions={snippetReactions}
            preRenderedLines={preRenderedLines}
            themeIsDark={themeIsDark}
            themeBg={themeBg}
            themeFg={themeFg}
            currentUserId={currentUserId}
            author={author}
            appearance={parseSnippetAppearance(snippet.appearance)}
          />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
