"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, X } from "lucide-react";
import { Seal } from "@/components/brand/envelope";
import { SealMark } from "@/components/brand/seal-mark";
import { play, prefersReducedMotion, takeJustPublished } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Visibility = "public" | "unlisted";

/** How long the share-link pill stays before it slides away on its own. */
const LINK_VISIBLE_MS = 12_000;

/**
 * The publish moment. When the composer has just published this snippet (see
 * markJustPublished), the brand seal is pressed onto the card's corner — the
 * R3 wax seal for public snippets, the flat one-colour wax seal (brand mono)
 * for unlisted ones — the card gives under the impact, and the share link slides
 * up. It plays once: a reload or any later visit renders nothing.
 *
 * Render it inside a `relative` box that wraps the snippet canvas. It is
 * purely decorative chrome over the page; it never touches the snippet's
 * rendered or exported images.
 */
export function PublishStamp({ visibility, url }: { visibility: Visibility; url: string }) {
  const [state, setState] = useState<{
    copied: boolean;
    reduced: boolean;
    target: Element;
  } | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Read (and clear) the marker once. Under Strict Mode's double effect run
  // the second read finds nothing and leaves the state alone.
  useEffect(() => {
    const marker = takeJustPublished(window.location.pathname);
    if (!marker) return;
    // The seal is pressed onto the canvas (or the bare card) corner.
    const target =
      document.querySelector('[data-testid="snippet-canvas"]') ??
      document.querySelector('[data-testid="snippet-card"]');
    if (!target) return;
    setState({ copied: marker.copied, reduced: prefersReducedMotion(), target });
    setCopied(marker.copied);
  }, []);

  useEffect(() => {
    if (!state) return;
    // The card gives a little under the impact (transform only).
    const shake = window.setTimeout(() => {
      play(
        state.target,
        [
          { transform: "none" },
          { transform: "translate3d(0, 3px, 0) scale(0.994)" },
          { transform: "translate3d(-2px, -1px, 0) rotate(-0.25deg)" },
          { transform: "translate3d(1px, 0, 0) rotate(0.15deg)" },
          { transform: "none" },
        ],
        { duration: 340, easing: "ease-out" },
      );
    }, 230);
    const reveal = window.setTimeout(() => setLinkOpen(true), state.reduced ? 0 : 650);
    const hide = window.setTimeout(() => setLinkOpen(false), LINK_VISIBLE_MS);
    return () => {
      window.clearTimeout(shake);
      window.clearTimeout(reveal);
      window.clearTimeout(hide);
    };
  }, [state]);

  if (!state) return null;

  const unlisted = visibility === "unlisted";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      {/* The seal itself, portalled into the canvas so it sits on the card's
          corner and moves with it. Decorative and never takes pointer events,
          so the card stays fully usable while it plays. */}
      {createPortal(
        <div
          aria-hidden="true"
          data-testid="publish-stamp"
          data-variant={visibility}
          data-motion={state.reduced ? "reduced" : "full"}
          className="pointer-events-none absolute top-2 right-2 z-30 size-24 sm:top-3 sm:right-3 sm:size-28"
        >
          <span
            className={cn(
              "stamp-ink absolute inset-[6%] rounded-full",
              unlisted
                ? "bg-[radial-gradient(closest-side,hsl(var(--wax)/0.3),hsl(var(--wax)/0))]"
                : "bg-[radial-gradient(closest-side,hsl(var(--wax)/0.5),hsl(var(--wax)/0))]",
            )}
          />
          <div
            className="stamp-press absolute inset-0"
            style={{ "--stamp-rotate": unlisted ? "8deg" : "0deg" } as React.CSSProperties}
          >
            {unlisted ? (
              // The brand's one-colour wax seal, pressed flat like a rubber
              // stamp. Wax reads on light and dark cards alike.
              <img
                src="/brand/seal-a-wax.svg"
                alt=""
                width={512}
                height={512}
                className="size-full opacity-90"
              />
            ) : (
              // The R3 wax seal with its own light and contact shadow; its −10°
              // tilt is built into <Seal>.
              <Seal className="size-full" />
            )}
          </div>
        </div>,
        state.target,
      )}

      {/* Polite status for screen readers: one message, only for this publish. */}
      <p role="status" className="sr-only">
        {state.copied ? "Published. Link copied." : "Published."}
      </p>

      {/* The share link, as a pill pinned to the bottom of the viewport so it
          never shifts the layout. */}
      {linkOpen ? (
        <div
          data-testid="publish-link"
          className="rise-in fixed inset-x-0 bottom-5 z-50 flex justify-center px-4"
        >
          <div className="flex max-w-full items-center gap-2 rounded-full bg-ink py-1.5 pr-1.5 pl-3 text-paper shadow-[0_18px_40px_-18px_rgb(0_0_0/0.55)]">
            <SealMark className="size-5" />
            <a
              href={url}
              className="min-w-0 truncate rounded-sm font-mono text-[13px] focus-visible:focus-ring"
            >
              {displayUrl(url)}
            </a>
            <button
              type="button"
              onClick={() => void copy()}
              className="press flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-paper/12 px-3.5 text-[13px] font-semibold hover:bg-paper/20 focus-visible:focus-ring sm:min-h-9"
            >
              {copied ? (
                <Check key="copied" className="pop-in size-3.5" aria-hidden="true" />
              ) : (
                <Copy className="size-3.5" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={() => setLinkOpen(false)}
              aria-label="Dismiss"
              className="press flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-paper/12 focus-visible:focus-ring sm:size-9"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** `https://supagist.app/hello-ts-abc123` → `supagist.app/hello-ts-abc123`. */
function displayUrl(url: string): string {
  try {
    const { host, pathname } = new URL(url);
    return host + pathname;
  } catch {
    return url;
  }
}
