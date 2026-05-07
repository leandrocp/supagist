"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { ExportModal, type ExportSettings } from "@/components/export-modal";

const DEFAULT_SETTINGS: ExportSettings = {
  background: null,
  padding: 64,
  pixelRatio: 4,
  lineNumbers: false,
  showReactions: false,
  showFilename: true,
  showFooter: false,
  fontId: "system",
  language: null,
};

type Props = {
  code: string;
  filename: string;
  theme: string;
  authorUsername?: string | null;
  authorAvatarUrl?: string | null;
  reactions?: Record<number, import("@/lib/snippet-utils").ExportReactionChip[]>;
  /** Inline style forwarded to the trigger so it can pick up the active syntax palette. */
  style?: React.CSSProperties;
};

export function SnippetExportModal({
  code,
  filename,
  theme,
  authorUsername,
  authorAvatarUrl,
  reactions,
  style,
}: Props) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<ExportSettings>(DEFAULT_SETTINGS);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Export"
        aria-label="Export"
        className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-opacity hover:opacity-80"
        style={style}
      >
        <Download className="size-3.5" />
        Export
      </button>
      <ExportModal
        open={open}
        onClose={() => setOpen(false)}
        code={code}
        filename={filename}
        theme={theme}
        authorUsername={authorUsername}
        authorAvatarUrl={authorAvatarUrl}
        reactions={reactions}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </>
  );
}
