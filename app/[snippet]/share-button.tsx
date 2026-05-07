"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/**
 * Lightweight ghost-style "Copy link" trigger sized to sit alongside the
 * editor's other chrome buttons. `style` is forwarded so the consumer can
 * theme it against the active syntax palette.
 */
export function ShareButton({ url, style }: { url: string; style?: React.CSSProperties }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      title="Copy link"
      aria-label="Copy link"
      className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-opacity hover:opacity-80"
      style={style}
    >
      {copied ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}
