"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { availableThemes, availableLanguages } from "@lumis-sh/lumis/client";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  Lock,
  Shuffle,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
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
  triggerDownload,
  estimateExportDimensions,
  EXPORT_CANVAS_16_9,
  type ExportAspectRatio,
  type WindowDecoration,
} from "@/lib/export-utils";
import {
  inferLanguage,
  languageDisplayName,
  codePointLength,
  normalizeSnippetCode,
} from "@/lib/snippet-utils";
import { ThemePicker } from "@/components/theme-picker";
import { BrandPicker } from "@/components/brand-picker";
import { SendEnvelope } from "@/components/brand/hero-envelope";
import {
  BackgroundDecoration,
  backgroundCanvasStyle,
  backgroundFrameShadow,
} from "@/components/brand-scene-decoration";
import { findMatchingBrandPreset, normalizeLegacyBrandTheme } from "@/lib/brand-presets";
import {
  backgroundSource,
  draftBrand,
  pickBrandPreset,
  withDefaultBackground,
} from "@/lib/brand-background";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SNIPPET_VISIBILITIES, type SnippetVisibility } from "@/lib/snippet-visibility";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { publishSnippet } from "@/app/actions/publish";
import { createDraftPng, createDraftSvg, createSnippetImages } from "@/lib/snippet-images";
import { WINDOW_DECORATIONS, parseSnippetAppearance } from "@/lib/snippet-appearance";
import { toast } from "sonner";
import { EDIT_HINT_KEY, markJustPublished, play, pressIntroSeal } from "@/lib/motion";
import { ClipboardType, FileImage, FileText } from "lucide-react";
import { copyRichText, createRichTextClipboard } from "@/lib/rich-text-export";

const DRAFT_KEY = "supagist:draft:v1";
const ANNOTATIONS_KEY = "supagist:annotations:v1";
const WINDOW_DECORATION_SCHEMA = 2;
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
  /** See BrandDraft: the Brand picked last and whether Background was picked by hand. */
  brandId: string | null;
  backgroundOverride: boolean;
  outerPadding: number;
  innerPadding: number;
  cornerRadius: number;
  pixelRatio: number;
  lineNumbers: boolean;
  showReactions: boolean;
  header: ExportHeaderSettings;
  footer: ExportFooterSettings;
  windowDecoration: WindowDecoration;
  aspectRatio: ExportAspectRatio | null;
  ligatures: boolean;
};
type DraftAnnotations = {
  reactions: Record<number, string>;
};

type HomeComposerProps = {
  /**
   * The home page shows a teaser: a wide preview with the basic options. The
   * full-screen editor at /compose shows every setting. Both edit the same
   * localStorage draft, so moving between them keeps the work.
   */
  full?: boolean;
};

