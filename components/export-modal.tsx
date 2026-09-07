"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileImage, FileText, ImageIcon } from "lucide-react";
import { availableLanguages } from "@lumis-sh/lumis/client";
import {
  EXPORT_WIDTH,
  EXPORT_INNER_PADDING,
  EXPORT_BACKGROUNDS,
  EXPORT_BRAND_BACKGROUNDS,
  EXPORT_FONTS,
  EXPORT_FONT_SIZE,
  EXPORT_FONT_SIZE_VALUES,
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
  type ExportBackground,
  type WindowDecoration,
  createHighlightedSvg,
  renderToFile,
  toPngFilename,
  triggerDownload,
  type ExportComment,
} from "@/lib/export-utils";
import { cn } from "@/lib/utils";
import type { ExportReactionChip } from "@/lib/snippet-utils";
import { Spinner } from "@/components/ui/spinner";
import { Slider } from "@/components/ui/slider";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ExportFooterSettings, ExportHeaderSettings } from "@/lib/export-metadata";

const LANGUAGES = [
  { id: "", name: "Auto-Detect" },
  ...availableLanguages().map((l) => ({ id: l.id, name: l.id })),
];

const SIZE_OPTIONS = [2, 4, 6] as const;

const EXPORT_ACTIONS = [
  { key: "png", label: "Save as PNG", Icon: ImageIcon, isAsync: true },
  { key: "svg", label: "Save as SVG", Icon: FileImage, isAsync: true },
  { key: "raw", label: "Download", Icon: FileText, isAsync: false },
] as const;

export type ExportSettings = {
  background: string | null;
  outerPadding: number;
  innerPadding: number;
  cornerRadius: number;
  pixelRatio: number;
  lineNumbers: boolean;
  showReactions: boolean;
  showComments: boolean;
  header: ExportHeaderSettings;
  footer: ExportFooterSettings;
  windowDecoration: WindowDecoration;
  fontId: string;
  fontSize: number;
  language: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  code: string;
  filename: string;
  theme: string;
  reactions?: Record<number, ExportReactionChip[]>;
  comments?: Record<number, ExportComment>;
  /** Author username displayed when the footer author item is on. */
  authorUsername?: string | null;
  /** Optional avatar URL for the footer chip — falls back to initial circle when missing. */
  authorAvatarUrl?: string | null;
  /** URL embedded in PNG/SVG metadata. Falls back to the Supagist homepage. */
  sourceUrl?: string | null;
  settings: ExportSettings;
  onSettingsChange: (s: ExportSettings) => void;
};

