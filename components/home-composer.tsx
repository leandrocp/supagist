"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { availableThemes, availableLanguages } from "@lumis-sh/lumis";
import { Download, Shuffle, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  EXPORT_WIDTH,
  EXPORT_BACKGROUNDS,
  EXPORT_FONTS,
  toPngFilename,
  createHighlightedSvg,
  renderToFile,
  inferLanguage,
  type ExportBackground,
} from "@/lib/export-utils";
import { languageDisplayName, codePointLength } from "@/lib/snippet-utils";
import { ThemePicker } from "@/components/theme-picker";
import { ExportModal } from "@/components/export-modal";
import type { EditorPalette, InlineComment } from "@/components/inline-code-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/user-avatar";
import { Spinner } from "@/components/ui/spinner";
import { publishSnippet } from "@/app/actions/publish";
import { toast } from "sonner";

const DRAFT_KEY = "supagist:draft:v1";
const ANNOTATIONS_KEY = "supagist:annotations:v1";
const DEV_MODE = process.env.NODE_ENV !== "production";

// Kick off WASM loading as early as possible — in parallel with the InlineCodeBlock chunk
if (typeof window !== "undefined") void import("@/lib/lumis-client");

const InlineCodeBlock = dynamic(
  () => import("@/components/inline-code-block").then((mod) => mod.InlineCodeBlock),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-96 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-5" />
        Loading editor…
      </div>
    ),
  },
);

const DEFAULT_FILENAME = "snippet.tsx";
const DEFAULT_CODE = `export function Render() {
  return <h1>Hello, Supagist!</h1>;
}`;
const themes = availableThemes();
const defaultTheme =
  themes.find((t) => t.name === "github_light")?.name ?? themes[0]?.name ?? "github_light";
const languages = availableLanguages();

type Draft = {
  filename: string;
  code: string;
  theme: string;
  fontId: string;
  languageOverride: string | null;
  background: string | null;
  padding: number;
  pixelRatio: number;
  lineNumbers: boolean;
  showReactions: boolean;
  showFilename: boolean;
  showFooter: boolean;
};
type DraftAnnotations = {
  comments: Record<number, InlineComment>;
  reactions: Record<number, string>;
};

