import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { cache } from "react";
import { createHighlighter } from "@lumis-sh/lumis";
import { bundledLanguages } from "@lumis-sh/lumis/bundles/full";
import { spanInline } from "@lumis-sh/lumis/formatters/html";
import type { ThemeData } from "@lumis-sh/themes";
import { createClient } from "@/lib/supabase/server";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { AuthButton } from "@/components/auth-button";
import { BrandDot } from "@/components/brand-dot";
import { SnippetAnnotationsView } from "./snippet-annotations-view";
import { hasEnvVars } from "@/lib/utils";
import {
  parseSnippetParam,
  escapeHtml,
  groupExportReactions,
  buildSnippetSocialAlt,
} from "@/lib/snippet-utils";
import { loadTheme } from "@/lib/theme-loader";
import { UserAvatar } from "@/components/user-avatar";
import { recordVisit } from "@/app/actions/record-visit";
import { Suspense } from "react";
import { buildAppUrl, getRequestOrigin } from "@/lib/utils";

// Module-level singleton — safe because this is server-only code.
const highlighterPromise = createHighlighter({ languages: [bundledLanguages] });

type Props = {
  params: Promise<{ snippet: string }>;
};

// Deduped per request — generateMetadata and SnippetPage share one DB round-trip.
const getSnippet = cache(async (slug: string, shortId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("snippets")
    .select("*, author:author_id(id, username, avatar_url)")
    .eq("slug", slug)
    .eq("short_id", shortId)
    .single();
  return data;
});

export async function generateMetadata({ params }: Props) {
  const { snippet: param } = await params;
  const parsed = parseSnippetParam(param);
  if (!parsed) return {};

  const snippet = await getSnippet(parsed.slug, parsed.shortId);
  if (!snippet) return {};

  const supabase = await createClient();
  const { data: ogUrl } = supabase.storage
    .from("snippet-images")
    .getPublicUrl(snippet.og_image_path);

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

  return {
    title: `${snippet.filename} — Supagist`,
    description: alt,
    openGraph: {
      title: `${snippet.filename} — Supagist`,
      description: alt,
      images: [{ url: ogUrl.publicUrl, alt }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${snippet.filename} — Supagist`,
      description: alt,
      images: [{ url: ogUrl.publicUrl, alt }],
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
  let preRenderedLines: string[] = snippet.code.split("\n").map(escapeHtml);
  let themeIsDark = false;
  let themeBg: string | null = null;
  let themeFg: string | null = null;

  try {
    const [highlighter, loaded] = await Promise.all([highlighterPromise, loadTheme(snippet.theme)]);
    await highlighter.loadLanguage(language);
    const themeData = loaded.data;
    themeIsDark = themeData.appearance === "dark";
    const normal = themeData.highlights?.["normal"] as { bg?: string; fg?: string } | undefined;
    themeBg = normal?.bg ?? null;
    themeFg = normal?.fg ?? null;
    preRenderedLines = renderLines(snippet.code, language, themeData, highlighter);
  } catch {
    // fall back to escaped plain text
  }

  const requestHeaders = await headers();
  const snippetUrl = buildAppUrl(param, getRequestOrigin(requestHeaders));

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5">
        <nav className="flex h-16 items-center justify-between border-b border-border text-sm">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80">
              <BrandDot />
              <p className="font-medium tracking-tight">Supagist</p>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {hasEnvVars ? (
              <Suspense fallback={null}>
                <AuthButton />
              </Suspense>
            ) : null}
            <ThemeSwitcher />
          </div>
        </nav>

        <section className="flex flex-1 flex-col gap-6 py-8 lg:py-10">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">{snippet.filename}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {author ? (
                  <a
                    href={`https://github.com/${author.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 transition-colors hover:text-foreground"
                  >
                    <UserAvatar
                      username={author.username}
                      avatarUrl={author.avatar_url}
                      size="sm"
                    />
                    <span>@{author.username}</span>
                  </a>
                ) : null}
                <span>{snippet.theme}</span>
                {snippet.language ? <span>{snippet.language}</span> : null}
                <span>{snippet.line_count} lines</span>
                <span>{new Date(snippet.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Collaborative code block */}
          {/* max-h-[calc(100dvh-...)] caps the card to the viewport so the
              chrome + editor body + comment panel + status bar all stay
              visible without the page scrolling past the footer. Mobile
              uses a larger chrome budget because the header and footer wrap
              onto more lines below the md breakpoint. */}
          <div className="flex max-h-[calc(100dvh-16rem)] min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 md:max-h-[calc(100dvh-13rem)]">
            <SnippetAnnotationsView
              snippetId={snippet.id}
              filename={snippet.filename}
              code={snippet.code}
              language={language}
              snippetUrl={snippetUrl}
              snippetTheme={snippet.theme}
              snippetReactions={snippetReactions}
              preRenderedLines={preRenderedLines}
              themeIsDark={themeIsDark}
              themeBg={themeBg}
              themeFg={themeFg}
              currentUserId={currentUserId}
              author={author}
            />
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-border py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="font-mono uppercase tracking-code-label">
            Built with{" "}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-link underline-offset-2 hover:underline"
            >
              Supabase
            </a>{" "}
            and{" "}
            <a
              href="https://lumis.sh"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              Lumis
            </a>{" "}
            · Backgrounds by{" "}
            <a
              href="https://ray.so"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              ray.so
            </a>
          </p>
          <div className="flex items-center gap-5 font-mono uppercase tracking-code-label">
            <a
              href="https://github.com/leandrocp/supagist/blob/main/ARCHITECTURE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              Architecture
            </a>
            <a
              href="https://github.com/leandrocp/supagist"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              GitHub
            </a>
            <Link
              href="/terms"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              Terms
            </Link>
            <Link href="/" className="underline-offset-2 hover:text-foreground hover:underline">
              Create your own
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

// ── Lumis server rendering ─────────────────────────────────────────────────

function renderLines(
  code: string,
  language: string,
  theme: ThemeData,
  highlighter: Awaited<typeof highlighterPromise>,
): string[] {
  const lines = code.split("\n").map(() => "");
  let lineIndex = 0;

  highlighter.highlightIter(code, language, theme, (text, tokenLanguage, _range, scope) => {
    // Split on either CRLF or LF — when the snippet is saved with Windows
    // line endings, splitting only on \n leaves a trailing \r on each chunk
    // which `white-space: pre-wrap` treats as a segment break. That break
    // pushed the trailing reaction chip (and any inline content after the
    // line) onto a fresh visual row.
    const chunks = text.split(/\r?\n/);
    chunks.forEach((chunk, chunkIndex) => {
      if (chunk) {
        lines[lineIndex] += scope
          ? spanInline(chunk, { language: tokenLanguage, scope, theme })
          : escapeHtml(chunk);
      }
      if (chunkIndex < chunks.length - 1) lineIndex += 1;
    });
  });

  return lines;
}
