"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { availableThemes, availableLanguages } from "@lumis-sh/lumis/client";
import { Check, ChevronDown, Copy, Download, Shuffle, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  EXPORT_WIDTH,
  EXPORT_MAX_LINES,
  EXPORT_INNER_PADDING,
  EXPORT_BACKGROUNDS,
  EXPORT_BRAND_BACKGROUNDS,
  EXPORT_FONTS,
  EXPORT_FONT_SIZE,
  EXPORT_FONT_SIZE_VALUES,
  exportLineHeightForFontSize,
  normalizeExportFontSize,
  exportCornerRadiusFromSliderIndex,
  exportCornerRadiusToSliderIndex,
  exportInnerPaddingFromSliderIndex,
  exportInnerPaddingToSliderIndex,
  exportOuterPaddingFromSliderIndex,
  exportOuterPaddingToSliderIndex,
  normalizeExportCornerRadius,
  normalizeExportInnerPadding,
  normalizeExportOuterPadding,
  toPngFilename,
  createHighlightedSvg,
  renderToFile,
  inferLanguage,
  triggerDownload,
  estimateExportDimensions,
  type ExportBackground,
  type WindowDecoration,
} from "@/lib/export-utils";
import { languageDisplayName, codePointLength } from "@/lib/snippet-utils";
import { ThemePicker } from "@/components/theme-picker";
import { BrandPicker } from "@/components/brand-picker";
import { BrandSceneDecoration } from "@/components/brand-scene-decoration";
import {
  applyBrandPreset,
  findMatchingBrandPreset,
  normalizeLegacyBrandTheme,
} from "@/lib/brand-presets";
import { HomePresence } from "@/components/home-presence";
import { createBrandCanvasBackground, createBrandFrameShadow } from "@/lib/brand-scenes";
import {
  DEFAULT_FOOTER_SETTINGS,
  DEFAULT_HEADER_SETTINGS,
  normalizeFooterSettings,
  normalizeHeaderSettings,
  visibleFooterItems,
  type ExportFooterSettings,
  type ExportHeaderSettings,
} from "@/lib/export-metadata";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator as UiSeparator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { cn, hasEnvVars } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Spinner } from "@/components/ui/spinner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { publishSnippet } from "@/app/actions/publish";
import { toast } from "sonner";
import { FileImage, FileText } from "lucide-react";

const DRAFT_KEY = "supagist:draft:v1";
const ANNOTATIONS_KEY = "supagist:annotations:v1";
const WINDOW_DECORATION_SCHEMA = 2;
const WINDOW_DECORATIONS: WindowDecoration[] = [
  "macos",
  "macos-subtle",
  "windows",
  "minimal",
  "none",
];
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

export function getEffectiveViewerLabel(viewerLabel: string | null, isDevMode: boolean) {
  return viewerLabel ?? (isDevMode ? "dev" : null);
}

export function getPreviewLineCount(code: string) {
  const sourceLines = code.split("\n");
  const visibleSourceLines = sourceLines.slice(0, EXPORT_MAX_LINES);
  const sourceTruncated = sourceLines.length > EXPORT_MAX_LINES;

  return visibleSourceLines.length + (sourceTruncated ? 1 : 0);
}

export function shouldShowPreviewGutter(
  lineNumbers: boolean,
  reactionActions: boolean,
  commentActions: boolean,
) {
  return lineNumbers || reactionActions || commentActions;
}

export function getPreviewOuterPadding(hasBackground: boolean, outerPadding: number) {
  return hasBackground && outerPadding > 0 ? `min(${outerPadding}px, 10vw)` : 0;
}

export function normalizePersistedWindowDecoration(
  value: unknown,
  schemaVersion?: number,
): WindowDecoration {
  if (value === "minimal" && schemaVersion !== WINDOW_DECORATION_SCHEMA) {
    return "macos-subtle";
  }
  return WINDOW_DECORATIONS.includes(value as WindowDecoration)
    ? (value as WindowDecoration)
    : "macos";
}

type Draft = {
  filename: string;
  code: string;
  theme: string;
  fontId: string;
  fontSize: number;
  languageOverride: string | null;
  background: string | null;
  outerPadding: number;
  innerPadding: number;
  cornerRadius: number;
  pixelRatio: number;
  lineNumbers: boolean;
  showReactions: boolean;
  header: ExportHeaderSettings;
  footer: ExportFooterSettings;
  windowDecoration: WindowDecoration;
};
type DraftAnnotations = {
  reactions: Record<number, string>;
};

