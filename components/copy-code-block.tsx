"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/** A static code block with a copy button, for commands and config on docs pages. */
export function CopyCodeBlock({ children: code }: { children: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex items-start rounded-lg bg-surf2">
      <pre className="min-w-0 flex-1 overflow-x-auto py-3 pl-4 font-mono text-[13px] leading-relaxed text-foreground md:text-sm">
        <code>{code}</code>
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy"}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        {copied ? (
          <Check key="copied" className="pop-in size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}
