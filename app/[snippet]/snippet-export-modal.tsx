"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { availableLanguages } from "@lumis-sh/lumis/client";
import { ExportModal, type ExportSettings } from "@/components/export-modal";
import type { SnippetAppearance } from "@/lib/snippet-appearance";

type Props = {
  code: string;
  filename: string;
  theme: string;
  fontId: string;
  /** The stored language, so exports highlight the code as the page does. */
  language: string;
  /** The published appearance; exports start from it. */
  appearance: SnippetAppearance;
  authorUsername?: string | null;
  authorAvatarUrl?: string | null;
  reactions?: Record<number, import("@/lib/snippet-utils").ExportReactionChip[]>;
  comments?: Record<number, import("@/lib/export-utils").ExportComment>;
  sourceUrl?: string | null;
  /** Inline style forwarded to the trigger so it can pick up the active syntax palette. */
  style?: React.CSSProperties;
};

export function SnippetExportModal({
  code,
  filename,
  theme,
  fontId,
  language,
  appearance,
  authorUsername,
  authorAvatarUrl,
  reactions,
  comments,
  sourceUrl,
  style,
}: Props) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<ExportSettings>({
    ...appearance,
    fontId,
    showComments: false,
    language: availableLanguages().some((l) => l.id === language) ? language : null,
  });

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
        <span className="hidden sm:inline">Export</span>
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
        comments={comments}
        sourceUrl={sourceUrl}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </>
  );
}
