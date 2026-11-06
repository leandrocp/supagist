"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, ClipboardType, FileImage, FileText, ImageIcon } from "lucide-react";
import {
  EXPORT_INNER_PADDING,
  EXPORT_FONT_SIZE,
  normalizeExportFontSize,
  normalizeExportCornerRadius,
  normalizeExportInnerPadding,
  normalizeExportOuterPadding,
  type ExportAspectRatio,
  type ExportOptions,
  type WindowDecoration,
  createHighlightedSvg,
  renderToFile,
  toPngFilename,
  triggerDownload,
  type ExportComment,
} from "@/lib/export-utils";
import { toast } from "sonner";
import { copyRichText, createRichTextClipboard } from "@/lib/rich-text-export";
import { cn } from "@/lib/utils";
import { findExportBackground } from "@/lib/snippet-appearance";
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
import { Switch } from "@/components/ui/switch";
import type { ExportFooterSettings, ExportHeaderSettings } from "@/lib/export-metadata";

const SIZE_OPTIONS = [2, 4, 6] as const;

const EXPORT_ACTIONS = [
  { key: "png", label: "Save as PNG", Icon: ImageIcon, isAsync: true },
  { key: "svg", label: "Save as SVG", Icon: FileImage, isAsync: true },
  { key: "raw", label: "Download", Icon: FileText, isAsync: false },
  { key: "rich", label: "Copy as rich text", Icon: ClipboardType, isAsync: false },
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
  aspectRatio: ExportAspectRatio | null;
  ligatures: boolean;
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
  const [richCopied, setRichCopied] = useState(false);
  // The action that just finished shows a check for a moment (tactile feedback).
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashDone = (key: string) => {
    if (doneTimer.current) clearTimeout(doneTimer.current);
    setDoneKey(key);
    doneTimer.current = setTimeout(() => setDoneKey(null), 1400);
  };
  const prevPreviewUrl = useRef<string | null>(null);

  const normalizedFontSize = normalizeExportFontSize(settings.fontSize ?? EXPORT_FONT_SIZE);
  const exportOptions: ExportOptions = {
    code,
    filename,
    theme,
    background: findExportBackground(settings.background),
    outerPadding: normalizeExportOuterPadding(settings.outerPadding),
    lineNumbers: settings.lineNumbers,
    fontId: settings.fontId,
    language: settings.language,
    reactions,
    showReactions: settings.showReactions,
    footerAuthorUsername: authorUsername,
    footerAuthorAvatarUrl: authorAvatarUrl,
    comments,
    showComments: settings.showComments,
    sourceUrl,
    windowDecoration: settings.windowDecoration,
    cornerRadius: normalizeExportCornerRadius(settings.cornerRadius),
    innerPadding: normalizeExportInnerPadding(settings.innerPadding ?? EXPORT_INNER_PADDING),
    header: settings.header,
    footer: settings.footer,
    fontSize: normalizedFontSize,
    aspectRatio: settings.aspectRatio,
    ligatures: settings.ligatures,
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPreviewLoading(true);

    void createHighlightedSvg(exportOptions).then((svg) => {
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
    settings.showComments,
    settings.header,
    settings.footer,
    settings.windowDecoration,
    settings.aspectRatio,
    settings.ligatures,
    authorUsername,
    authorAvatarUrl,
    sourceUrl,
    reactions,
    comments,
  ]);

  useEffect(() => {
    return () => {
      if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current);
    };
  }, []);

  const handlePng = async () => {
    setExporting(true);
    try {
      const file = await renderToFile({
        ...exportOptions,
        outFilename: toPngFilename(filename),
        pixelRatio: settings.pixelRatio,
      });
      triggerDownload(URL.createObjectURL(file), file.name, true);
      flashDone("png");
    } finally {
      setExporting(false);
    }
  };

  const handleSvg = async () => {
    setExporting(true);
    try {
      const svg = await createHighlightedSvg(exportOptions);
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      triggerDownload(
        URL.createObjectURL(blob),
        toPngFilename(filename).replace(".png", ".svg"),
        true,
      );
      flashDone("svg");
    } finally {
      setExporting(false);
    }
  };

  const handleRaw = () => {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    triggerDownload(URL.createObjectURL(blob), filename || "snippet.txt", true);
  };

  const handleRichText = async () => {
    try {
      await copyRichText(
        createRichTextClipboard(code, filename, theme, {
          fontId: settings.fontId,
          fontSize: normalizedFontSize,
          language: settings.language,
        }),
      );
    } catch {
      toast.error("Could not copy to the clipboard.");
      return;
    }
    setRichCopied(true);
    setTimeout(() => setRichCopied(false), 2000);
  };

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleOpenChange = (o: boolean) => {
    if (!o) onClose();
  };

  // Desktop is a full-screen view: the preview fills the left and stays in
  // sight while the settings scroll in their own column on the right, with
  // the actions pinned under them. Mobile stacks preview, settings, actions.
  const body = (
    <div
      data-testid="export-body"
      className="grid gap-6 md:min-h-0 md:flex-1 md:grid-cols-[minmax(0,1fr)_18rem] md:grid-rows-[minmax(0,1fr)_auto]"
    >
      <div
        data-testid="export-preview"
        className="flex min-h-52 items-center justify-center overflow-hidden rounded-[18px] bg-surf2 p-6 md:row-span-2 md:min-h-0 md:p-10"
      >
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
            className="max-h-72 max-w-full rounded object-contain shadow-md md:max-h-full"
          />
        ) : null}
      </div>

      <div
        data-testid="export-settings"
        className="space-y-5 md:col-start-2 md:row-start-1 md:min-h-0 md:overflow-y-auto"
      >
        {/* A published snippet is sealed: exports keep its published look.
            Only choices about the exported file itself are offered here. */}
        <p className="text-sm text-muted-foreground">
          Exports use the snippet exactly as it was sealed.
        </p>

        <div className="flex flex-col gap-2.5">
          <p className="text-sm font-medium">Scale</p>
          <div className="flex items-center gap-1.5">
            {SIZE_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSettingsChange({ ...settings, pixelRatio: s })}
                aria-pressed={settings.pixelRatio === s}
                className={cn(
                  "h-11 rounded-full px-3.5 text-sm font-medium transition-colors focus-visible:focus-ring",
                  settings.pixelRatio === s
                    ? "bg-foreground text-background"
                    : "bg-surf2 text-muted-foreground hover:text-foreground",
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {comments && Object.keys(comments).length > 0 ? (
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-medium">
            Include comments
            <Switch
              checked={settings.showComments}
              onCheckedChange={(showComments) => onSettingsChange({ ...settings, showComments })}
              aria-label="Show comments"
            />
          </label>
        ) : null}
      </div>

      <div className="flex flex-col gap-1 rounded-[14px] bg-surf2 p-1.5 md:col-start-2 md:row-start-2">
        {EXPORT_ACTIONS.map(({ key, label, Icon, isAsync }) => {
          const handleClick =
            key === "png"
              ? handlePng
              : key === "svg"
                ? handleSvg
                : key === "rich"
                  ? handleRichText
                  : handleRaw;
          const copied = key === "rich" && richCopied;
          const done = copied || doneKey === key;
          const displayLabel =
            key === "raw" ? `${label} ${filename || "snippet"}` : copied ? "Copied" : label;
          const isWaiting = exporting && isAsync;
          return (
            <button
              key={key}
              type="button"
              disabled={exporting}
              onClick={() => void handleClick()}
              className="press flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surf3 focus-visible:focus-ring disabled:pointer-events-none disabled:opacity-40"
            >
              {isWaiting ? (
                <Spinner className="size-4 shrink-0 text-muted-foreground" />
              ) : done ? (
                <Check className="pop-in size-4 shrink-0 text-muted-foreground" />
              ) : (
                <Icon className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate text-left">
                {isWaiting ? "Exporting…" : displayLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] flex-col gap-6 sm:max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="font-display text-[32px] font-normal">Export</DialogTitle>
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
          <DrawerTitle className="font-display text-[28px] font-normal">Export</DrawerTitle>
          <DrawerDescription className="sr-only">
            Configure and download your code snippet as an image.
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-6">{body}</div>
      </DrawerContent>
    </Drawer>
  );
}