export function ExportModal({
  open,
  onClose,
  code,
  filename,
  theme,
  reactions,
  comments,
  authorUsername,
  authorAvatarUrl,
  sourceUrl,
  settings,
  onSettingsChange,
}: Props) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const prevPreviewUrl = useRef<string | null>(null);

  const bg: ExportBackground | null =
    EXPORT_BACKGROUNDS.find((b) => b.label === settings.background) ??
    EXPORT_BRAND_BACKGROUNDS.find((b) => b.label === settings.background) ??
    null;
  const normalizedOuterPadding = normalizeExportOuterPadding(settings.outerPadding);
  const normalizedInnerPadding = normalizeExportInnerPadding(
    settings.innerPadding ?? EXPORT_INNER_PADDING,
  );
  const normalizedCornerRadius = normalizeExportCornerRadius(settings.cornerRadius);
  const normalizedFontSize = normalizeExportFontSize(settings.fontSize ?? EXPORT_FONT_SIZE);
  const outerPadding = settings.background ? normalizedOuterPadding : 0;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPreviewLoading(true);

    void createHighlightedSvg(
      code,
      filename,
      theme,
      EXPORT_WIDTH,
      undefined,
      bg,
      outerPadding,
      settings.lineNumbers,
      settings.fontId,
      settings.language,
      reactions,
      settings.showReactions,
      settings.header.enabled && settings.header.showFilename,
      settings.footer.enabled,
      authorUsername ?? null,
      authorAvatarUrl ?? null,
      comments,
      settings.showComments,
      sourceUrl ?? null,
      settings.windowDecoration,
      normalizedCornerRadius,
      normalizedInnerPadding,
      settings.header,
      settings.footer,
      normalizedFontSize,
    ).then((svg) => {
      if (cancelled) return;
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current);
      prevPreviewUrl.current = url;
      setPreviewSrc(url);
      setPreviewLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    code,
    filename,
    theme,
    settings.background,
    settings.outerPadding,
    settings.innerPadding,
    settings.cornerRadius,
    settings.lineNumbers,
    settings.fontId,
    normalizedFontSize,
    settings.language,
    settings.showReactions,
    settings.header,
    settings.footer,
    settings.windowDecoration,
    authorUsername,
    authorAvatarUrl,
    sourceUrl,
    reactions,
  ]);

  useEffect(() => {
    return () => {
      if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current);
    };
  }, []);

  const handlePng = async () => {
    setExporting(true);
    try {
      const file = await renderToFile(
        code,
        filename,
        theme,
        EXPORT_WIDTH,
        undefined,
        toPngFilename(filename),
        settings.pixelRatio,
        bg,
        outerPadding,
        settings.lineNumbers,
        settings.fontId,
        settings.language,
        reactions,
        settings.showReactions,
        settings.header.enabled && settings.header.showFilename,
        settings.footer.enabled,
        authorUsername ?? null,
        authorAvatarUrl ?? null,
        comments,
        settings.showComments,
        sourceUrl ?? null,
        settings.windowDecoration,
        normalizedCornerRadius,
        normalizedInnerPadding,
        settings.header,
        settings.footer,
        normalizedFontSize,
      );
      triggerDownload(URL.createObjectURL(file), file.name, true);
    } finally {
      setExporting(false);
    }
  };

  const handleSvg = async () => {
    setExporting(true);
    try {
      const svg = await createHighlightedSvg(
        code,
        filename,
        theme,
        EXPORT_WIDTH,
        undefined,
        bg,
        outerPadding,
        settings.lineNumbers,
        settings.fontId,
        settings.language,
        reactions,
        settings.showReactions,
        settings.header.enabled && settings.header.showFilename,
        settings.footer.enabled,
        authorUsername ?? null,
        authorAvatarUrl ?? null,
        comments,
        settings.showComments,
        sourceUrl ?? null,
        settings.windowDecoration,
        normalizedCornerRadius,
        normalizedInnerPadding,
        settings.header,
        settings.footer,
        normalizedFontSize,
      );
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      triggerDownload(
        URL.createObjectURL(blob),
        toPngFilename(filename).replace(".png", ".svg"),
        true,
      );
    } finally {
      setExporting(false);
    }
  };

  const handleRaw = () => {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    triggerDownload(URL.createObjectURL(blob), filename || "snippet.txt", true);
  };

  // Use a Drawer on phone-sized viewports and a Dialog above the md
  // breakpoint. Same body inside; the wrapper just changes how the modal is
  // presented (slide up from the bottom on mobile, centred dialog on desktop).
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleOpenChange = (o: boolean) => {
    if (!o) onClose();
  };

  const body = (
    <>
      {/* Preview */}
      <div className="flex min-h-52 items-center justify-center overflow-hidden rounded-lg">
        {previewLoading ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            Rendering…
          </span>
        ) : previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc}
            alt="Export preview"
            className="max-h-72 max-w-full rounded object-contain shadow-md"
          />
        ) : null}
      </div>

      {/* Controls */}
      <div className="space-y-5">
        {/* Row 1: Background */}
        <div className="space-y-2.5">
          <p className="text-sm font-medium">Background</p>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              title="None"
              onClick={() => onSettingsChange({ ...settings, background: null })}
              className={cn(
                "flex size-7 items-center justify-center rounded-full border text-[11px] text-muted-foreground transition-all",
                settings.background === null
                  ? "border-foreground ring-2 ring-foreground ring-offset-2 ring-offset-background"
                  : "border-border hover:border-foreground/50",
              )}
            >
              ✕
            </button>
            {EXPORT_BACKGROUNDS.map((b) => (
              <button
                key={b.label}
                type="button"
                title={b.label}
                onClick={() => onSettingsChange({ ...settings, background: b.label })}
                className={cn(
                  "size-7 rounded-full transition-all hover:scale-110",
                  settings.background === b.label
                    ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-background"
                    : "",
                )}
                style={{ background: `linear-gradient(135deg, ${b.from}, ${b.to})` }}
              />
            ))}
            {/* Brand-flavoured gradients — separated by a thin divider so
                they don't blend into the generic gradient row. The brand
                logo doubles as the swatch's marker. */}
            <span aria-hidden className="mx-1 h-7 w-px bg-border" />
            {EXPORT_BRAND_BACKGROUNDS.map((b) => (
              <button
                key={b.label}
                type="button"
                title={b.label}
                onClick={() => onSettingsChange({ ...settings, background: b.label })}
                className={cn(
                  "flex size-7 items-center justify-center overflow-hidden rounded-full transition-all hover:scale-110",
                  settings.background === b.label
                    ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-background"
                    : "",
                )}
                // When a pattern PNG exists (Tailwind beams, Resend folded
                // paper), use it as the swatch background so the picker
                // looks like ray.so's. Falls back to the gradient otherwise.
                style={
                  b.patternUrl
                    ? {
                        backgroundImage: `url(${b.patternUrl}), linear-gradient(135deg, ${b.from}, ${b.to})`,
                        backgroundSize: "cover, cover",
                        backgroundPosition: "center, center",
                      }
                    : { background: `linear-gradient(135deg, ${b.from}, ${b.to})` }
                }
              >
                {b.logoUrl ? (
                  // CSS mask so the logo's color is controlled here, not
                  // baked into the SVG. White reads on every brand swatch
                  // (all of them have dark `from`/`to` gradients).
                  <span
                    aria-hidden
                    style={{
                      width: 14,
                      height: 14,
                      backgroundColor: "white",
                      maskImage: `url(${b.logoUrl})`,
                      WebkitMaskImage: `url(${b.logoUrl})`,
                      maskRepeat: "no-repeat",
                      WebkitMaskRepeat: "no-repeat",
                      maskSize: "contain",
                      WebkitMaskSize: "contain",
                      maskPosition: "center",
                      WebkitMaskPosition: "center",
                    }}
                  />
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Outer padding | Inner padding | Corners | Size */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <p
                className={cn(
                  "text-sm font-medium",
                  !settings.background && "text-muted-foreground/40",
                )}
              >
                Outer padding
              </p>
              <output className="text-xs text-muted-foreground">{normalizedOuterPadding}px</output>
            </div>
            <Slider
              aria-label="Outer padding"
              aria-valuetext={
                settings.outerPadding === 0 ? "No outer padding" : `${settings.outerPadding} pixels`
              }
              value={[exportOuterPaddingToSliderIndex(normalizedOuterPadding)]}
              onValueChange={([index = 0]) =>
                onSettingsChange({
                  ...settings,
                  outerPadding: exportOuterPaddingFromSliderIndex(index),
                })
              }
              min={0}
              max={5}
              step={1}
              disabled={!settings.background}
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Inner padding</p>
              <output className="text-xs text-muted-foreground">{normalizedInnerPadding}px</output>
            </div>
            <Slider
              aria-label="Inner padding"
              aria-valuetext={`${normalizedInnerPadding} pixels`}
              value={[exportInnerPaddingToSliderIndex(normalizedInnerPadding)]}
              onValueChange={([index = 0]) =>
                onSettingsChange({
                  ...settings,
                  innerPadding: exportInnerPaddingFromSliderIndex(index),
                })
              }
              min={0}
              max={5}
              step={1}
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Corners</p>
              <output className="text-xs text-muted-foreground">{normalizedCornerRadius}px</output>
            </div>
            <Slider
              aria-label="Corner radius"
              aria-valuetext={
                normalizedCornerRadius === 0 ? "Square corners" : `${normalizedCornerRadius} pixels`
              }
              value={[exportCornerRadiusToSliderIndex(normalizedCornerRadius)]}
              onValueChange={([index = 0]) =>
                onSettingsChange({
                  ...settings,
                  cornerRadius: exportCornerRadiusFromSliderIndex(index),
                })
              }
              min={0}
              max={4}
              step={1}
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <p className="text-sm font-medium">Size</p>
            <div className="flex items-center gap-1.5">
              {SIZE_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSettingsChange({ ...settings, pixelRatio: s })}
                  className={cn(
                    "h-11 rounded-md border px-3 text-sm transition-colors",
                    settings.pixelRatio === s
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/50",
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Language | Font | Font size */}
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          <div className="space-y-2.5">
            <p className="text-sm font-medium">Language</p>
            <select
              value={settings.language ?? ""}
              onChange={(e) => onSettingsChange({ ...settings, language: e.target.value || null })}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-hidden transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2.5">
            <p className="text-sm font-medium">Font</p>
            <select
              value={settings.fontId}
              onChange={(e) => onSettingsChange({ ...settings, fontId: e.target.value })}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-hidden transition focus-visible:ring-2 focus-visible:ring-ring"
              style={{ fontFamily: EXPORT_FONTS.find((f) => f.id === settings.fontId)?.family }}
            >
              {EXPORT_FONTS.map((f) => (
                <option key={f.id} value={f.id} style={{ fontFamily: f.family }}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2.5">
            <p className="text-sm font-medium">Font size</p>
            <select
              aria-label="Font size"
              value={String(normalizedFontSize)}
              onChange={(e) => onSettingsChange({ ...settings, fontSize: Number(e.target.value) })}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-hidden transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              {EXPORT_FONT_SIZE_VALUES.map((size) => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2.5">
          <p className="text-sm font-medium">Window</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              ["macOS", "macos"],
              ["macOS Subtle", "macos-subtle"],
              ["Windows", "windows"],
              ["Minimal", "minimal"],
              ["None", "none"],
            ].map(([label, value]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  onSettingsChange({ ...settings, windowDecoration: value as WindowDecoration })
                }
                className={cn(
                  "rounded-md border px-3 py-1 text-sm transition-colors",
                  settings.windowDecoration === value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground/50",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 border-t border-border pt-4">
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
            Lines
            <Switch
              checked={settings.lineNumbers}
              onCheckedChange={(lineNumbers) => onSettingsChange({ ...settings, lineNumbers })}
              aria-label="Show line numbers"
            />
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
            Reactions
            <Switch
              checked={settings.showReactions}
              onCheckedChange={(showReactions) => onSettingsChange({ ...settings, showReactions })}
              aria-label="Show reactions"
            />
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
            Comments
            <Switch
              checked={settings.showComments}
              onCheckedChange={(showComments) => onSettingsChange({ ...settings, showComments })}
              aria-label="Show comments"
            />
          </label>
        </div>

        <section
          aria-labelledby="export-header-label"
          className="flex flex-col gap-3 border-t border-border pt-4"
        >
          <div className="flex min-h-11 items-center justify-between gap-4">
            <div>
              <h3 id="export-header-label" className="text-sm font-medium">
                Header
              </h3>
              <p className="text-xs text-muted-foreground">Window chrome and labels</p>
            </div>
            <Switch
              checked={settings.header.enabled}
              onCheckedChange={(enabled) =>
                onSettingsChange({
                  ...settings,
                  header: { ...settings.header, enabled },
                })
              }
              aria-label="Show header"
            />
          </div>
          <div
            className={cn(
              "flex flex-col gap-2 pl-2",
              !settings.header.enabled && "pointer-events-none opacity-45",
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
                <label className="flex min-h-11 w-28 items-center justify-between gap-2 text-sm">
                  {label}
                  <Switch
                    checked={settings.header[visibilityKey]}
                    onCheckedChange={(checked) =>
                      onSettingsChange({
                        ...settings,
                        header: { ...settings.header, [visibilityKey]: checked },
                      })
                    }
                    aria-label={`Show header ${label.toLowerCase()}`}
                  />
                </label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={settings.header[positionKey]}
                  onValueChange={(position) => {
                    if (!position) return;
                    onSettingsChange({
                      ...settings,
                      header: { ...settings.header, [positionKey]: position },
                    });
                  }}
                  aria-label={`${label} position`}
                  className="grid w-full grid-cols-3"
                >
                  {(["left", "center", "right"] as const).map((position) => (
                    <ToggleGroupItem
                      key={position}
                      value={position}
                      aria-label={`${position} aligned ${label.toLowerCase()}`}
                      className="h-11 capitalize"
                    >
                      {position}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="export-footer-label"
          className="flex flex-col gap-3 border-t border-border pt-4"
        >
          <div className="flex min-h-11 items-center justify-between gap-4">
            <div>
              <h3 id="export-footer-label" className="text-sm font-medium">
                Footer
              </h3>
              <p className="text-xs text-muted-foreground">Select the metadata to include</p>
            </div>
            <Switch
              checked={settings.footer.enabled}
              onCheckedChange={(enabled) =>
                onSettingsChange({
                  ...settings,
                  footer: { ...settings.footer, enabled },
                })
              }
              aria-label="Show footer"
            />
          </div>
          <div
            className={cn(
              "flex flex-col gap-3 pl-2",
              !settings.footer.enabled && "pointer-events-none opacity-45",
            )}
          >
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              {[
                ["Language", "showLanguage"],
                ["Theme", "showTheme"],
                ["Line count", "showLineCount"],
                ["Characters", "showCharCount"],
                ["Author", "showAuthor"],
              ].map(([label, key]) => (
                <label key={key} className="flex min-h-11 items-center gap-3 text-sm">
                  {label}
                  <Switch
                    checked={
                      settings.footer[
                        key as
                          | "showLanguage"
                          | "showTheme"
                          | "showLineCount"
                          | "showCharCount"
                          | "showAuthor"
                      ]
                    }
                    onCheckedChange={(checked) =>
                      onSettingsChange({
                        ...settings,
                        footer: { ...settings.footer, [key]: checked },
                      })
                    }
                    aria-label={`Show footer ${label.toLowerCase()}`}
                  />
                </label>
              ))}
            </div>
            <ToggleGroup
              type="single"
              variant="outline"
              value={settings.footer.alignment}
              onValueChange={(alignment) => {
                if (!alignment) return;
                onSettingsChange({
                  ...settings,
                  footer: {
                    ...settings.footer,
                    alignment: alignment as ExportFooterSettings["alignment"],
                  },
                });
              }}
              aria-label="Footer position"
              className="grid w-full grid-cols-3"
            >
              {(["left", "center", "right"] as const).map((alignment) => (
                <ToggleGroupItem key={alignment} value={alignment} className="h-11 capitalize">
                  {alignment}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </section>
      </div>

      {/* Export actions */}
      <div className="border-t border-border pt-1">
        {EXPORT_ACTIONS.map(({ key, label, Icon, isAsync }) => {
          const handleClick = key === "png" ? handlePng : key === "svg" ? handleSvg : handleRaw;
          const displayLabel = key === "raw" ? `${label} ${filename || "snippet"}` : label;
          const isWaiting = exporting && isAsync;
          return (
            <button
              key={key}
              type="button"
              disabled={exporting}
              onClick={() => void handleClick()}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
            >
              {isWaiting ? (
                <Spinner className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <Icon className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="flex-1 text-left">{isWaiting ? "Exporting…" : displayLabel}</span>
            </button>
          );
        })}
      </div>
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl gap-6">
          <DialogHeader>
            <DialogTitle>Export</DialogTitle>
            <DialogDescription className="sr-only">
              Configure and download your code snippet as an image.
            </DialogDescription>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Export</DrawerTitle>
          <DrawerDescription className="sr-only">
            Configure and download your code snippet as an image.
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-6">{body}</div>
      </DrawerContent>
    </Drawer>
  );
}