export function HomeComposer() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>({
    filename: DEFAULT_FILENAME,
    code: DEFAULT_CODE,
    theme: defaultTheme,
    fontId: "system",
    languageOverride: null,
    background: null,
    padding: 64,
    pixelRatio: 4,
    lineNumbers: false,
    showReactions: false,
    showFilename: true,
    showFooter: false,
  });
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [annotations, setAnnotations] = useState<DraftAnnotations>({ comments: {}, reactions: {} });
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedCommentLine, setSelectedCommentLine] = useState<number | null>(null);
  const [selectedReactionLine, setSelectedReactionLine] = useState<number | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [viewerLabel, setViewerLabel] = useState<string | null>(null);
  const [viewerAvatar, setViewerAvatar] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showAuthBanner, setShowAuthBanner] = useState(false);
  const [editorPalette, setEditorPalette] = useState<EditorPalette | null>(null);
  const authBannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── persistence ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const savedDraft = window.localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const p = JSON.parse(savedDraft) as Partial<Draft>;
        setDraft({
          filename: p.filename || DEFAULT_FILENAME,
          code: p.code || DEFAULT_CODE,
          theme: p.theme || defaultTheme,
          fontId: p.fontId ?? "system",
          languageOverride: p.languageOverride ?? null,
          background: p.background ?? null,
          padding: p.padding ?? 64,
          pixelRatio: p.pixelRatio ?? 4,
          lineNumbers: p.lineNumbers ?? false,
          showReactions: p.showReactions ?? false,
          showFilename: p.showFilename ?? true,
          showFooter: p.showFooter ?? false,
        });
      } catch {
        window.localStorage.removeItem(DRAFT_KEY);
      }
    }

    const savedAnnotations = window.localStorage.getItem(ANNOTATIONS_KEY);
    if (savedAnnotations) {
      try {
        const p = JSON.parse(savedAnnotations) as Partial<DraftAnnotations>;
        setAnnotations({ comments: p.comments || {}, reactions: p.reactions || {} });
      } catch {
        window.localStorage.removeItem(ANNOTATIONS_KEY);
      }
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    window.localStorage.setItem(ANNOTATIONS_KEY, JSON.stringify(annotations));
  }, [annotations, draft, isHydrated]);

  // ── auth ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    async function loadViewer() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setViewerLabel(null);
        setViewerAvatar(null);
        setIsAnonymous(false);
        return;
      }

      if (user.is_anonymous) {
        setIsAnonymous(true);
        setViewerLabel(null);
        setViewerAvatar(null);
        return;
      }

      setIsAnonymous(false);
      const meta = user.user_metadata;
      setViewerLabel(
        String(
          meta?.user_name ||
            meta?.preferred_username ||
            meta?.name ||
            user.email?.split("@")[0] ||
            "you",
        ),
      );
      setViewerAvatar(typeof meta?.avatar_url === "string" ? meta.avatar_url : null);
    }

    void loadViewer();

    // Keep viewer label in sync after identity linking.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadViewer();
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── derived ───────────────────────────────────────────────────────────────────
  const lineCount = useMemo(() => draft.code.split("\n").length, [draft.code]);
  // Counts Unicode code points so the footer matches Postgres char_length()
  // — see codePointLength docs.
  const charCount = useMemo(() => codePointLength(draft.code), [draft.code]);
  const language = useMemo(
    () => inferLanguage(draft.filename, draft.code),
    [draft.filename, draft.code],
  );
  const isOverLimit = charCount > 8000;

  // ── annotation handlers ───────────────────────────────────────────────────────
  const requireAuth = (): boolean => {
    if (DEV_MODE || viewerLabel) return true;
    if (authBannerTimer.current) clearTimeout(authBannerTimer.current);
    setShowAuthBanner(true);
    authBannerTimer.current = setTimeout(() => setShowAuthBanner(false), 4000);
    return false;
  };

  const handleSelectCommentLine = (lineNumber: number) => {
    if (!requireAuth()) return;
    setSelectedReactionLine(null);
    setSelectedCommentLine(lineNumber);
    setCommentDraft(annotations.comments[lineNumber]?.body || "");
  };

  const handlePickReaction = (lineNumber: number, emoji: string) => {
    if (!requireAuth()) return;
    setAnnotations((c) => {
      const { [lineNumber]: _removed, ...rest } = c.reactions;
      return { ...c, reactions: emoji ? { ...rest, [lineNumber]: emoji } : rest };
    });
    setSelectedReactionLine(null);
  };

  const handleSaveComment = () => {
    if (!selectedCommentLine || !requireAuth()) return;
    const body = commentDraft.trim();
    if (!body) return;
    setAnnotations((c) => ({
      ...c,
      comments: {
        ...c.comments,
        [selectedCommentLine]: { author: viewerLabel || "you", body },
      },
    }));
    setSelectedCommentLine(null);
    setCommentDraft("");
  };

  // ── publish ───────────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    // Anonymous and fully-logged-out visitors both need a real account before
    // the snippet can be attributed. Draft + annotations are already in
    // localStorage (see persistence effect above), so the user picks up
    // exactly where they left off after sign-in.
    if (!viewerLabel) {
      router.push("/auth/login");
      return;
    }
    if (isOverLimit) {
      toast.error(`Snippet is too long (${charCount.toLocaleString()} / 8,000 chars).`);
      return;
    }

    setIsPublishing(true);
    try {
      const bg = EXPORT_BACKGROUNDS.find((b) => b.label === draft.background) ?? null;
      // Local draft stores one emoji per line (single user). The export
      // pipeline takes a list of chips (emoji + reactors) so the snippet view
      // can show every unique reaction with the reactor's avatar. Lift the
      // draft into chip shape using the viewer's own username as the reactor.
      const reactorUsername = viewerLabel || "you";
      const reactionsForExport = Object.fromEntries(
        Object.entries(annotations.reactions).map(([ln, emoji]) => [
          Number(ln),
          [{ emoji, reactors: [{ username: reactorUsername, avatarUrl: viewerAvatar }] }],
        ]),
      );
      const [canonicalFile, ogFile, svgString] = await Promise.all([
        createPreviewImage(draft, bg, reactionsForExport),
        createOgImage(draft, reactorUsername, viewerAvatar),
        createHighlightedSvg(
          draft.code,
          draft.filename,
          draft.theme,
          EXPORT_WIDTH,
          undefined,
          bg,
          draft.padding,
          draft.lineNumbers,
          draft.fontId,
          draft.languageOverride,
          reactionsForExport,
          draft.showReactions,
          draft.showFilename,
        ),
      ]);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });

      const formData = new FormData();
      formData.set("code", draft.code);
      formData.set("filename", draft.filename);
      formData.set("theme", draft.theme);
      formData.set("language", language);
      formData.set("canonical_image", canonicalFile);
      formData.set("og_image", ogFile);
      formData.set("svg", svgBlob);
      formData.set("reactions", JSON.stringify(annotations.reactions));
      formData.set("comments", JSON.stringify(annotations.comments));

      const result = await publishSnippet(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      window.localStorage.removeItem(DRAFT_KEY);
      window.localStorage.removeItem(ANNOTATIONS_KEY);

      try {
        await navigator.clipboard.writeText(`${window.location.origin}${result.path}`);
      } catch {
        // best-effort clipboard
      }

      router.push(result.path!);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Publish failed. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const busy = isPublishing;

  // Editor-level toolbar (file/lang/theme/font controls + Export/Save).
  // Themed against the editor's syntax palette so it doesn't fight the card —
  // labels lift with c.headerText (dim, like the status bar), control values
  // sit on c.buttonText (the brighter primary text), borders use
  // c.buttonBorder, and the Save action inverts to a filled c.buttonText
  // chip to stay prominent across light and dark themes.
  const labelStyle = editorPalette ? { color: editorPalette.headerText } : undefined;
  const controlStyle = editorPalette
    ? {
        backgroundColor: editorPalette.bg,
        color: editorPalette.buttonText,
        borderColor: editorPalette.buttonBorder,
      }
    : undefined;
  const saveStyle = editorPalette
    ? {
        backgroundColor: editorPalette.buttonText,
        color: editorPalette.bg,
        borderColor: editorPalette.buttonText,
      }
    : undefined;
  const exportStyle = editorPalette ? { color: editorPalette.buttonText } : undefined;

  const editorToolbar = (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2">
      {/* File */}
      <div className="flex flex-col gap-0.5">
        <span
          className="px-0.5 text-[10px] font-medium uppercase tracking-wider"
          style={labelStyle}
        >
          File
        </span>
        <Input
          className="h-8 w-44 max-w-64 min-w-32 flex-1 font-mono text-sm sm:w-64 sm:flex-none"
          style={controlStyle}
          value={draft.filename}
          onChange={(e) => setDraft((d) => ({ ...d, filename: e.target.value }))}
          placeholder="snippet.tsx"
          aria-label="Filename"
        />
      </div>

      {/* Language */}
      <div className="flex flex-col gap-0.5">
        <span
          className="px-0.5 text-[10px] font-medium uppercase tracking-wider"
          style={labelStyle}
        >
          Language
        </span>
        <select
          className="h-8 rounded-md border px-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          style={controlStyle}
          value={draft.languageOverride ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, languageOverride: e.target.value || null }))}
          aria-label="Language"
        >
          <option value="">Auto-Detect</option>
          {languages.map((l) => (
            <option key={l.id} value={l.id}>
              {l.id}
            </option>
          ))}
        </select>
      </div>

      {/* Theme */}
      <div className="flex flex-col gap-0.5">
        <span
          className="px-0.5 text-[10px] font-medium uppercase tracking-wider"
          style={labelStyle}
        >
          Theme
        </span>
        <div
          className="flex h-8 items-center overflow-hidden rounded-md border"
          style={controlStyle}
        >
          <ThemePicker
            value={draft.theme}
            onChange={(next) => setDraft((d) => ({ ...d, theme: next }))}
            themes={themes.map((t) => ({ id: t.name, label: t.name }))}
            triggerClassName="min-w-0 flex-1"
            triggerStyle={editorPalette ? { color: editorPalette.buttonText } : undefined}
            iconColor={editorPalette?.headerText}
            popoverPalette={
              editorPalette
                ? {
                    bg: editorPalette.bg,
                    text: editorPalette.buttonText,
                    border: editorPalette.buttonBorder,
                    headerText: editorPalette.headerText,
                    // selectedLine is a 6% fg-over-transparent mix —
                    // visible on both light and dark themes, unlike gutter
                    // which often resolves to the same colour as bg.
                    hoverBg: editorPalette.selectedLine,
                  }
                : undefined
            }
          />
          <div
            className="w-px self-stretch"
            style={editorPalette ? { backgroundColor: editorPalette.buttonBorder } : undefined}
          />
          <button
            type="button"
            title="Random theme"
            className="flex h-full w-8 shrink-0 items-center justify-center transition-opacity hover:opacity-80"
            style={editorPalette ? { color: editorPalette.headerText } : undefined}
            onClick={() => {
              const others = themes.filter((t) => t.name !== draft.theme);
              const pick = others[Math.floor(Math.random() * others.length)];
              if (pick) setDraft((d) => ({ ...d, theme: pick.name }));
            }}
          >
            <Shuffle className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Font */}
      <div className="flex flex-col gap-0.5">
        <span
          className="px-0.5 text-[10px] font-medium uppercase tracking-wider"
          style={labelStyle}
        >
          Font
        </span>
        <select
          className="h-8 rounded-md border px-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          style={controlStyle}
          value={draft.fontId}
          onChange={(e) => setDraft((d) => ({ ...d, fontId: e.target.value }))}
          aria-label="Font"
        >
          {EXPORT_FONTS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  // Export + Save float at the top-right of the code area itself (handed
  // to InlineCodeBlock as a slot). Keeps the toolbar to a single calm row
  // of controls and puts the primary actions visually adjacent to the
  // code they affect.
  const editorCodeActions = (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => setExportModalOpen(true)}
        className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
        style={exportStyle}
      >
        <Download className="size-3.5" />
        Export
      </button>

      <button
        type="button"
        onClick={handlePublish}
        // Only block the click on length when the viewer is a real user
        // about to publish. Anonymous and logged-out viewers click through
        // to the auth flow, then return and re-validate.
        disabled={busy || (Boolean(viewerLabel) && isOverLimit)}
        className="flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        style={saveStyle}
      >
        {isPublishing ? <Spinner className="size-3.5" /> : <Upload className="size-3.5" />}
        {isPublishing ? "Saving…" : "Save"}
      </button>
    </>
  );

  return (
    <section className="space-y-8">
      {/* Hero */}
      <div className="mx-auto max-w-2xl space-y-2 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Supagist</h1>
        <p className="text-muted-foreground">Comment, react, share, export.</p>
        {(isAnonymous || !viewerLabel) && isHydrated ? (
          <p className="text-sm text-muted-foreground/50">Log in to enable all features.</p>
        ) : null}
      </div>

      {/* Editor card — single layer, no nesting */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Auth banner — slides in when anonymous user tries to interact */}
        {showAuthBanner ? (
          <div className="flex items-center justify-between border-b border-border bg-foreground px-4 py-2.5 text-sm text-background">
            <span>Log in to enable all features.</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/auth/login")}
                className="rounded-md bg-background px-3 py-1 text-xs font-medium text-foreground transition-opacity hover:opacity-80"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => setShowAuthBanner(false)}
                className="opacity-60 hover:opacity-100"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        ) : null}

        {/* Code editor */}
        <InlineCodeBlock
          filename={draft.filename}
          code={draft.code}
          theme={draft.theme}
          fontFamily={EXPORT_FONTS.find((f) => f.id === draft.fontId)?.family}
          language={draft.languageOverride}
          comments={annotations.comments}
          reactions={annotations.reactions}
          selectedCommentLine={selectedCommentLine}
          selectedReactionLine={selectedReactionLine}
          onCodeChange={(code) => setDraft((d) => ({ ...d, code }))}
          onSelectCommentLine={handleSelectCommentLine}
          onSelectReactionLine={(ln) => {
            if (!ln) {
              setSelectedReactionLine(null);
              return;
            }
            if (!requireAuth()) return;
            setSelectedCommentLine(null);
            setSelectedReactionLine(ln);
          }}
          onPickReaction={handlePickReaction}
          toolbar={editorToolbar}
          codeActions={editorCodeActions}
          onPaletteChange={setEditorPalette}
        />

        {/* Comment form — slides in below the editor */}
        {selectedCommentLine ? (
          <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Comment on line {selectedCommentLine}
            </p>
            <textarea
              className="min-h-20 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="Add a comment…"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveComment}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedCommentLine(null);
                  setCommentDraft("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {/* Status bar — themed to match the active syntax theme, mirroring
            the saved-snippet view. Falls back to muted page tokens until the
            editor reports its palette (first paint or unloaded theme). */}
        <div
          className="flex flex-wrap items-center justify-between gap-y-1 border-t border-border bg-muted/20 px-4 py-2 font-mono text-xs text-muted-foreground"
          style={
            editorPalette
              ? {
                  borderColor: editorPalette.border,
                  backgroundColor: editorPalette.gutter,
                  color: editorPalette.headerText,
                }
              : undefined
          }
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>{languageDisplayName(language)}</span>
            <span>{draft.theme}</span>
            <span>{lineCount} lines</span>
            <span className={isOverLimit ? "text-destructive font-medium" : ""}>
              {charCount.toLocaleString()} / 8,000
            </span>
            {viewerLabel ? (
              <span className="flex items-center gap-1.5">
                <UserAvatar username={viewerLabel} avatarUrl={viewerAvatar} size="xs" />
                <span>@{viewerLabel}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        code={draft.code}
        filename={draft.filename}
        theme={draft.theme}
        authorUsername={viewerLabel || "you"}
        authorAvatarUrl={viewerAvatar}
        reactions={Object.fromEntries(
          Object.entries(annotations.reactions).map(([ln, emoji]) => [
            Number(ln),
            [{ emoji, reactors: [{ username: viewerLabel || "you", avatarUrl: viewerAvatar }] }],
          ]),
        )}
        settings={{
          background: draft.background,
          padding: draft.padding,
          pixelRatio: draft.pixelRatio,
          lineNumbers: draft.lineNumbers,
          showReactions: draft.showReactions,
          showFilename: draft.showFilename,
          showFooter: draft.showFooter,
          fontId: draft.fontId,
          language: draft.languageOverride,
        }}
        onSettingsChange={(s) =>
          setDraft((d) => ({
            ...d,
            background: s.background,
            padding: s.padding,
            pixelRatio: s.pixelRatio,
            lineNumbers: s.lineNumbers,
            showReactions: s.showReactions,
            showFilename: s.showFilename,
            showFooter: s.showFooter,
            fontId: s.fontId,
            languageOverride: s.language,
          }))
        }
      />
    </section>
  );
}

// ── image generation ──────────────────────────────────────────────────────────

async function createPreviewImage(
  draft: Draft,
  background?: ExportBackground | null,
  reactions?: Record<number, import("@/lib/snippet-utils").ExportReactionChip[]>,
): Promise<File> {
  return renderToFile(
    draft.code,
    draft.filename,
    draft.theme,
    EXPORT_WIDTH,
    undefined,
    toPngFilename(draft.filename),
    draft.pixelRatio,
    background,
    background ? draft.padding : undefined,
    draft.lineNumbers,
    draft.fontId,
    draft.languageOverride,
    reactions,
    draft.showReactions,
    draft.showFilename,
  );
}

async function createOgImage(
  draft: Draft,
  authorUsername: string,
  authorAvatarUrl: string | null,
): Promise<File> {
  // OG images must be exactly 1200×630 — no retina scaling or platforms reject them.
  // Always render with line numbers, filename, and the footer chip so the
  // social preview reads like the full snippet view rather than a bare
  // editor body.
  return renderToFile(
    draft.code,
    draft.filename,
    draft.theme,
    1200,
    630,
    toPngFilename(draft.filename, "-og"),
    1,
    null, // no background
    undefined, // padding default
    true, // lineNumbers
    draft.fontId,
    draft.languageOverride,
    null, // no reactions in OG
    false, // showReactions
    true, // showFilename
    true, // showFooter
    authorUsername,
    authorAvatarUrl,
  );
}
