"use client";

import { useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EXPORT_WIDTH,
  toPngFilename,
  triggerDownload,
  createHighlightedSvg,
  renderToFile,
} from "@/lib/export-utils";

type Props = {
  code: string;
  filename: string;
  theme: string;
  pngUrl?: string;
  svgUrl?: string;
  rawUrl?: string;
};

async function downloadFromStorage(url: string, filename: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  triggerDownload(URL.createObjectURL(blob), filename, true);
}

export function ExportButton({ code, filename, theme, pngUrl, svgUrl, rawUrl }: Props) {
  const [busy, setBusy] = useState(false);

  const handlePng = async () => {
    setBusy(true);
    try {
      if (pngUrl) {
        await downloadFromStorage(pngUrl, toPngFilename(filename));
      } else {
        const file = await renderToFile(
          code,
          filename,
          theme,
          EXPORT_WIDTH,
          undefined,
          toPngFilename(filename),
        );
        triggerDownload(URL.createObjectURL(file), file.name, true);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSvg = async () => {
    setBusy(true);
    try {
      if (svgUrl) {
        await downloadFromStorage(svgUrl, toPngFilename(filename).replace(".png", ".svg"));
      } else {
        const svg = await createHighlightedSvg(code, filename, theme, EXPORT_WIDTH, undefined);
        const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        triggerDownload(
          URL.createObjectURL(blob),
          toPngFilename(filename).replace(".png", ".svg"),
          true,
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRaw = async () => {
    setBusy(true);
    try {
      if (rawUrl) {
        await downloadFromStorage(rawUrl, filename || "snippet.txt");
      } else {
        const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
        triggerDownload(URL.createObjectURL(blob), filename || "snippet.txt", true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={busy} className="gap-1.5">
          <Download className="size-4" />
          Export
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void handlePng()}>PNG</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handleSvg()}>SVG</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handleRaw()}>
          Raw — {filename || "snippet"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