export function HomeComposer({ full = false }: HomeComposerProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>({
    filename: DEFAULT_FILENAME,
    code: DEFAULT_CODE,
    theme: defaultTheme,
    fontId: "system",
    fontSize: EXPORT_FONT_SIZE,
    languageOverride: null,
    background: null,
    brandId: null,
    backgroundOverride: false,
    outerPadding: 64,
    innerPadding: EXPORT_INNER_PADDING,
    cornerRadius: 12,
    pixelRatio: 4,
    lineNumbers: false,
    showReactions: false,
    header: DEFAULT_HEADER_SETTINGS,
    footer: DEFAULT_FOOTER_SETTINGS,
    windowDecoration: "macos",
    aspectRatio: null,
    ligatures: true,
  });
  const [annotations, setAnnotations] = useState<DraftAnnotations>({ reactions: {} });
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedReactionLine, setSelectedReactionLine] = useState<number | null>(null);
  const [viewerLabel, setViewerLabel] = useState<string | null>(null);
  const [viewerAvatar, setViewerAvatar] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  /** The snippet just published, while the envelope carries it off. */
  const [sentPath, setSentPath] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<SnippetVisibility>("public");
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [backgroundQuery, setBackgroundQuery] = useState("");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [showAuthBanner, setShowAuthBanner] = useState(false);
  // The home card's "click and type" hint, until the visitor first edits it.
  const [hintSeen, setHintSeen] = useState(false);
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
        const restored = {
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
          aspectRatio: p.aspectRatio === "16:9" ? ("16:9" as const) : null,
          ligatures: p.ligatures ?? true,
        };
        // Drafts saved before Background followed Brand: a background that
        // is not its Brand's own was picked by hand, so it stays put.
        const brand = findMatchingBrandPreset(restored);
        setDraft({
          ...restored,
          brandId: typeof p.brandId === "string" ? p.brandId : (brand?.id ?? null),
          backgroundOverride:
            typeof p.backgroundOverride === "boolean"
              ? p.backgroundOverride
              : restored.background !== null && !brand,
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

    setHintSeen(window.localStorage.getItem(EDIT_HINT_KEY) !== null);
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
        return;
      }

      if (user.is_anonymous) {
        setViewerLabel(null);
        setViewerAvatar(null);
        return;
      }

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
  // The editor keeps what the author typed; images, counts and the published
  // snippet use the trimmed code.
  const publishedCode = useMemo(() => normalizeSnippetCode(draft.code), [draft.code]);
  const lineCount = publishedCode.split("\n").length;
  // Counts Unicode code points so the footer matches Postgres char_length()
  // — see codePointLength docs.
  const charCount = codePointLength(publishedCode);
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
  const selectedBrand = draftBrand(draft);
  const selectedBackgroundSource = backgroundSource(draft);

  // Theme, brand and background changes fade the preview in instead of
  // snapping (opacity only; none with reduced motion).
  const previewCanvasRef = useRef<HTMLDivElement | null>(null);
  const previewLook = `${draft.theme}|${draft.background ?? ""}|${selectedBrand?.id ?? ""}`;
  const lastPreviewLook = useRef(previewLook);
  useEffect(() => {
    if (lastPreviewLook.current === previewLook) return;
    lastPreviewLook.current = previewLook;
    play(previewCanvasRef.current, [{ opacity: 0.35 }, { opacity: 1 }], {
      duration: 320,
      easing: "ease-out",
    });
  }, [previewLook]);
  // Editor first: on desktop the home card opens focused, caret at the end,
  // once the lazily loaded editor mounts. Phones skip it (no keyboard pop).
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (full || !canvas || !window.matchMedia?.("(min-width: 1024px)").matches) return;
    const focus = () => {
      const textarea = canvas.querySelector("textarea");
      if (!textarea) return false;
      if (document.activeElement === document.body) {
        textarea.focus({ preventScroll: true });
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
      return true;
    };
    if (focus()) return;
    const observer = new MutationObserver(() => focus() && observer.disconnect());
    observer.observe(canvas, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [full]);

  // The first edit or paste presses the intro seal and retires the hint.
  const edited = useRef(false);
  const handleFirstEdit = (event: React.SyntheticEvent) => {
    if (full || edited.current || !(event.target instanceof HTMLTextAreaElement)) return;
    edited.current = true;
    pressIntroSeal();
    setHintSeen(true);
    try {
      window.localStorage.setItem(EDIT_HINT_KEY, "1");
    } catch {
      // The hint just shows again next visit.
    }
  };

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
      // The canonical PNG and SVG are exactly what Save as PNG / SVG would
      // download, so the published files match the preview.
      const images = await createSnippetImages(
        draft,
        selectedBackground,
        exportReactions,
        reactorUsername,
        viewerAvatar,
      );

      const formData = new FormData();
      formData.set("code", publishedCode);
      formData.set("filename", draft.filename);
      formData.set("theme", draft.theme);
      // The saved view highlights with this, so a picked language must win
      // over detection or the published colours differ from the preview.
      formData.set("language", draft.languageOverride ?? language);
      formData.set("font_id", draft.fontId);
      formData.set("appearance", JSON.stringify(parseSnippetAppearance(draft)));
      formData.set("canonical_image", images.canonical);
      formData.set("og_image", images.og);
      formData.set("svg", images.svg);
      formData.set("card_image", images.card);
      formData.set("reactions", JSON.stringify(annotations.reactions));
      formData.set("comments", JSON.stringify({}));
      formData.set("visibility", visibility);

      const result = await publishSnippet(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      window.localStorage.removeItem(DRAFT_KEY);
      window.localStorage.removeItem(ANNOTATIONS_KEY);

      let copied = false;
      try {
        await navigator.clipboard.writeText(`${window.location.origin}${result.path}`);
        copied = true;
      } catch {
        // best-effort clipboard
      }

      // The big envelope seals and sends the snippet (about 1.8 s; at once
      // with reduced motion), then its page stamps the seal and shows the link.
      markJustPublished(result.path!, copied);
      router.prefetch(result.path!);
      setSentPath(result.path!);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Publish failed. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const busy = isPublishing || isExporting || sentPath !== null;

  const previewLineCount = getPreviewLineCount(draft.code);
  const previewLineHeight = exportLineHeightForFontSize(
    draft.fontSize,
    selectedBackground?.frame?.lineHeight,
  );
  const previewHeight = Math.max(previewLineCount, 1) * previewLineHeight + draft.innerPadding * 2;
  const showPreviewGutter = shouldShowPreviewGutter(draft.lineNumbers, true, true);
  const previewCanvasPadding = getPreviewOuterPadding(
    Boolean(selectedBackground),
    outerCanvasPadding,
  );
  const canvasStyle = selectedBackground
    ? backgroundCanvasStyle(selectedBackground, previewCanvasPadding)
    : { padding: 0 };
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
    header: draft.header,
    footer: draft.footer,
    footerAuthorUsername: effectiveViewerLabel || "you",
    windowDecoration: draft.windowDecoration,
    innerPadding: draft.innerPadding,
    fontSize: draft.fontSize,
    compactReactions: true,
  });
  // Mirror the 16:9 export: the card keeps its size, the padding stays on the
  // tighter axis, and the canvas widens or heightens to a centred 16:9 frame.
  const previewAspectStyle: React.CSSProperties = draft.aspectRatio
    ? {
        width: Math.max(exportDimensions.width, (exportDimensions.height * 16) / 9),
        aspectRatio: "16 / 9",
        // On phones the card cannot fit a 16:9 box; grow rather than clip it.
        minHeight: exportDimensions.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }
    : {};
  const previewFrameShadow = backgroundFrameShadow(selectedBackground);
  const previewCanvasWidth = draft.aspectRatio
    ? Math.max(exportDimensions.width, (exportDimensions.height * 16) / 9)
    : exportDimensions.width;
  const previewFontFamily = EXPORT_FONTS.find((font) => font.id === draft.fontId)?.family;
  const previewCardWidth = exportDimensions.width - outerCanvasPadding * 2;
  const previewCardMaxWidth = selectedBackground ? "100%" : "calc(100vw - 4rem)";

  // The Export button shows a check for a moment after a download starts.
  const [exported, setExported] = useState(false);
  const exportedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(exportedTimer.current ?? undefined), []);
  const flashExported = () => {
    clearTimeout(exportedTimer.current ?? undefined);
    setExported(true);
    exportedTimer.current = setTimeout(() => setExported(false), 1400);
  };

  const handleExportPng = async () => {
    setExportMenuOpen(false);
    setIsExporting(true);
    try {
      const file = await createDraftPng(
        draft,
        selectedBackground,
        exportReactions,
        effectiveViewerLabel || "you",
        viewerAvatar,
      );
      triggerDownload(URL.createObjectURL(file), file.name, true);
      flashExported();
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
      const svg = await createDraftSvg(
        draft,
        selectedBackground,
        exportReactions,
        effectiveViewerLabel || "you",
        viewerAvatar,
      );
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      triggerDownload(
        URL.createObjectURL(blob),
        toPngFilename(draft.filename).replace(".png", ".svg"),
        true,
      );
      flashExported();
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

  const handleCopyRichText = () => {
    setExportMenuOpen(false);
    copyRichText(
      createRichTextClipboard(draft.code, draft.filename, draft.theme, {
        fontId: draft.fontId,
        fontSize: draft.fontSize,
        language: draft.languageOverride,
      }),
    ).then(
      () => toast.success("Copied as rich text"),
      () => toast.error("Could not copy to the clipboard."),
    );
  };

  const handleCopy = () => {
    setExportMenuOpen(false);
    void navigator.clipboard.writeText(draft.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const actionButtonClass = "h-11 px-6";
  const panelLabelClass = "text-[13px] font-medium text-muted-foreground";
  const panelControlClass = "h-11 w-full";
  const menuItemClass =
    "h-11 justify-start rounded-lg font-normal text-foreground hover:bg-surf2 hover:text-foreground";
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

  const actionButtons = (
    <ButtonGroup className="grid w-full grid-cols-2 gap-3 font-sans sm:flex sm:w-auto [&>*]:rounded-full!">
      <Popover open={exportMenuOpen} onOpenChange={setExportMenuOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" disabled={busy} className={actionButtonClass}>
            {isExporting ? (
              <Spinner data-icon="inline-start" />
            ) : exported ? (
              <Check data-icon="inline-start" className="pop-in" />
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
            <Button variant="ghost" disabled={busy} onClick={handleCopy} className={menuItemClass}>
              {copied ? (
                <Check data-icon="inline-start" className="pop-in" />
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
            <Button
              variant="ghost"
              disabled={busy}
              onClick={handleCopyRichText}
              className={menuItemClass}
            >
              <ClipboardType data-icon="inline-start" />
              Copy as rich text
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {/* Publish, split like GitHub's "Create gist": the menu picks
                public or private first. */}
      <ButtonGroup className="w-full sm:w-auto">
        <Button
          disabled={busy || (Boolean(effectiveViewerLabel) && isOverLimit)}
          onClick={handlePublish}
          className="h-11 flex-1 pr-4 pl-6"
        >
          {isPublishing ? (
            <Spinner data-icon="inline-start" />
          ) : visibility === "private" ? (
            <Lock data-icon="inline-start" />
          ) : (
            <Upload data-icon="inline-start" />
          )}
          {visibility === "private" ? "Publish private" : "Publish"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={busy}
              aria-label="Choose who can see it"
              className="h-11 w-11 border-l border-primary-foreground/20"
            >
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-72">
            <DropdownMenuLabel>Who can see it</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={visibility}
              onValueChange={(value) => setVisibility(value as SnippetVisibility)}
            >
              {SNIPPET_VISIBILITIES.map(({ id, label, hint }) => (
                <DropdownMenuRadioItem key={id} value={id}>
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium">{label}</span>
                    <span className="text-xs text-muted-foreground">{hint}</span>
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
    </ButtonGroup>
  );

  return (
    <section
      data-testid="composer-shell"
      data-variant={full ? "full" : "teaser"}
      className={cn("flex min-h-0 flex-col text-foreground", full && "lg:h-full")}
    >
      <div
        data-testid="composer-main"
        className={cn(
          "grid min-h-0 flex-1 gap-6",
          full &&
            "lg:grid-cols-[minmax(0,1fr)_24.5rem] lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-x-8",
        )}
      >
        <div
          data-testid="preview-pane"
          onInput={handleFirstEdit}
          onPaste={handleFirstEdit}
          className={cn(
            "relative flex flex-col items-center justify-center overflow-auto",
            full
              ? "min-h-[clamp(13rem,34dvh,22rem)] lg:col-start-1 lg:row-start-1 lg:min-h-0"
              : "min-h-[250px] rounded-2xl p-1.5 md:min-h-[300px] md:bg-surf2/60 md:px-8 md:pt-7 md:pb-9 lg:max-h-[min(72dvh,46rem)]",
          )}
        >
          {showAuthBanner ? (
            <div className="absolute inset-x-0 top-0 z-10 flex min-h-11 items-center gap-3 rounded-xl bg-surf2 px-4 py-2 text-sm text-muted-foreground">
              <Lock aria-hidden="true" className="size-4 shrink-0" />
              <span className="min-w-0 flex-1">Log in to enable all features.</span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="text-foreground"
                onClick={() => router.push("/auth/login")}
              >
                Log in
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="font-normal text-muted-foreground"
                onClick={() => setShowAuthBanner(false)}
              >
                Dismiss
              </Button>
            </div>
          ) : null}

          {!full ? (
            <p
              data-testid="edit-hint"
              aria-hidden={hintSeen}
              className={cn(
                "mb-[18px] flex items-center gap-2.5 text-sm font-medium text-muted-foreground transition-opacity duration-300",
                hintSeen && "opacity-0",
              )}
            >
              <span className="max-md:hidden">Click the card and type, or paste your code</span>
              <span className="md:hidden">Tap the card to type or paste your code</span>
              <kbd className="rounded-md bg-background px-1.5 py-0.5 font-mono text-xs text-foreground max-md:hidden">
                ⌘V
              </kbd>
            </p>
          ) : null}

          <div
            ref={previewCanvasRef}
            data-testid={selectedBackground ? "snippet-canvas" : undefined}
            data-background={selectedBackground?.label}
            data-invite={!full && !hintSeen ? "" : undefined}
            className={cn(
              "relative isolate box-border max-w-full overflow-hidden rounded-sm transition-all",
              !full && "composer-card",
            )}
            style={
              {
                // The focus ring follows the card's corners when there is no canvas.
                ...(!full && !selectedBackground ? { borderRadius: draft.cornerRadius } : {}),
                ...canvasStyle,
                ...previewAspectStyle,
                "--preview-outer-padding": previewCanvasPadding,
              } as React.CSSProperties & { "--preview-outer-padding": string | number }
            }
          >
            {selectedBackground ? (
              <BackgroundDecoration
                background={selectedBackground}
                width={previewCanvasWidth}
                height={draft.aspectRatio ? (previewCanvasWidth * 9) / 16 : exportDimensions.height}
                fontFamily={previewFontFamily}
              />
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
                fontVariantLigatures: draft.ligatures ? undefined : "none",
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

          {!full ? (
            <p
              data-testid="composer-counts"
              className="mt-3 self-end font-mono text-xs text-muted-foreground md:absolute md:right-5 md:bottom-3.5 md:mt-0"
            >
              <span>{lineCount} lines</span> ·{" "}
              <span className={cn(isOverLimit && "font-medium text-destructive")}>
                {charCount.toLocaleString()} / 8,000 characters
              </span>
            </p>
          ) : null}
        </div>

        <div
          data-testid="composer-workspace"
          className={cn(
            "relative flex min-h-0 w-full flex-col overflow-hidden",
            full && "lg:col-start-2 lg:row-span-2 lg:row-start-1",
          )}
        >
          <ScrollArea data-testid="customization-scroll" type="hover" className="min-h-0 flex-1">
            <div className={cn("min-w-0", full && "pb-4 lg:pr-4")}>
              {full ? (
                <h2 className="mb-5 font-display text-[28px] leading-tight text-foreground">
                  Customize
                </h2>
              ) : null}

              <div
                className={cn(
                  "grid min-w-0 gap-4",
                  full
                    ? "grid-cols-1 sm:grid-cols-2"
                    : "grid-cols-2 items-end sm:grid-cols-3 lg:grid-cols-[220px_auto_190px_auto_1fr_auto]",
                )}
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className={panelLabelClass}>Brand</span>
                  <BrandPicker
                    value={selectedBrand?.id ?? null}
                    onChange={(preset) => setDraft((current) => pickBrandPreset(current, preset))}
                  />
                </div>

                <div className={cn("flex min-w-0 flex-col gap-1", !full && "lg:w-[220px]")}>
                  <span className={panelLabelClass}>Theme</span>
                  <div className="flex h-11 items-center gap-2 text-foreground">
                    <ThemePicker
                      value={draft.theme}
                      onChange={(next) =>
                        setDraft((d) => withDefaultBackground({ ...d, theme: next }))
                      }
                      themes={themes.map((t) => ({ id: t.name, label: t.name }))}
                      triggerClassName="h-11 min-w-0 flex-1 rounded-xl bg-surf2 px-3.5 text-foreground hover:bg-surf3"
                      iconColor="hsl(var(--foreground-muted))"
                    />
                    <button
                      type="button"
                      title="Random theme"
                      aria-label="Random theme"
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surf2 text-foreground transition-colors hover:bg-surf3 focus-visible:focus-ring"
                      onClick={() => {
                        const others = themes.filter((t) => t.name !== draft.theme);
                        const pick = others[Math.floor(Math.random() * others.length)];
                        if (pick)
                          setDraft((d) => withDefaultBackground({ ...d, theme: pick.name }));
                      }}
                    >
                      <Shuffle data-icon="inline-start" />
                    </button>
                  </div>
                </div>

                <label className="flex min-w-0 flex-col gap-1">
                  <span className={panelLabelClass}>File</span>
                  <Input
                    className="font-mono"
                    value={draft.filename}
                    onChange={(e) => setDraft((d) => ({ ...d, filename: e.target.value }))}
                    placeholder="snippet.tsx"
                    aria-label="Filename"
                  />
                </label>

                {/* Background follows Brand (or Theme), so the home row leaves it
                    to All options, where a hand-picked one can be reset. */}
                {full ? (
                  <div className="col-span-full flex min-w-0 flex-col gap-1">
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3">
                      <span className={panelLabelClass}>Background</span>
                      {selectedBackgroundSource === "override" ? (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          Custom ·
                          <button
                            type="button"
                            onClick={() =>
                              setDraft((d) =>
                                withDefaultBackground({ ...d, backgroundOverride: false }),
                              )
                            }
                            className="rounded-sm font-semibold text-postal hover:underline focus-visible:focus-ring"
                          >
                            Reset to {draft.brandId ? "brand" : "theme"} default
                          </button>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Follows {selectedBackgroundSource === "brand" ? "Brand" : "Theme"}
                        </span>
                      )}
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="flex h-11 min-w-0 items-center gap-2 rounded-xl bg-surf2 px-3.5 text-[15px] text-foreground transition-colors hover:bg-surf3 focus-visible:focus-ring"
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
                      <PopoverContent side="top" align="start" className="w-[min(92vw,360px)]">
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
                          />
                          <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1">
                            <button
                              type="button"
                              onClick={() =>
                                setDraft((d) => ({
                                  ...d,
                                  background: null,
                                  backgroundOverride: true,
                                }))
                              }
                              className={cn(
                                "flex h-11 items-center gap-2 rounded-lg px-3 text-sm transition-colors focus-visible:focus-ring",
                                !draft.background
                                  ? "bg-ink text-paper"
                                  : "bg-surf2 text-muted-foreground hover:bg-surf3",
                              )}
                            >
                              <span className="size-4 rounded-full border border-current" />
                              None
                            </button>
                            {filteredBackgroundOptions.map((b) => (
                              <button
                                key={b.label}
                                type="button"
                                onClick={() =>
                                  setDraft((d) => ({
                                    ...d,
                                    background: b.label,
                                    backgroundOverride: true,
                                  }))
                                }
                                className={cn(
                                  "flex h-11 min-w-0 items-center gap-2 rounded-lg px-3 text-left text-sm transition-colors focus-visible:focus-ring",
                                  draft.background === b.label
                                    ? "bg-ink text-paper"
                                    : "bg-surf2 text-muted-foreground hover:bg-surf3",
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
                                      : {
                                          background: `linear-gradient(135deg, ${b.from}, ${b.to})`,
                                        }
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
                ) : null}

                {!full ? (
                  <>
                    <Button asChild variant="outline" className="h-11 px-5">
                      <Link href="/compose">
                        <SlidersHorizontal data-icon="inline-start" />
                        All options
                      </Link>
                    </Button>
                    <div
                      data-testid="composer-actions"
                      className="col-span-2 sm:justify-self-end lg:col-span-1 lg:col-start-6"
                    >
                      {actionButtons}
                    </div>
                  </>
                ) : (
                  <div className="col-span-full pt-2">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <span className="eyebrow text-faint">Code and frame</span>
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
                                  <SelectItem value="lumis">Lumis</SelectItem>
                                  <SelectItem value="markdown">Markdown</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex min-w-0 flex-col gap-1">
                            <span className={panelLabelClass}>Size</span>
                            <Select
                              value={draft.aspectRatio ?? "auto"}
                              onValueChange={(size) =>
                                setDraft((d) => ({
                                  ...d,
                                  aspectRatio: size === "16:9" ? "16:9" : null,
                                }))
                              }
                            >
                              <SelectTrigger aria-label="Size" className={panelControlClass}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent side="top" position="popper">
                                <SelectGroup>
                                  <SelectItem value="auto">Fit to code</SelectItem>
                                  <SelectItem value="16:9">16:9 (1600×900)</SelectItem>
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
                        <span className="eyebrow text-faint">Spacing and shape</span>
                        <div className="grid min-w-0 gap-3">
                          <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className={panelLabelClass}>Outer padding</span>
                              <output className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
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
                              <output className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
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
                              <output className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
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
                        <span className="eyebrow text-faint">Visible details</span>
                        <div className="flex min-w-0 flex-wrap items-center gap-x-8 gap-y-1">
                          {[
                            ["Line numbers", "lineNumbers"],
                            ["Reactions", "showReactions"],
                            ["Ligatures", "ligatures"],
                          ].map(([label, key]) => {
                            const enabled = Boolean(
                              draft[key as "lineNumbers" | "showReactions" | "ligatures"],
                            );
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
                              <p className="text-xs text-muted-foreground">
                                Window chrome and identifying details
                              </p>
                            </div>
                            <Switch
                              checked={draft.header.enabled}
                              onCheckedChange={(enabled) =>
                                setDraft((d) => ({ ...d, header: { ...d.header, enabled } }))
                              }
                              aria-label="Show header"
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
                              <p className="text-xs text-muted-foreground">
                                Choose exactly which export details appear
                              </p>
                            </div>
                            <Switch
                              checked={draft.footer.enabled}
                              onCheckedChange={(enabled) =>
                                setDraft((d) => ({ ...d, footer: { ...d.footer, enabled } }))
                              }
                              aria-label="Show footer"
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
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>

        {full ? (
          <div
            data-testid="composer-actions"
            className="flex min-w-0 shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:col-start-1 lg:row-start-2"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[13px] text-muted-foreground">
              <span className="hidden lg:inline">Export or publish</span>
              <div className="contents">
                <span className="font-mono">
                  {draft.aspectRatio
                    ? `${EXPORT_CANVAS_16_9.width} × ${EXPORT_CANVAS_16_9.height}`
                    : `${exportDimensions.width} × ${exportDimensions.height}`}
                  px
                </span>
                <span className="font-mono">{lineCount} lines</span>
                <span className={cn("font-mono", isOverLimit && "font-medium text-destructive")}>
                  {charCount.toLocaleString()} / 8,000 characters
                </span>
              </div>
            </div>

            {actionButtons}
          </div>
        ) : null}
      </div>

      {sentPath ? (
        <div className="rise-in pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-background/80">
          <SendEnvelope
            file={draft.filename}
            lang={languageDisplayName(language)}
            code={publishedCode}
            onSent={() => router.push(sentPath)}
            className="w-[min(86vw,400px)]"
          />
          <p role="status" className="sr-only">
            Published. Opening your snippet.
          </p>
        </div>
      ) : null}
    </section>
  );
}
