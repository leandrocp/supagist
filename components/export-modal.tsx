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
import { availableLanguages } from "@lumis-sh/lumis";
import {
  EXPORT_WIDTH,
  EXPORT_BACKGROUNDS,
  EXPORT_BRAND_BACKGROUNDS,
  EXPORT_FONTS,
  type ExportBackground,
  createHighlightedSvg,
  renderToFile,
  toPngFilename,
  triggerDownload,
} from "@/lib/export-utils";
import { cn } from "@/lib/utils";
import type { ExportReactionChip } from "@/lib/snippet-utils";
import { Spinner } from "@/components/ui/spinner";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";

const LANGUAGES = [
  { id: "", name: "Auto-Detect" },
  ...availableLanguages().map((l) => ({ id: l.id, name: l.id })),
];

const PADDING_OPTIONS = [16, 32, 64, 128] as const;
const SIZE_OPTIONS = [2, 4, 6] as const;

const EXPORT_ACTIONS = [
  { key: "png", label: "Save as PNG", Icon: ImageIcon, isAsync: true },
  { key: "svg", label: "Save as SVG", Icon: FileImage, isAsync: true },
  { key: "raw", label: "Download", Icon: FileText, isAsync: false },
] as const;

export type ExportSettings = {
  background: string | null;
  padding: number;
  pixelRatio: number;
  lineNumbers: boolean;
  showReactions: boolean;
  showFilename: boolean;
  showFooter: boolean;
  fontId: string;
  language: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  code: string;
  filename: string;
  theme: string;
  reactions?: Record<number, ExportReactionChip[]>;
  /** Author username displayed in the footer chip when `showFooter` is on. */
  authorUsername?: string | null;
  /** Optional avatar URL for the footer chip — falls back to initial circle when missing. */
  authorAvatarUrl?: string | null;
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
  authorUsername,
  authorAvatarUrl,
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
  const pad = settings.background ? settings.padding : 0;

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
      pad,
      settings.lineNumbers,
      settings.fontId,
      settings.language,
      reactions,
      settings.showReactions,
      settings.showFilename,
      settings.showFooter,
      authorUsername ?? null,
      authorAvatarUrl ?? null,
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
    settings.padding,
    settings.lineNumbers,
    settings.fontId,
    settings.language,
    settings.showReactions,
    settings.showFilename,
    settings.showFooter,
    authorUsername,
    authorAvatarUrl,
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
        pad,
        settings.lineNumbers,
        settings.fontId,
        settings.language,
        reactions,
        settings.showReactions,
        settings.showFilename,
        settings.showFooter,
        authorUsername ?? null,
        authorAvatarUrl ?? null,
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
        pad,
        settings.lineNumbers,
        settings.fontId,
        settings.language,
        reactions,
        settings.showReactions,
        settings.showFilename,
        settings.showFooter,
        authorUsername ?? null,
        authorAvatarUrl ?? null,
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
                        backgroundImage: `url(${b.patternUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : { background: `linear-gradient(135deg, ${b.from}, ${b.to})` }
                }
              >
                {b.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.logoUrl}
                    alt=""
                    width={14}
                    height={14}
                    style={{ width: 14, height: 14 }}
                  />
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Padding | Size */}
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2.5">
            <p
              className={cn(
                "text-sm font-medium",
                !settings.background && "text-muted-foreground/40",
              )}
            >
              Padding
            </p>
            <div className="flex items-center gap-1.5">
              {PADDING_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={!settings.background}
                  onClick={() => onSettingsChange({ ...settings, padding: p })}
                  className={cn(
                    "rounded-md border px-3 py-1 text-sm transition-colors",
                    settings.padding === p && settings.background
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/50",
                    !settings.background && "cursor-not-allowed opacity-30",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-sm font-medium">Size</p>
            <div className="flex items-center gap-1.5">
              {SIZE_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSettingsChange({ ...settings, pixelRatio: s })}
                  className={cn(
                    "rounded-md border px-3 py-1 text-sm transition-colors",
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

        {/* Row 3: Language | Font */}
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2.5">
            <p className="text-sm font-medium">Language</p>
            <select
              value={settings.language ?? ""}
              onChange={(e) => onSettingsChange({ ...settings, language: e.target.value || null })}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
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
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              style={{ fontFamily: EXPORT_FONTS.find((f) => f.id === settings.fontId)?.family }}
            >
              {EXPORT_FONTS.map((f) => (
                <option key={f.id} value={f.id} style={{ fontFamily: f.family }}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 4: Lines | Reactions | Filename | Footer */}
        <div className="grid grid-cols-4 gap-5">
          <div className="space-y-2.5">
            <p className="text-sm font-medium">Lines</p>
            <button
              type="button"
              role="switch"
              aria-checked={settings.lineNumbers}
              onClick={() => onSettingsChange({ ...settings, lineNumbers: !settings.lineNumbers })}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                settings.lineNumbers ? "bg-foreground" : "bg-input",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block size-3.5 rounded-full bg-background shadow transition-transform",
                  settings.lineNumbers ? "translate-x-4" : "translate-x-0.5",
                )}
              />
            </button>
          </div>

          <div className="space-y-2.5">
            <p className="text-sm font-medium">Reactions</p>
            <button
              type="button"
              role="switch"
              aria-checked={settings.showReactions}
              onClick={() =>
                onSettingsChange({ ...settings, showReactions: !settings.showReactions })
              }
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                settings.showReactions ? "bg-foreground" : "bg-input",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block size-3.5 rounded-full bg-background shadow transition-transform",
                  settings.showReactions ? "translate-x-4" : "translate-x-0.5",
                )}
              />
            </button>
          </div>

          <div className="space-y-2.5">
            <p className="text-sm font-medium">Filename</p>
            <button
              type="button"
              role="switch"
              aria-checked={settings.showFilename}
              onClick={() =>
                onSettingsChange({ ...settings, showFilename: !settings.showFilename })
              }
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                settings.showFilename ? "bg-foreground" : "bg-input",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block size-3.5 rounded-full bg-background shadow transition-transform",
                  settings.showFilename ? "translate-x-4" : "translate-x-0.5",
                )}
              />
            </button>
          </div>

          <div className="space-y-2.5">
            <p className="text-sm font-medium">Footer</p>
            <button
              type="button"
              role="switch"
              aria-checked={settings.showFooter}
              onClick={() => onSettingsChange({ ...settings, showFooter: !settings.showFooter })}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                settings.showFooter ? "bg-foreground" : "bg-input",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block size-3.5 rounded-full bg-background shadow transition-transform",
                  settings.showFooter ? "translate-x-4" : "translate-x-0.5",
                )}
              />
            </button>
          </div>
        </div>
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
