"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ThemeData } from "@lumis-sh/themes";
import { Check, Copy, MessageSquarePlus, SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { clientHighlighterPromise as highlighterPromise } from "@/lib/lumis-client";
import { inferLanguage, languageDisplayName } from "@/lib/snippet-utils";
import type { BrandFramePreset } from "@/lib/brand-presets";
import { DEFAULT_HEADER_SETTINGS, type ExportHeaderSettings } from "@/lib/export-metadata";
import { loadTheme } from "@/lib/theme-loader";
import {
  EXPORT_COMMENT_PREFIX,
  EXPORT_GUTTER_WIDTH,
  EXPORT_INNER_PADDING,
  EXPORT_LINE_NUM_WIDTH,
  type WindowDecoration,
} from "@/lib/export-utils";

const REACTION_OPTIONS = [
  // positive / praise
  "🔥",
  "✨",
  "💡",
  "🎉",
  "🚀",
  "💯",
  "❤️",
  "💚",
  "🖤",
  "⭐",
  "👍",
  "🙌",
  "🎯",
  "💪",
  "🏆",
  "👏",
  "✅",
  "🌟",
  // neutral / curious
  "👀",
  "🤔",
  "😮",
  "🧐",
  "💭",
  "📌",
  "🔍",
  "💬",
  // funny
  "😂",
  "🤣",
  "😅",
  "😆",
  "💀",
  "🤡",
  "🫠",
  "😵",
  // negative / bad code
  "👎",
  "🤦",
  "😱",
  "🤮",
  "💩",
  "🗑️",
  "❌",
  "🚨",
  // danger / explosion
  "😤",
  "🤯",
  "😡",
  "⚠️",
  "💥",
  "💣",
  "🌋",
  "🔴",
  // arrows / flow
  "⬆️",
  "⬇️",
  "⬅️",
  "➡️",
  "↩️",
  "↪️",
  "🔁",
  "🔃",
  // code / tooling
  "🐛",
  "🔧",
  "⚡",
  "📦",
  "🔨",
  "🛠️",
  "🧪",
  "🔒",
  "📝",
  "📊",
  "💾",
  "🧹",
  "🔑",
  "🩹",
  "🎭",
  "🔄",
  // numbers
  "1️⃣",
  "2️⃣",
  "3️⃣",
  "4️⃣",
  "5️⃣",
  "6️⃣",
  "7️⃣",
  "8️⃣",
  "9️⃣",
] as const;

export type InlineComment = { author: string; body: string };

export type EditorPalette = {
  bg: string;
  gutter: string;
  border: string;
  headerText: string;
  buttonText: string;
  buttonBorder: string;
  /** Subtle highlight (~6% fg over transparent) used to mark a focused line.
   *  Useful for hover/selected backgrounds in popovers themed against the
   *  editor — works on both light and dark themes without needing a separate
   *  hover swatch. */
  selectedLine: string;
};

type InlineCodeBlockProps = {
  filename: string;
  code: string;
  theme: string;
  fontFamily?: string;
  language?: string | null;
  comments: Record<number, InlineComment>;
  reactions: Record<number, string>;
  selectedCommentLine: number | null;
  selectedReactionLine: number | null;
  onCodeChange: (code: string) => void;
  onSelectCommentLine: (lineNumber: number) => void;
  onSelectReactionLine: (lineNumber: number | null) => void;
  onPickReaction: (lineNumber: number, emoji: string) => void;
  className?: string;
  style?: React.CSSProperties;
  bodyHeight?: number;
  innerPadding?: number;
  showGutter?: boolean;
  showLineNumbers?: boolean;
  /** @deprecated Pass `header` for granular metadata controls. */
  showFilename?: boolean;
  header?: ExportHeaderSettings;
  windowDecoration?: WindowDecoration;
  brandFrame?: BrandFramePreset;
  showChromeActions?: boolean;
  showScrollbars?: boolean;
  showInlineComments?: boolean;
  showCommentActions?: boolean;
  compactGutter?: boolean;
  /**
   * Optional toolbar rendered inside the editor card, between the window
   * chrome and the code body. Lets the consumer (HomeComposer) keep its
   * file/language/theme/font controls visually attached to the editor.
   */
  toolbar?: React.ReactNode;
  /** Optional artifact footer rendered inside the preview/editor frame. */
  footer?: React.ReactNode;
  /**
   * Optional action group rendered absolutely at the top-right of the code
   * area itself (overlaying the highlight). Used for primary actions like
   * Save / Export that benefit from sitting close to the code.
   */
  codeActions?: React.ReactNode;
  /**
   * Fires whenever the loaded syntax theme changes the editor palette so the
   * consumer can apply the same colours to its own footer/status bar.
   */
  onPaletteChange?: (palette: EditorPalette) => void;
};

// Colors derived from the syntax theme's appearance, not the page theme.
// This keeps the editor intentional: dark editor for dark themes, light for light.
const DARK = {
  bg: "#0d0d0d",
  gutter: "#111111",
  border: "rgba(255,255,255,0.07)",
  lineNum: "rgba(255,255,255,0.22)",
  icon: "rgba(255,255,255,0.28)",
  header: "#111111",
  headerText: "rgba(255,255,255,0.35)",
  buttonText: "rgba(255,255,255,0.75)",
  buttonBorder: "rgba(255,255,255,0.18)",
  selectedLine: "rgba(255,255,255,0.04)",
  pickerBg: "#1a1a1a",
  caret: "#e0e0e0",
};

const LIGHT = {
  bg: "#ffffff",
  gutter: "#f7f7f7",
  border: "rgba(0,0,0,0.08)",
  lineNum: "rgba(0,0,0,0.3)",
  icon: "rgba(0,0,0,0.25)",
  header: "#f7f7f7",
  headerText: "rgba(0,0,0,0.4)",
  buttonText: "rgba(0,0,0,0.7)",
  buttonBorder: "rgba(0,0,0,0.2)",
  selectedLine: "rgba(0,0,0,0.04)",
  pickerBg: "#ffffff",
  caret: "#222222",
};

export function InlineCodeBlock({
  filename,
  code,
  theme,
  fontFamily,
  language: languageProp,
  comments,
  reactions,
  selectedCommentLine,
  selectedReactionLine,
  onCodeChange,
  onSelectCommentLine,
  onSelectReactionLine,
  onPickReaction,
  className,
  style,
  bodyHeight,
  innerPadding = EXPORT_INNER_PADDING,
  showGutter = true,
  showLineNumbers = true,
  showFilename = true,
  header,
  windowDecoration = "macos",
  brandFrame,
  showChromeActions = true,
  showScrollbars = true,
  showInlineComments = false,
  showCommentActions = true,
  compactGutter = false,
  toolbar,
  footer,
  codeActions,
  onPaletteChange,
}: InlineCodeBlockProps) {
  const [highlightedLines, setHighlightedLines] = useState<HighlightedToken[][]>([
    [{ text: code }],
  ]);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);
  const [themeError, setThemeError] = useState<string | null>(null);
  const [_isReady, setIsReady] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [themeBg, setThemeBg] = useState<string | null>(null);
  const [themeFg, setThemeFg] = useState<string | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  // Which line the user is currently hovering. Drives the floating
  // toolbar (smile + message icons) over the code area, so the home
  // composer matches the saved-view PR-style affordance.
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);

  const language = useMemo(
    () => languageProp || inferLanguage(filename, code),
    [languageProp, filename, code],
  );
  const lines = useMemo(() => code.split("\n"), [code]);
  const compactPreviewGutter = compactGutter;
  const gutterWidth = showLineNumbers
    ? compactPreviewGutter
      ? EXPORT_GUTTER_WIDTH
      : 56
    : EXPORT_GUTTER_WIDTH;
  const codePadX = innerPadding;
  const codePadLeft = codePadX;
  const displayRows = useMemo(
    () =>
      lines.flatMap((_, index) => {
        const lineNumber = index + 1;
        const rows: Array<{ type: "source" | "comment"; lineNumber: number }> = [
          { type: "source", lineNumber },
        ];
        if (showInlineComments && comments[lineNumber]?.body) {
          rows.push({ type: "comment", lineNumber });
        }
        return rows;
      }),
    [comments, lines, showInlineComments],
  );

  // Merge theme-sourced bg/fg over the chrome palette. When the syntax theme
  // exposes its own foreground colour we drive every secondary text colour
  // (line numbers, labels, button text/border, etc.) off it via color-mix —
  // that way the chrome stays readable on themes whose fg isn't pure black or
  // pure white (mfd_flir_bh, monokai_nightasty_light, etc.).
  const base = isDark ? DARK : LIGHT;
  const fgMix = (alpha: number) =>
    themeFg ? `color-mix(in srgb, ${themeFg} ${Math.round(alpha * 100)}%, transparent)` : null;
  const c = {
    ...base,
    bg: themeBg ?? base.bg,
    gutter: themeBg ?? base.gutter,
    header: themeBg ?? base.header,
    caret: themeFg ?? base.caret,
    headerText: fgMix(0.6) ?? base.headerText,
    lineNum: fgMix(0.45) ?? base.lineNum,
    icon: fgMix(0.45) ?? base.icon,
    buttonText: fgMix(0.85) ?? base.buttonText,
    buttonBorder: fgMix(0.3) ?? base.buttonBorder,
    border: fgMix(0.12) ?? base.border,
    selectedLine: fgMix(0.06) ?? base.selectedLine,
  };

  // Surface the resolved palette so the consumer can theme its footer to match.
  useEffect(() => {
    if (!onPaletteChange) return;
    onPaletteChange({
      bg: c.bg,
      gutter: c.gutter,
      border: c.border,
      headerText: c.headerText,
      buttonText: c.buttonText,
      buttonBorder: c.buttonBorder,
      selectedLine: c.selectedLine,
    });
  }, [
    onPaletteChange,
    c.bg,
    c.gutter,
    c.border,
    c.headerText,
    c.buttonText,
    c.buttonBorder,
    c.selectedLine,
  ]);

  useEffect(() => {
    let isActive = true;

    async function renderLines() {
      try {
        setThemeError(null);
        setIsReady(false);

        const [highlighter, loaded] = await Promise.all([highlighterPromise, loadTheme(theme)]);

        await highlighter.loadLanguage(language);

        const rendered = renderHighlightedLines({
          code,
          language,
          theme: loaded.data,
          highlighter,
        });
        const normal = loaded.data.highlights?.["normal"] as
          | { bg?: string; fg?: string }
          | undefined;

        if (isActive) {
          setIsDark(loaded.data.appearance === "dark");
          setThemeBg(normal?.bg ?? null);
          setThemeFg(normal?.fg ?? null);
          setHighlightedLines(rendered);
          setIsReady(true);
        }
      } catch {
        if (isActive) {
          setThemeError(`Could not load the ${theme} theme.`);
          setHighlightedLines(code.split("\n").map((text) => [{ text }]));
        }
      }
    }

    void renderLines();
    return () => {
      isActive = false;
    };
  }, [code, language, theme]);

  const handleScroll = (event: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = event.currentTarget;
    if (gutterRef.current) gutterRef.current.scrollTop = scrollTop;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }
    if (selectedReactionLine !== null) onSelectReactionLine(null);
  };

  const renderAnnotationToolbar = (lineNumber: number, reaction?: string) => {
    const isPickerOpen = selectedReactionLine === lineNumber;

    return (
      <div
        data-testid={`annotation-toolbar-${lineNumber}`}
        className="flex items-center gap-0.5 rounded-md border px-0.5 py-0.5"
        style={{
          backgroundColor: c.gutter,
          borderColor: c.buttonBorder,
          color: c.buttonText,
        }}
      >
        <Popover
          open={isPickerOpen}
          onOpenChange={(open) => onSelectReactionLine(open ? lineNumber : null)}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              title="Add a reaction"
              aria-label="Add a reaction"
              className="flex size-4 items-center justify-center rounded transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            >
              <SmilePlus className="size-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={6}
            className="w-auto p-1"
            style={{
              backgroundColor: c.pickerBg,
              borderColor: c.buttonBorder,
              color: c.buttonText,
            }}
          >
            {reaction ? (
              <button
                type="button"
                className="mb-1 w-full rounded px-2 py-0.5 text-left text-xs transition-colors hover:bg-red-500/10 hover:text-red-500"
                style={{ color: c.lineNum }}
                onClick={() => onPickReaction(lineNumber, "")}
              >
                Remove reaction
              </button>
            ) : null}
            <div className="grid grid-cols-8 gap-0.5">
              {REACTION_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded text-base transition-colors",
                    reaction === emoji
                      ? "bg-blue-500/10 ring-2 ring-inset ring-blue-500/40"
                      : "hover:bg-black/5 dark:hover:bg-white/10",
                  )}
                  onClick={() => onPickReaction(lineNumber, emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        {showCommentActions ? (
          <button
            type="button"
            onClick={() => onSelectCommentLine(lineNumber)}
            title="Add a comment"
            aria-label="Add a comment"
            className="flex size-4 items-center justify-center rounded transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            <MessageSquarePlus className="size-3" />
          </button>
        ) : null}
      </div>
    );
  };

  const showLineNumberGutter = showGutter && showLineNumbers;
  const activeInlineActionLine = selectedReactionLine ?? hoveredLine;
  const resolvedHeader = header ?? { ...DEFAULT_HEADER_SETTINGS, showFilename };
  const showBrandHeader = Boolean(
    brandFrame?.headerStrip && resolvedHeader.enabled && windowDecoration === "none",
  );
  const showWindowHeader =
    resolvedHeader.enabled && (windowDecoration !== "none" || showBrandHeader);
  const headerPositions = ["left", "center", "right"] as const;
  const headerPositionClass = {
    left: "justify-start text-left",
    center: "justify-center text-center",
    right: "justify-end text-right",
  } as const;
  const renderHeaderMetadata = (
    position: (typeof headerPositions)[number],
    allowFilename: boolean,
  ) => (
    <div className="flex min-w-0 items-center gap-2">
      {allowFilename &&
      resolvedHeader.showFilename &&
      resolvedHeader.filenamePosition === position ? (
        <span className="truncate font-medium" title={filename}>
          {filename}
        </span>
      ) : null}
      {resolvedHeader.showLanguage && resolvedHeader.languagePosition === position ? (
        <span className="shrink-0">{languageDisplayName(language)}</span>
      ) : null}
    </div>
  );
  let headerMetadataInsetClass = "px-4";
  if (showChromeActions) {
    headerMetadataInsetClass =
      windowDecoration === "macos" || windowDecoration === "macos-subtle"
        ? "pr-28 pl-20"
        : windowDecoration === "windows"
          ? "pr-40 pl-4"
          : "pr-28 pl-4";
  } else if (windowDecoration === "macos" || windowDecoration === "macos-subtle") {
    headerMetadataInsetClass = "pr-4 pl-20";
  } else if (windowDecoration === "windows") {
    headerMetadataInsetClass = "pr-20 pl-4";
  }
  const cardFill = brandFrame?.cardFill ?? c.bg;

  return (
    <div
      className={cn("overflow-hidden text-sm", className)}
      style={{
        ...style,
        backgroundColor: cardFill,
        fontFamily: fontFamily ?? "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
      }}
    >
      {showWindowHeader ? (
        showBrandHeader ? (
          <div
            data-testid="brand-header-strip"
            className="grid h-9 grid-cols-3 items-center gap-2 border-b px-4 text-xs"
            style={{ backgroundColor: cardFill, borderColor: c.border, color: c.headerText }}
          >
            {headerPositions.map((position) => (
              <div
                key={position}
                className={cn("flex min-w-0 items-center", headerPositionClass[position])}
                style={{ color: c.buttonText }}
              >
                {renderHeaderMetadata(position, true)}
              </div>
            ))}
          </div>
        ) : (
          <div
            className="relative flex min-h-11 items-center border-b py-2"
            style={{ backgroundColor: cardFill, borderColor: c.border }}
          >
            <div className="absolute left-3 flex items-center gap-2 pl-1">
              {windowDecoration === "macos" ? (
                <>
                  <span className="size-3 rounded-full bg-[#ff5f57]" />
                  <span className="size-3 rounded-full bg-[#febc2e]" />
                  <span className="size-3 rounded-full bg-[#28c840]" />
                </>
              ) : windowDecoration === "macos-subtle" ? (
                <>
                  <span className="size-3 rounded-full" style={{ backgroundColor: c.headerText }} />
                  <span className="size-3 rounded-full" style={{ backgroundColor: c.headerText }} />
                  <span className="size-3 rounded-full" style={{ backgroundColor: c.headerText }} />
                </>
              ) : null}
            </div>
            <div
              className={cn(
                "grid min-w-0 flex-1 grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_minmax(0,0.8fr)] items-center gap-2 text-xs",
                headerMetadataInsetClass,
              )}
              style={{ color: c.headerText }}
            >
              {headerPositions.map((position) => (
                <div
                  key={position}
                  className={cn("flex min-w-0 items-center", headerPositionClass[position])}
                >
                  {renderHeaderMetadata(
                    position,
                    Boolean(brandFrame?.headerStrip) || (brandFrame?.showCenteredFilename ?? true),
                  )}
                </div>
              ))}
            </div>
            <div className="absolute right-3 flex items-center justify-end gap-1.5">
              {windowDecoration === "windows" ? (
                <div
                  className="flex items-center gap-3 pr-1 text-[11px] leading-none"
                  style={{ color: c.headerText }}
                >
                  <span aria-hidden="true" className="opacity-55">
                    ─
                  </span>
                  <span aria-hidden="true" className="opacity-55">
                    □
                  </span>
                  <span aria-hidden="true" className="opacity-55">
                    ×
                  </span>
                </div>
              ) : null}
              {showChromeActions ? (
                <>
                  <button
                    type="button"
                    onClick={handleCopy}
                    title="Copy code"
                    aria-label="Copy code"
                    className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ color: c.buttonText }}
                  >
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  {codeActions}
                </>
              ) : null}
            </div>
          </div>
        )
      ) : null}

      {/* Optional editor-level toolbar (file/lang/theme/font controls). Sits
          inside the card, between the window chrome and the code body. */}
      {toolbar ? (
        <div className="border-b" style={{ borderColor: c.border }}>
          {toolbar}
        </div>
      ) : null}

      {/* Editor body: gutter + code — fixed height so gutter clientHeight is always constrained.
          mouseLeave clears the hovered line so the toolbar disappears when the
          cursor exits the editor altogether (gutter mouseLeave alone misses
          the case where the cursor crosses straight out through the code). */}
      <div
        className={cn("grid overflow-hidden", !bodyHeight && "h-[47rem]")}
        style={{
          gridTemplateColumns: showLineNumberGutter ? `${gutterWidth}px 1fr` : "1fr",
          height: bodyHeight ? `${bodyHeight}px` : undefined,
        }}
        onMouseLeave={() => setHoveredLine(null)}
      >
        {/* ── Left gutter: hover toolbar OR (line number + reaction/comment badges) ── */}
        {showLineNumberGutter ? (
          <div
            ref={gutterRef}
            className={cn("overflow-visible select-none", showLineNumbers && "border-r")}
            style={{
              backgroundColor: c.gutter,
              borderColor: c.border,
              paddingBlock: innerPadding,
            }}
          >
            {displayRows.map((row) => {
              const ln = row.lineNumber;
              if (row.type === "comment") {
                return <div key={`comment-${ln}`} className="h-6" />;
              }
              const comment = comments[ln];
              const isHovered = hoveredLine === ln;
              const isPickerOpen = selectedReactionLine === ln;
              const showToolbar = isHovered || isPickerOpen;
              const reaction = reactions[ln];

              return (
                <div
                  key={ln}
                  className={cn(
                    "relative flex h-6 items-center gap-1",
                    compactPreviewGutter && showLineNumbers
                      ? "justify-start pl-[18px] pr-0"
                      : "justify-end pr-1.5 pl-1",
                  )}
                  onMouseEnter={() => setHoveredLine(ln)}
                >
                  {showToolbar ? (
                    renderAnnotationToolbar(ln, reaction)
                  ) : (
                    <>
                      {showCommentActions && comment ? (
                        <button
                          type="button"
                          className="flex h-4 items-center gap-0.5 rounded-sm text-[10px] font-semibold tabular-nums text-blue-400 transition-opacity hover:opacity-70"
                          onClick={() => onSelectCommentLine(ln)}
                          title={`${comment.author}: ${comment.body}`}
                        >
                          <MessageSquarePlus className="size-2.5" />1
                        </button>
                      ) : null}
                      {showLineNumbers ? (
                        <span
                          className="text-right text-xs leading-6 tabular-nums"
                          style={{ color: c.lineNum, width: EXPORT_LINE_NUM_WIDTH }}
                        >
                          {ln}
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* ── Code area ── */}
        <div className="relative overflow-hidden" style={{ backgroundColor: c.bg }}>
          {showGutter && !showLineNumbers && activeInlineActionLine !== null ? (
            <div
              className="absolute z-20"
              style={{
                left: innerPadding,
                top: innerPadding + (activeInlineActionLine - 1) * 24 + 1,
              }}
              onMouseEnter={() => setHoveredLine(activeInlineActionLine)}
            >
              {renderAnnotationToolbar(activeInlineActionLine, reactions[activeInlineActionLine])}
            </div>
          ) : null}

          {/* Syntax-highlighted overlay */}
          <div
            ref={highlightRef}
            data-testid="highlight-layer"
            className="pointer-events-none absolute inset-0 overflow-hidden leading-6"
            // Tokens with no scope come back as plain escaped text (no inline
            // color span), so they'd otherwise fall back to whatever the page's
            // foreground is. Pin the default to the theme's fg so unstyled
            // chunks read against the theme bg, not against an unrelated page
            // text colour.
            style={{
              color: themeFg ?? c.caret,
              paddingTop: innerPadding,
              paddingRight: codePadX,
              paddingBottom: innerPadding,
              paddingLeft: codePadLeft,
            }}
          >
            {displayRows.map((row) => {
              const ln = row.lineNumber;
              const reaction = reactions[ln];
              const comment = comments[ln];
              if (row.type === "comment") {
                return (
                  <div
                    key={`comment-${ln}`}
                    className="min-h-6 whitespace-pre-wrap break-words text-xs leading-6 italic"
                    style={{ color: c.headerText }}
                  >
                    {EXPORT_COMMENT_PREFIX} {comment?.body}
                  </div>
                );
              }
              const line = highlightedLines[ln - 1] ?? [];
              return (
                <div key={`source-${ln}`}>
                  <div
                    data-testid={`source-line-${ln}`}
                    className="h-6 whitespace-pre"
                    style={
                      selectedCommentLine === ln
                        ? { backgroundColor: c.selectedLine, borderRadius: "2px" }
                        : undefined
                    }
                  >
                    {line.length > 0
                      ? line.map((token, index) => (
                          <span
                            key={`${ln}-${index}`}
                            style={{
                              color: token.color,
                              fontWeight: token.bold ? 700 : undefined,
                              fontStyle: token.italic ? "italic" : undefined,
                            }}
                          >
                            {token.text}
                          </span>
                        ))
                      : " "}
                    {reaction ? (
                      <span
                        className="ml-2 inline-flex h-5 items-center gap-1 rounded-full border px-1.5 align-middle text-[11px] leading-none"
                        style={{
                          borderColor: c.buttonBorder,
                          backgroundColor: c.gutter,
                          color: c.buttonText,
                        }}
                      >
                        <span className="text-[13px] leading-none">{reaction}</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Transparent editing textarea — h-full fills the fixed-height grid
              cell. wrap="off" + whiteSpace=pre keep each logical line on a
              single visual row so the gutter (one fixed-height row per
              logical line) stays in sync as the user scrolls. Horizontal
              overflow scrolls; we mirror the offset onto the highlight
              overlay via handleScroll. */}
          <textarea
            aria-label="Code"
            wrap="off"
            className={cn(
              "relative z-10 block h-full w-full resize-none bg-transparent leading-6 text-transparent outline-none [-webkit-text-fill-color:transparent] selection:bg-blue-400/15",
              showScrollbars ? "overflow-auto" : "overflow-hidden",
            )}
            style={{
              caretColor: c.caret,
              whiteSpace: "pre",
              paddingTop: innerPadding,
              paddingRight: codePadX,
              paddingBottom: innerPadding,
              paddingLeft: codePadLeft,
            }}
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
            onScroll={handleScroll}
            // Hovering the code area drives the same gutter toolbar as
            // hovering the gutter itself. Subtract the configured top inset,
            // then divide by the 24px line height to map to a source line.
            onMouseMove={(event) => {
              const ta = event.currentTarget;
              const rect = ta.getBoundingClientRect();
              const y = event.clientY - rect.top + ta.scrollTop - innerPadding;
              const ln = Math.floor(y / 24) + 1;
              if (ln >= 1 && ln <= lines.length) {
                setHoveredLine((prev) => (prev === ln ? prev : ln));
              }
            }}
            spellCheck={false}
          />

          {themeError ? (
            <div
              className="pointer-events-none absolute rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400"
              style={{
                bottom: innerPadding,
                left: innerPadding,
                right: innerPadding,
              }}
            >
              {themeError}
            </div>
          ) : null}
        </div>
      </div>

      {footer ? (
        <div
          className="border-t px-4 py-2 font-mono text-xs"
          style={{ borderColor: c.border, backgroundColor: c.gutter, color: c.headerText }}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

type HighlightedToken = {
  text: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
};

function renderHighlightedLines({
  code,
  language,
  theme,
  highlighter,
}: {
  code: string;
  language: string;
  theme: ThemeData;
  highlighter: Awaited<typeof highlighterPromise>;
}) {
  const lines: HighlightedToken[][] = code.split("\n").map(() => []);
  let lineIndex = 0;

  highlighter.highlightIter(code, language, theme, (text, _tokenLanguage, _range, scope) => {
    // Split on either CRLF or LF — see app/[snippet]/page.tsx for the
    // explanation; in short, leaving a trailing \r in chunks creates a
    // visual line break under whitespace-pre-wrap and pushes any trailing
    // inline content (e.g. a reaction chip) onto a fresh row.
    const chunks = text.split(/\r?\n/);
    chunks.forEach((chunk, chunkIndex) => {
      if (chunk) {
        const highlight = scope
          ? (theme.highlights?.[scope] as
              | { fg?: string; bold?: boolean; italic?: boolean }
              | undefined)
          : undefined;
        lines[lineIndex]?.push({
          text: chunk,
          color: highlight?.fg,
          bold: highlight?.bold,
          italic: highlight?.italic,
        });
      }
      if (chunkIndex < chunks.length - 1) lineIndex += 1;
    });
  });

  return lines;
}