export function HomeComposer() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>({
    filename: DEFAULT_FILENAME,
    code: DEFAULT_CODE,
    theme: defaultTheme,
    fontId: "system",
    fontSize: EXPORT_FONT_SIZE,
    languageOverride: null,
    background: null,
    outerPadding: 64,
    innerPadding: EXPORT_INNER_PADDING,
    cornerRadius: 12,
    pixelRatio: 4,
    lineNumbers: false,
    showReactions: false,
    header: DEFAULT_HEADER_SETTINGS,
    footer: DEFAULT_FOOTER_SETTINGS,
    windowDecoration: "macos",
  });
  const [annotations, setAnnotations] = useState<DraftAnnotations>({ reactions: {} });
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedReactionLine, setSelectedReactionLine] = useState<number | null>(null);
  const [viewerLabel, setViewerLabel] = useState<string | null>(null);
  const [viewerAvatar, setViewerAvatar] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [backgroundQuery, setBackgroundQuery] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [showAuthBanner, setShowAuthBanner] = useState(false);
  const authBannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const effectiveViewerLabel = getEffectiveViewerLabel(viewerLabel, DEV_MODE);

  // ── persistence ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const savedDraft = window.localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const p = JSON.parse(savedDraft) as Partial<Draft> & {
          padding?: number;
          showFilename?: boolean;
          showFooter?: boolean;
          windowDecorationSchema?: number;
        };
        setDraft({
          filename: p.filename || DEFAULT_FILENAME,
          code: p.code || DEFAULT_CODE,
          theme: normalizeLegacyBrandTheme(p.theme || defaultTheme),
          fontId: p.fontId ?? "system",
          fontSize: normalizeExportFontSize(p.fontSize ?? EXPORT_FONT_SIZE),
          languageOverride: p.languageOverride ?? null,
          background: p.background ?? null,
          outerPadding: normalizeExportOuterPadding(p.outerPadding ?? p.padding ?? 64),
          innerPadding: normalizeExportInnerPadding(p.innerPadding ?? EXPORT_INNER_PADDING),
          cornerRadius: normalizeExportCornerRadius(p.cornerRadius ?? 12),
          pixelRatio: p.pixelRatio ?? 4,
          lineNumbers: p.lineNumbers ?? false,
          showReactions: p.showReactions ?? false,
          header: normalizeHeaderSettings(p.header, p.showFilename ?? true),
          footer: normalizeFooterSettings(p.footer, p.showFooter ?? false),
          windowDecoration: normalizePersistedWindowDecoration(
            p.windowDecoration,
            p.windowDecorationSchema,
          ),
        });
      } catch {
        window.localStorage.removeItem(DRAFT_KEY);
      }
    }

    const savedAnnotations = window.localStorage.getItem(ANNOTATIONS_KEY);
    if (savedAnnotations) {
      try {
        const p = JSON.parse(savedAnnotations) as Partial<DraftAnnotations>;
        setAnnotations({ reactions: p.reactions || {} });
      } catch {
        window.localStorage.removeItem(ANNOTATIONS_KEY);
      }
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...draft, windowDecorationSchema: WINDOW_DECORATION_SCHEMA }),
    );
    window.localStorage.setItem(ANNOTATIONS_KEY, JSON.stringify(annotations));
  }, [annotations, draft, isHydrated]);

  // ── auth ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasEnvVars) return;

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
  const backgroundOptions = [...EXPORT_BACKGROUNDS, ...EXPORT_BRAND_BACKGROUNDS];
  const filteredBackgroundOptions = backgroundOptions.filter((b) =>
    b.label.toLowerCase().includes(backgroundQuery.trim().toLowerCase()),
  );
  const selectedBackground = backgroundOptions.find((b) => b.label === draft.background) ?? null;
  const selectedBrand = findMatchingBrandPreset(draft);
  const outerCanvasPadding = selectedBackground ? draft.outerPadding : 0;
  const exportReactions = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(annotations.reactions).map(([ln, emoji]) => [
          Number(ln),
          [
            {
              emoji,
              reactors: [{ username: effectiveViewerLabel || "you", avatarUrl: viewerAvatar }],
            },
          ],
        ]),
      ),
    [annotations.reactions, effectiveViewerLabel, viewerAvatar],
  );

  // ── annotation handlers ───────────────────────────────────────────────────────
  const requireAuth = (): boolean => {
    if (DEV_MODE || effectiveViewerLabel) return true;
    if (authBannerTimer.current) clearTimeout(authBannerTimer.current);
    setShowAuthBanner(true);
    authBannerTimer.current = setTimeout(() => setShowAuthBanner(false), 4000);
    return false;
  };

  const handlePickReaction = (lineNumber: number, emoji: string) => {
    if (!requireAuth()) return;
    setAnnotations((c) => {
      const { [lineNumber]: _removed, ...rest } = c.reactions;
      return { ...c, reactions: emoji ? { ...rest, [lineNumber]: emoji } : rest };
    });
    if (emoji) setDraft((current) => ({ ...current, showReactions: true }));
    setSelectedReactionLine(null);
  };

  // ── publish ───────────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    // Anonymous and fully-logged-out visitors both need a real account before
    // the snippet can be attributed. Draft + annotations are already in
    // localStorage (see persistence effect above), so the user picks up
    // exactly where they left off after sign-in.
    if (!effectiveViewerLabel) {
      router.push("/auth/login");
      return;
    }
    if (isOverLimit) {
      toast.error(`Snippet is too long (${charCount.toLocaleString()} / 8,000 chars).`);
      return;
    }

    setIsPublishing(true);
    try {
      // Local draft stores one emoji per line (single user). The export
      // pipeline takes a list of chips (emoji + reactors) so the snippet view
      // can show every unique reaction with the reactor's avatar. Lift the
      // draft into chip shape using the viewer's own username as the reactor.
      const reactorUsername = effectiveViewerLabel || "you";
      const [canonicalFile, ogFile, svgString] = await Promise.all([
        createPreviewImage(draft, selectedBackground, exportReactions),
        createOgImage(draft, reactorUsername, viewerAvatar),
        createHighlightedSvg(
          draft.code,
          draft.filename,
          draft.theme,
          EXPORT_WIDTH,
          undefined,
          selectedBackground,
          outerCanvasPadding,
          draft.lineNumbers,
          draft.fontId,
          draft.languageOverride,
          exportReactions,
          draft.showReactions,
          draft.header.enabled && draft.header.showFilename,
          draft.footer.enabled,
          reactorUsername,
          viewerAvatar,
          undefined,
          false,
          undefined,
          draft.windowDecoration,
          draft.cornerRadius,
          draft.innerPadding,
          draft.header,
          draft.footer,
          draft.fontSize,
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
      formData.set("comments", JSON.stringify({}));

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

  const busy = isPublishing || isExporting;

  const previewLineCount = getPreviewLineCount(draft.code);
  const previewLineHeight = exportLineHeightForFontSize(draft.fontSize);
  const previewHeight = Math.max(previewLineCount, 1) * previewLineHeight + draft.innerPadding * 2;
  const showPreviewGutter = shouldShowPreviewGutter(draft.lineNumbers, true, true);
  const previewCanvasPadding = getPreviewOuterPadding(
    Boolean(selectedBackground),
    outerCanvasPadding,
  );
  const canvasStyle = selectedBackground
    ? {
        backgroundImage: selectedBackground.scene
          ? createBrandCanvasBackground(
              selectedBackground.scene,
              selectedBackground.from,
              selectedBackground.to,
              selectedBackground.patternUrl,
            )
          : `linear-gradient(135deg, ${selectedBackground.from}, ${selectedBackground.to})`,
        backgroundSize: selectedBackground.patternUrl ? "cover" : undefined,
        backgroundPosition: "center",
        borderRadius: selectedBackground.scene?.canvasRadius,
        boxShadow: selectedBackground.scene
          ? `inset 0 0 0 1px ${selectedBackground.scene.canvasBorder}, 0 24px 64px -36px rgba(0,0,0,0.62)`
          : undefined,
        padding: previewCanvasPadding,
      }
    : { padding: 0 };
  const previewFrameBorder = selectedBackground?.frame?.cardBorder;
  const previewFrameShadow = selectedBackground?.scene
    ? createBrandFrameShadow(selectedBackground.scene)
    : selectedBackground?.frame
      ? previewFrameBorder
        ? `0 0 0 ${previewFrameBorder.width}px ${previewFrameBorder.color}, 0 25px 50px -12px rgba(0,0,0,0.42)`
        : "0 25px 50px -12px rgba(0,0,0,0.42)"
      : undefined;
  const exportDimensions = estimateExportDimensions({
    code: draft.code,
    filename: draft.filename,
    language,
    theme: draft.theme,
    background: selectedBackground,
    outerPadding: outerCanvasPadding,
    lineNumbers: draft.lineNumbers,
    reactions: exportReactions,
    showReactions: draft.showReactions,
    showFooter: draft.footer.enabled,
    header: draft.header,
    footer: draft.footer,
    footerAuthorUsername: effectiveViewerLabel || "you",
    windowDecoration: draft.windowDecoration,
    innerPadding: draft.innerPadding,
    fontSize: draft.fontSize,
    compactReactions: true,
  });
  const previewFontFamily = EXPORT_FONTS.find((font) => font.id === draft.fontId)?.family;
  const previewCardWidth = exportDimensions.width - outerCanvasPadding * 2;
  const previewCardMaxWidth = selectedBackground ? "100%" : "calc(100vw - 4rem)";

  const handleExportPng = async () => {
    setExportMenuOpen(false);
    setIsExporting(true);
    try {
      const file = await renderToFile(
        draft.code,
        draft.filename,
        draft.theme,
        EXPORT_WIDTH,
        undefined,
        toPngFilename(draft.filename),
        draft.pixelRatio,
        selectedBackground,
        outerCanvasPadding,
        draft.lineNumbers,
        draft.fontId,
        draft.languageOverride,
        exportReactions,
        draft.showReactions,
        draft.header.enabled && draft.header.showFilename,
        draft.footer.enabled,
        effectiveViewerLabel || "you",
        viewerAvatar,
        undefined,
        false,
        undefined,
        draft.windowDecoration,
        draft.cornerRadius,
        draft.innerPadding,
        draft.header,
        draft.footer,
        draft.fontSize,
      );
      triggerDownload(URL.createObjectURL(file), file.name, true);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSvg = async () => {
    setExportMenuOpen(false);
    setIsExporting(true);
    try {
      const svg = await createHighlightedSvg(
        draft.code,
        draft.filename,
        draft.theme,
        EXPORT_WIDTH,
        undefined,
        selectedBackground,
        outerCanvasPadding,
        draft.lineNumbers,
        draft.fontId,
        draft.languageOverride,
        exportReactions,
        draft.showReactions,
        draft.header.enabled && draft.header.showFilename,
        draft.footer.enabled,
        effectiveViewerLabel || "you",
        viewerAvatar,
        undefined,
        false,
        undefined,
        draft.windowDecoration,
        draft.cornerRadius,
        draft.innerPadding,
        draft.header,
        draft.footer,
        draft.fontSize,
      );
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      triggerDownload(
        URL.createObjectURL(blob),
        toPngFilename(draft.filename).replace(".png", ".svg"),
        true,
      );
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadRaw = () => {
    setExportMenuOpen(false);
    const blob = new Blob([draft.code], { type: "text/plain;charset=utf-8" });
    triggerDownload(URL.createObjectURL(blob), draft.filename || "snippet.txt", true);
  };

  const handleCopy = () => {
    setExportMenuOpen(false);
    void navigator.clipboard.writeText(draft.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const actionButtonClass =
    "h-11 border-border-control bg-surface-200 text-foreground hover:bg-surface-300 hover:text-foreground";
  const panelLabelClass = "text-xs font-medium text-foreground-lighter";
  const panelControlClass =
    "h-11 rounded-md border border-border-control bg-surface-200 px-3 text-sm text-foreground outline-hidden transition focus-visible:ring-2 focus-visible:ring-ring/50";
  const menuItemClass =
    "h-11 justify-start text-foreground-light hover:bg-surface-300 hover:text-foreground";
  const selectedBackgroundStyle = selectedBackground
    ? selectedBackground.patternUrl
      ? {
          backgroundImage: `url(${selectedBackground.patternUrl}), linear-gradient(135deg, ${selectedBackground.from}, ${selectedBackground.to})`,
          backgroundSize: "cover, cover",
          backgroundPosition: "center, center",
        }
      : {
          background: `linear-gradient(135deg, ${selectedBackground.from}, ${selectedBackground.to})`,
        }
    : undefined;
  const footerItems = visibleFooterItems(draft.footer);
  const footerAlignmentClass =
    draft.footer.alignment === "center"
      ? "justify-center"
      : draft.footer.alignment === "right"
        ? "justify-end"
        : "justify-start";
  const previewFooter =
    draft.footer.enabled && footerItems.length > 0 ? (
      <div
        className={cn(
          "flex min-w-0 flex-nowrap items-center gap-3 overflow-hidden",
          footerAlignmentClass,
        )}
      >
        {footerItems.includes("language") ? (
          <span className="shrink-0">{languageDisplayName(language)}</span>
        ) : null}
        {footerItems.includes("theme") ? (
          <span className="min-w-0 truncate" title={draft.theme}>
            {draft.theme}
          </span>
        ) : null}
        {footerItems.includes("lineCount") ? (
          <span className="shrink-0">{lineCount} lines</span>
        ) : null}
        {footerItems.includes("charCount") ? (
          <span className={cn("shrink-0", isOverLimit && "font-medium text-destructive")}>
            {charCount.toLocaleString()} / 8,000
          </span>
        ) : null}
        {footerItems.includes("author") && effectiveViewerLabel ? (
          <span className="flex max-w-32 shrink-0 items-center gap-1.5">
            <UserAvatar username={effectiveViewerLabel} avatarUrl={viewerAvatar} size="xs" />
            <span className="truncate">@{effectiveViewerLabel}</span>
          </span>
        ) : null}
      </div>
    ) : null;

  return (
    <section
      data-testid="composer-shell"
      className="-mx-5 -mt-10 flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden bg-background-alternative text-foreground lg:-mx-5 lg:-mt-16 xl:-mx-[calc((100vw-72rem)/2+1.25rem)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-100/95 px-5 py-3 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-md border border-brand/20 bg-brand-subtle font-mono text-xs text-brand-strong">
            &lt;/&gt;
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
              Create a snippet
            </h1>
            <p className="truncate text-xs text-foreground-lighter">
              Realtime code sharing, powered by Supabase
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-foreground-muted">
          {hasEnvVars ? <HomePresence /> : null}
          {!DEV_MODE && (isAnonymous || !viewerLabel) && isHydrated ? (
            <span>Log in to save snippets.</span>
          ) : null}
        </div>
      </div>

      <div
        data-testid="composer-main"
        className="grid min-h-0 flex-1 grid-rows-[clamp(13rem,34dvh,22rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_28rem] lg:grid-rows-1"
      >
        <div
          data-testid="preview-pane"
          className="relative flex min-h-0 items-center justify-center overflow-auto p-4 sm:p-6 lg:p-8"
        >
          {showAuthBanner ? (
            <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between rounded-md border border-border bg-surface-100 px-4 py-2.5 text-sm text-foreground shadow-lg sm:left-auto sm:right-8 sm:w-96">
              <span>Log in to enable all features.</span>
              <div className="flex items-center gap-1">
                <Button type="button" size="xs" onClick={() => router.push("/auth/login")}>
                  Log in
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setShowAuthBanner(false)}
                  aria-label="Dismiss"
                >
                  <X />
                </Button>
              </div>
            </div>
          ) : null}

          <div
            className={cn(
              "relative isolate box-border max-w-full overflow-hidden rounded-sm transition-all",
            )}
            style={
              {
                ...canvasStyle,
                "--preview-outer-padding": previewCanvasPadding,
              } as React.CSSProperties & { "--preview-outer-padding": string | number }
            }
          >
            {selectedBackground?.scene ? (
              <BrandSceneDecoration scene={selectedBackground.scene} />
            ) : null}
            <InlineCodeBlock
              className={cn(
                "relative z-10 mx-auto max-w-full overflow-hidden shadow-2xl",
                selectedBackground?.frame ? "ring-0" : "ring-1 ring-black/10",
              )}
              style={{
                width: previewCardWidth,
                maxWidth: previewCardMaxWidth,
                borderRadius: draft.cornerRadius,
                boxShadow: previewFrameShadow,
              }}
              bodyHeight={previewHeight}
              innerPadding={draft.innerPadding}
              showGutter={showPreviewGutter}
              showLineNumbers={draft.lineNumbers}
              showScrollbars={false}
              showInlineComments={false}
              showCommentActions
              compactGutter
              windowDecoration={draft.windowDecoration}
              brandFrame={selectedBackground?.frame}
              filename={draft.filename}
              header={draft.header}
              code={draft.code}
              theme={draft.theme}
              fontFamily={previewFontFamily}
              fontSize={draft.fontSize}
              language={draft.languageOverride}
              comments={{}}
              reactions={draft.showReactions ? annotations.reactions : {}}
              selectedCommentLine={null}
              selectedReactionLine={selectedReactionLine}
              onCodeChange={(code) => setDraft((d) => ({ ...d, code }))}
              onSelectCommentLine={() => {
                toast.info("Save the snippet to add comments.");
              }}
              onSelectReactionLine={(ln) => {
                if (!ln) {
                  setSelectedReactionLine(null);
                  return;
                }
                if (!requireAuth()) return;
                setSelectedReactionLine(ln);
              }}
              onPickReaction={handlePickReaction}
              showChromeActions={false}
              footer={previewFooter}
            />
          </div>
        </div>

        <div
          data-testid="composer-workspace"
          className="relative flex min-h-0 w-full flex-col overflow-hidden border-t border-border bg-surface-100 lg:border-l lg:border-t-0"
        >
          <ScrollArea data-testid="customization-scroll" type="hover" className="min-h-0 flex-1">
            <div className="min-w-0 p-4 lg:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="text-base font-semibold text-foreground">Customize</span>
                <span className="hidden truncate text-xs text-foreground-muted sm:block">
                  Start with the essentials, then fine-tune if needed
                </span>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className={panelLabelClass}>Brand</span>
                  <BrandPicker
                    value={selectedBrand?.id ?? null}
                    onChange={(preset) => setDraft((current) => applyBrandPreset(current, preset))}
                  />
                </div>

                <div className="flex min-w-0 flex-col gap-1">
                  <span className={panelLabelClass}>Theme</span>
                  <div className="flex h-11 items-center overflow-hidden rounded-md border border-border-control bg-surface-200 text-foreground">
                    <ThemePicker
                      value={draft.theme}
                      onChange={(next) => setDraft((d) => ({ ...d, theme: next }))}
                      themes={themes.map((t) => ({ id: t.name, label: t.name }))}
                      triggerClassName="min-w-0 flex-1 text-foreground"
                      iconColor="hsl(var(--foreground-muted))"
                    />
                    <div className="w-px self-stretch bg-border" />
                    <button
                      type="button"
                      title="Random theme"
                      aria-label="Random theme"
                      className="flex h-full w-11 shrink-0 items-center justify-center text-foreground-lighter transition-colors hover:bg-surface-300 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
                      onClick={() => {
                        const others = themes.filter((t) => t.name !== draft.theme);
                        const pick = others[Math.floor(Math.random() * others.length)];
                        if (pick) setDraft((d) => ({ ...d, theme: pick.name }));
                      }}
                    >
                      <Shuffle data-icon="inline-start" />
                    </button>
                  </div>
                </div>

                <label className="flex min-w-0 flex-col gap-1">
                  <span className={panelLabelClass}>File</span>
                  <Input
                    className="h-11 rounded-md border-border-control bg-surface-200 font-mono text-sm text-foreground shadow-none placeholder:text-foreground-muted"
                    value={draft.filename}
                    onChange={(e) => setDraft((d) => ({ ...d, filename: e.target.value }))}
                    placeholder="snippet.tsx"
                    aria-label="Filename"
                  />
                </label>

                <div className="flex min-w-0 flex-col gap-1">
                  <span className={panelLabelClass}>Background</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex h-11 min-w-0 items-center gap-2 rounded-md border border-border-control bg-surface-200 px-3 text-sm text-foreground transition hover:border-border-strong focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <span
                          className={cn(
                            "size-4 shrink-0 rounded-full border border-border-strong",
                            !selectedBackground ? "bg-transparent" : "",
                          )}
                          style={selectedBackgroundStyle}
                        />
                        <span className="truncate">{selectedBackground?.label ?? "None"}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="top"
                      align="start"
                      className="w-[min(92vw,360px)] border-border bg-popover text-popover-foreground"
                    >
                      <div className="flex flex-col gap-3">
                        <div>
                          <p className="text-sm font-medium">Background</p>
                          <p className="text-xs text-foreground-lighter">
                            Search or choose the outer canvas.
                          </p>
                        </div>
                        <Input
                          value={backgroundQuery}
                          onChange={(e) => setBackgroundQuery(e.target.value)}
                          placeholder="Search backgrounds"
                          className="h-11 rounded-md border-border-control bg-surface-200 text-foreground placeholder:text-foreground-muted"
                        />
                        <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1">
                          <button
                            type="button"
                            onClick={() => setDraft((d) => ({ ...d, background: null }))}
                            className={cn(
                              "flex h-11 items-center gap-2 rounded-md border px-3 text-sm transition",
                              !draft.background
                                ? "border-brand/40 bg-brand-subtle text-brand-strong"
                                : "border-border text-foreground-lighter hover:border-border-strong",
                            )}
                          >
                            <span className="size-4 rounded-full border border-current" />
                            None
                          </button>
                          {filteredBackgroundOptions.map((b) => (
                            <button
                              key={b.label}
                              type="button"
                              onClick={() => setDraft((d) => ({ ...d, background: b.label }))}
                              className={cn(
                                "flex h-11 min-w-0 items-center gap-2 rounded-md border px-3 text-left text-sm transition",
                                draft.background === b.label
                                  ? "border-brand/40 bg-brand-subtle text-brand-strong"
                                  : "border-border text-foreground-lighter hover:border-border-strong",
                              )}
                            >
                              <span
                                className="size-4 shrink-0 rounded-full border border-border-strong"
                                style={
                                  b.patternUrl
                                    ? {
                                        backgroundImage: `url(${b.patternUrl}), linear-gradient(135deg, ${b.from}, ${b.to})`,
                                        backgroundSize: "cover, cover",
                                        backgroundPosition: "center, center",
                                      }
                                    : { background: `linear-gradient(135deg, ${b.from}, ${b.to})` }
                                }
                              />
                              <span className="truncate">{b.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <Collapsible
                  open={advancedOpen}
                  onOpenChange={setAdvancedOpen}
                  className="col-span-full"
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 w-full justify-between px-3 text-foreground-light hover:bg-surface-200 hover:text-foreground"
                    >
                      Advanced settings
                      <ChevronDown
                        data-icon="inline-end"
                        className={cn("transition-transform", advancedOpen && "rotate-180")}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-medium text-foreground-muted">
                          Code and frame
                        </span>
                        <div className="grid min-w-0 grid-cols-2 gap-3">
                          <div className="flex min-w-0 flex-col gap-1">
                            <span className={panelLabelClass}>Language</span>
                            <Select
                              value={draft.languageOverride ?? "__auto"}
                              onValueChange={(value) =>
                                setDraft((d) => ({
                                  ...d,
                                  languageOverride: value === "__auto" ? null : value,
                                }))
                              }
                            >
                              <SelectTrigger aria-label="Language" className={panelControlClass}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent side="top" position="popper">
                                <SelectGroup>
                                  <SelectItem value="__auto">Auto</SelectItem>
                                  {languages.map((l) => (
                                    <SelectItem key={l.id} value={l.id}>
                                      {l.id}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex min-w-0 flex-col gap-1">
                            <span className={panelLabelClass}>Font</span>
                            <Select
                              value={draft.fontId}
                              onValueChange={(fontId) => setDraft((d) => ({ ...d, fontId }))}
                            >
                              <SelectTrigger aria-label="Font" className={panelControlClass}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent side="top" position="popper">
                                <SelectGroup>
                                  {EXPORT_FONTS.map((f) => (
                                    <SelectItem key={f.id} value={f.id}>
                                      {f.label}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex min-w-0 flex-col gap-1">
                            <span className={panelLabelClass}>Font size</span>
                            <Select
                              value={String(draft.fontSize)}
                              onValueChange={(fontSize) =>
                                setDraft((d) => ({ ...d, fontSize: Number(fontSize) }))
                              }
                            >
                              <SelectTrigger aria-label="Font size" className={panelControlClass}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent side="top" position="popper">
                                <SelectGroup>
                                  {EXPORT_FONT_SIZE_VALUES.map((size) => (
                                    <SelectItem key={size} value={String(size)}>
                                      {size}px
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex min-w-0 flex-col gap-1">
                            <span className={panelLabelClass}>Window</span>
                            <Select
                              value={draft.windowDecoration}
                              onValueChange={(windowDecoration) =>
                                setDraft((d) => ({
                                  ...d,
                                  windowDecoration: windowDecoration as WindowDecoration,
                                }))
                              }
                            >
                              <SelectTrigger aria-label="Window" className={panelControlClass}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent side="top" position="popper">
                                <SelectGroup>
                                  <SelectItem value="macos">macOS</SelectItem>
                                  <SelectItem value="macos-subtle">macOS Subtle</SelectItem>
                                  <SelectItem value="windows">Windows</SelectItem>
                                  <SelectItem value="minimal">Minimal</SelectItem>
                                  <SelectItem value="none">None</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex min-w-0 flex-col gap-1">
                            <span className={panelLabelClass}>Scale</span>
                            <Select
                              value={String(draft.pixelRatio)}
                              onValueChange={(pixelRatio) =>
                                setDraft((d) => ({ ...d, pixelRatio: Number(pixelRatio) }))
                              }
                            >
                              <SelectTrigger aria-label="Scale" className={panelControlClass}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent side="top" position="popper">
                                <SelectGroup>
                                  {[2, 4, 6].map((pixelRatio) => (
                                    <SelectItem key={pixelRatio} value={String(pixelRatio)}>
                                      {pixelRatio}x
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <UiSeparator />
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-medium text-foreground-muted">
                          Spacing and shape
                        </span>
                        <div className="grid min-w-0 gap-3">
                          <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className={panelLabelClass}>Outer padding</span>
                              <output className="shrink-0 text-xs tabular-nums text-foreground-lighter">
                                {draft.outerPadding}px
                              </output>
                            </div>
                            <Slider
                              aria-label="Outer padding"
                              aria-valuetext={
                                draft.outerPadding === 0
                                  ? "No outer padding"
                                  : `${draft.outerPadding} pixels`
                              }
                              value={[exportOuterPaddingToSliderIndex(draft.outerPadding)]}
                              onValueChange={([index = 0]) =>
                                setDraft((d) => ({
                                  ...d,
                                  outerPadding: exportOuterPaddingFromSliderIndex(index),
                                }))
                              }
                              min={0}
                              max={5}
                              step={1}
                              disabled={!selectedBackground}
                              className="h-11"
                            />
                          </div>
                          <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className={panelLabelClass}>Inner padding</span>
                              <output className="shrink-0 text-xs tabular-nums text-foreground-lighter">
                                {draft.innerPadding}px
                              </output>
                            </div>
                            <Slider
                              aria-label="Inner padding"
                              aria-valuetext={`${draft.innerPadding} pixels`}
                              value={[exportInnerPaddingToSliderIndex(draft.innerPadding)]}
                              onValueChange={([index = 0]) =>
                                setDraft((d) => ({
                                  ...d,
                                  innerPadding: exportInnerPaddingFromSliderIndex(index),
                                }))
                              }
                              min={0}
                              max={5}
                              step={1}
                              className="h-11"
                            />
                          </div>
                          <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className={panelLabelClass}>Corners</span>
                              <output className="shrink-0 text-xs tabular-nums text-foreground-lighter">
                                {draft.cornerRadius}px
                              </output>
                            </div>
                            <Slider
                              aria-label="Corner radius"
                              aria-valuetext={
                                draft.cornerRadius === 0
                                  ? "Square corners"
                                  : `${draft.cornerRadius} pixels`
                              }
                              value={[exportCornerRadiusToSliderIndex(draft.cornerRadius)]}
                              onValueChange={([index = 0]) =>
                                setDraft((d) => ({
                                  ...d,
                                  cornerRadius: exportCornerRadiusFromSliderIndex(index),
                                }))
                              }
                              min={0}
                              max={4}
                              step={1}
                              className="h-11"
                            />
                          </div>
                        </div>
                      </div>
                      <UiSeparator />
                      <div className="flex flex-col gap-4">
                        <span className="text-xs font-medium text-foreground-muted">
                          Visible details
                        </span>
                        <div className="flex min-w-0 flex-wrap items-center gap-x-8 gap-y-1">
                          {[
                            ["Line numbers", "lineNumbers"],
                            ["Reactions", "showReactions"],
                          ].map(([label, key]) => {
                            const enabled = Boolean(draft[key as "lineNumbers" | "showReactions"]);
                            return (
                              <label
                                key={key}
                                className="inline-flex h-11 w-fit cursor-pointer items-center gap-3"
                              >
                                <span className={panelLabelClass}>{label}</span>
                                <Switch
                                  checked={enabled}
                                  onCheckedChange={(checked) =>
                                    setDraft((d) => ({ ...d, [key]: checked }))
                                  }
                                  aria-label={label}
                                  className="h-6 w-11 shrink-0 data-[state=checked]:bg-brand data-[state=unchecked]:bg-surface-300 **:data-[slot=switch-thumb]:size-5 **:data-[slot=switch-thumb]:bg-white"
                                />
                              </label>
                            );
                          })}
                        </div>

                        <UiSeparator />
                        <section
                          aria-labelledby="header-settings-label"
                          className="flex flex-col gap-3"
                        >
                          <div className="flex min-h-11 items-center justify-between gap-4">
                            <div className="min-w-0">
                              <h3
                                id="header-settings-label"
                                className="text-sm font-medium text-foreground"
                              >
                                Header
                              </h3>
                              <p className="text-xs text-foreground-muted">
                                Window chrome and identifying details
                              </p>
                            </div>
                            <Switch
                              checked={draft.header.enabled}
                              onCheckedChange={(enabled) =>
                                setDraft((d) => ({ ...d, header: { ...d.header, enabled } }))
                              }
                              aria-label="Show header"
                              className="h-6 w-11 shrink-0 data-[state=checked]:bg-brand data-[state=unchecked]:bg-surface-300 **:data-[slot=switch-thumb]:size-5 **:data-[slot=switch-thumb]:bg-white"
                            />
                          </div>
                          <div
                            className={cn(
                              "flex flex-col gap-2 pl-3",
                              !draft.header.enabled && "pointer-events-none opacity-45",
                            )}
                          >
                            {(
                              [
                                ["Filename", "showFilename", "filenamePosition"],
                                ["Language", "showLanguage", "languagePosition"],
                              ] as const
                            ).map(([label, visibilityKey, positionKey]) => (
                              <div
                                key={visibilityKey}
                                className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3"
                              >
                                <label className="inline-flex h-11 w-28 cursor-pointer items-center justify-between gap-2">
                                  <span className={panelLabelClass}>{label}</span>
                                  <Switch
                                    checked={draft.header[visibilityKey]}
                                    onCheckedChange={(checked) =>
                                      setDraft((d) => ({
                                        ...d,
                                        header: { ...d.header, [visibilityKey]: checked },
                                      }))
                                    }
                                    aria-label={`Show header ${label.toLowerCase()}`}
                                  />
                                </label>
                                <ToggleGroup
                                  type="single"
                                  variant="outline"
                                  value={draft.header[positionKey]}
                                  onValueChange={(position) => {
                                    if (!position) return;
                                    setDraft((d) => ({
                                      ...d,
                                      header: {
                                        ...d.header,
                                        [positionKey]: position,
                                      },
                                    }));
                                  }}
                                  aria-label={`${label} position`}
                                  className="grid w-full grid-cols-3"
                                >
                                  {(["left", "center", "right"] as const).map((position) => (
                                    <ToggleGroupItem
                                      key={position}
                                      value={position}
                                      aria-label={`${position} aligned ${label.toLowerCase()}`}
                                      className="h-11 px-2 capitalize"
                                    >
                                      {position}
                                    </ToggleGroupItem>
                                  ))}
                                </ToggleGroup>
                              </div>
                            ))}
                          </div>
                        </section>

                        <UiSeparator />
                        <section
                          aria-labelledby="footer-settings-label"
                          className="flex flex-col gap-3"
                        >
                          <div className="flex min-h-11 items-center justify-between gap-4">
                            <div className="min-w-0">
                              <h3
                                id="footer-settings-label"
                                className="text-sm font-medium text-foreground"
                              >
                                Footer
                              </h3>
                              <p className="text-xs text-foreground-muted">
                                Choose exactly which export details appear
                              </p>
                            </div>
                            <Switch
                              checked={draft.footer.enabled}
                              onCheckedChange={(enabled) =>
                                setDraft((d) => ({ ...d, footer: { ...d.footer, enabled } }))
                              }
                              aria-label="Show footer"
                              className="h-6 w-11 shrink-0 data-[state=checked]:bg-brand data-[state=unchecked]:bg-surface-300 **:data-[slot=switch-thumb]:size-5 **:data-[slot=switch-thumb]:bg-white"
                            />
                          </div>
                          <div
                            className={cn(
                              "flex flex-col gap-3 pl-3",
                              !draft.footer.enabled && "pointer-events-none opacity-45",
                            )}
                          >
                            <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-1">
                              {[
                                ["Language", "showLanguage"],
                                ["Theme", "showTheme"],
                                ["Line count", "showLineCount"],
                                ["Characters", "showCharCount"],
                                ["Author", "showAuthor"],
                              ].map(([label, key]) => (
                                <label
                                  key={key}
                                  className="inline-flex h-11 w-fit cursor-pointer items-center gap-3"
                                >
                                  <span className={panelLabelClass}>{label}</span>
                                  <Switch
                                    checked={
                                      draft.footer[
                                        key as
                                          | "showLanguage"
                                          | "showTheme"
                                          | "showLineCount"
                                          | "showCharCount"
                                          | "showAuthor"
                                      ]
                                    }
                                    onCheckedChange={(checked) =>
                                      setDraft((d) => ({
                                        ...d,
                                        footer: { ...d.footer, [key]: checked },
                                      }))
                                    }
                                    aria-label={`Show footer ${label.toLowerCase()}`}
                                  />
                                </label>
                              ))}
                            </div>
                            <div className="flex min-w-0 flex-col gap-1 sm:max-w-sm">
                              <span className={panelLabelClass}>Position</span>
                              <ToggleGroup
                                type="single"
                                variant="outline"
                                value={draft.footer.alignment}
                                onValueChange={(alignment) => {
                                  if (!alignment) return;
                                  setDraft((d) => ({
                                    ...d,
                                    footer: {
                                      ...d.footer,
                                      alignment: alignment as ExportFooterSettings["alignment"],
                                    },
                                  }));
                                }}
                                aria-label="Footer position"
                                className="grid w-full grid-cols-3"
                              >
                                {(["left", "center", "right"] as const).map((alignment) => (
                                  <ToggleGroupItem
                                    key={alignment}
                                    value={alignment}
                                    aria-label={`${alignment} aligned footer`}
                                    className="h-11 px-2 capitalize"
                                  >
                                    {alignment}
                                  </ToggleGroupItem>
                                ))}
                              </ToggleGroup>
                            </div>
                          </div>
                        </section>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </ScrollArea>

          <div
            data-testid="composer-actions"
            className="flex min-w-0 shrink-0 flex-col gap-3 border-t border-border bg-surface-100 p-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-foreground">
                Export or publish
              </span>
              <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs text-foreground-muted sm:justify-end">
                <span className="font-mono">
                  {exportDimensions.width} × {exportDimensions.height}px
                </span>
                <span className="font-mono">{lineCount} lines</span>
                <span className={cn("font-mono", isOverLimit && "font-medium text-destructive")}>
                  {charCount.toLocaleString()} / 8,000 characters
                </span>
              </div>
            </div>

            <ButtonGroup className="grid w-full grid-cols-2 font-sans">
              <Popover open={exportMenuOpen} onOpenChange={setExportMenuOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" disabled={busy} className={actionButtonClass}>
                    {isExporting ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <Download data-icon="inline-start" />
                    )}
                    Export
                    <ChevronDown data-icon="inline-end" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="end"
                  className="w-64 border-border bg-popover p-2 text-popover-foreground"
                >
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={handleCopy}
                      className={menuItemClass}
                    >
                      {copied ? (
                        <Check data-icon="inline-start" />
                      ) : (
                        <Copy data-icon="inline-start" />
                      )}
                      {copied ? "Copied" : "Copy code"}
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void handleExportPng()}
                      className={menuItemClass}
                    >
                      <Download data-icon="inline-start" />
                      PNG image
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void handleExportSvg()}
                      className={menuItemClass}
                    >
                      <FileImage data-icon="inline-start" />
                      SVG image
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={handleDownloadRaw}
                      className={menuItemClass}
                    >
                      <FileText data-icon="inline-start" />
                      Source file
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                disabled={busy || (Boolean(effectiveViewerLabel) && isOverLimit)}
                onClick={handlePublish}
                className="h-11"
              >
                {isPublishing ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <Upload data-icon="inline-start" />
                )}
                Publish
              </Button>
            </ButtonGroup>
          </div>
        </div>
      </div>
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
    background ? draft.outerPadding : undefined,
    draft.lineNumbers,
    draft.fontId,
    draft.languageOverride,
    reactions,
    draft.showReactions,
    draft.header.enabled && draft.header.showFilename,
    draft.footer.enabled,
    undefined,
    undefined,
    undefined,
    false,
    undefined,
    draft.windowDecoration,
    draft.cornerRadius,
    draft.innerPadding,
    draft.header,
    draft.footer,
    draft.fontSize,
  );
}

async function createOgImage(
  draft: Draft,
  authorUsername: string,
  authorAvatarUrl: string | null,
): Promise<File> {
  // OG images must be exactly 1200×630 — no retina scaling or platforms reject them.
  // Metadata selections mirror the canonical export so shared previews stay
  // faithful to the composition the author configured.
  return renderToFile(
    draft.code,
    draft.filename,
    draft.theme,
    1200,
    630,
    toPngFilename(draft.filename, "-og"),
    1,
    null, // no background
    undefined, // outer padding default
    true, // lineNumbers
    draft.fontId,
    draft.languageOverride,
    null, // no reactions in OG
    false, // showReactions
    draft.header.enabled && draft.header.showFilename,
    draft.footer.enabled,
    authorUsername,
    authorAvatarUrl,
    undefined,
    false,
    undefined,
    draft.windowDecoration,
    draft.cornerRadius,
    draft.innerPadding,
    draft.header,
    draft.footer,
    draft.fontSize,
  );
}
