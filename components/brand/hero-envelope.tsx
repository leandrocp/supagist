"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The publish moment's big envelope: the new snippet's card slides into an
 * open Envelope B, the flap folds shut, the wax seal stamps down and the
 * letter is sent off, in about 1.8 s, after which `onSent` runs. Reduced
 * motion shows the sealed envelope still and calls `onSent` at once.
 *
 * The envelope is split into its layers so the card can sit inside it and
 * the flap can fold. React only steps `data-phase`; globals.css
 * (".hero-scene") does every movement. Decorative: the caller announces it.
 */

type SendPhase = "reading" | "insert" | "close" | "seal" | "send";

/** How long each phase holds before the next. */
const STEPS: readonly (readonly [SendPhase, number])[] = [
  ["reading", 150],
  ["insert", 450],
  ["close", 400],
  ["seal", 500],
  ["send", 400],
];

/** The card the envelope carries: plain text, so no highlighter is needed. */
const CARD = {
  bg: "#ffffff",
  fg: "#1f2328",
  muted: "#6e7781",
  border: "#d0d7de",
};

type Props = {
  file: string;
  lang: string;
  code: string;
  onSent: () => void;
  className?: string;
};

export function SendEnvelope({ file, lang, code, onSent, className }: Props) {
  const [phase, setPhase] = useState<SendPhase>(() =>
    prefersReducedMotion() ? "seal" : "reading",
  );

  useEffect(() => {
    if (prefersReducedMotion()) {
      onSent();
      return;
    }
    const timers: number[] = [];
    let at = 0;
    STEPS.forEach(([, hold], index) => {
      at += hold;
      const next = STEPS[index + 1]?.[0];
      timers.push(window.setTimeout(() => (next ? setPhase(next) : onSent()), at));
    });
    return () => timers.forEach((timer) => window.clearTimeout(timer));
    // Plays once per mount.
  }, []);

  return (
    <div
      aria-hidden="true"
      data-testid="send-envelope"
      data-phase={phase}
      className={cn("hero-scene relative", className)}
    >
      <div className="hero-tilt absolute inset-0">
        <div className="hero-rig">
          <div className="hero-body">
            <EnvelopeLayer part="back" />
            <div className="hero-flap">
              <div className="hero-flap-face">
                <EnvelopeLayer part="flap" />
              </div>
              <div className="hero-flap-face hero-flap-inside">
                <EnvelopeLayer part="inside" />
              </div>
            </div>
            <CodeCard file={file} lang={lang} code={code} />
            <EnvelopeLayer part="pocket" />
            <div className="hero-seal">
              <img
                src="/brand/seal-r3-240.png"
                alt=""
                width={240}
                height={240}
                decoding="async"
                className="hero-seal-whole"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CodeCard({ file, lang, code }: { file: string; lang: string; code: string }) {
  return (
    <div
      className="hero-card"
      style={
        {
          "--c-bg": CARD.bg,
          "--c-fg": CARD.fg,
          "--c-muted": CARD.muted,
          "--c-border": CARD.border,
        } as CSSProperties
      }
    >
      <div className="hero-card-bar">
        <span className="hero-card-dots">
          <i style={{ background: "#ff5f57" }} />
          <i style={{ background: "#febc2e" }} />
          <i style={{ background: "#28c840" }} />
        </span>
        <span className="hero-card-file">{file}</span>
        <span className="hero-card-lang">{lang}</span>
      </div>
      {/* The first lines are enough to recognise it inside an envelope. */}
      <pre className="hero-card-code">{code.split("\n").slice(0, 3).join("\n")}</pre>
    </div>
  );
}

/** The 660×400 Envelope B artwork, one layer at a time. Colours come from the
 * --env-* custom properties so it follows the light and dark themes. */
function EnvelopeLayer({ part }: { part: "back" | "flap" | "inside" | "pocket" }) {
  const id = `hero-${part}`;
  const grain = (
    <filter id={`${id}g`} x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" seed="7" result="n" />
      <feColorMatrix
        in="n"
        type="matrix"
        values="0 0 0 0 .5  0 0 0 0 .4  0 0 0 0 .25  0 0 0 .12 0"
      />
      <feComposite in2="SourceGraphic" operator="in" />
    </filter>
  );
  const lift = (
    <filter id={`${id}l`} x="-10%" y="-10%" width="120%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
      <feOffset dy="5" />
      <feComponentTransfer>
        <feFuncA type="linear" slope=".3" />
      </feComponentTransfer>
      <feMerge>
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );

  if (part === "back") {
    return (
      <svg className="hero-layer hero-back" viewBox="0 0 660 400" preserveAspectRatio="none">
        <defs>{grain}</defs>
        <rect width="660" height="400" style={{ fill: "var(--env-back)" }} />
        <rect width="660" height="400" fill="#fff" filter={`url(#${id}g)`} />
      </svg>
    );
  }
  if (part === "pocket") {
    const shapes = [
      ["M0,0 L260,212 Q330,218 260,228 L0,400 Z", "var(--env-side)"],
      ["M660,0 L400,212 Q330,218 400,228 L660,400 Z", "var(--env-side)"],
      ["M0,400 L290,174 Q330,160 370,174 L660,400 Z", "var(--env-bottom)"],
    ] as const;
    return (
      <svg className="hero-layer hero-pocket" viewBox="0 0 660 400" preserveAspectRatio="none">
        <defs>
          {grain}
          {lift}
          <clipPath id={`${id}c`}>
            {shapes.map(([d]) => (
              <path key={d} d={d} />
            ))}
          </clipPath>
        </defs>
        {shapes.map(([d, fill]) => (
          <path key={d} d={d} style={{ fill }} filter={`url(#${id}l)`} />
        ))}
        <rect
          width="660"
          height="400"
          fill="#fff"
          filter={`url(#${id}g)`}
          clipPath={`url(#${id}c)`}
        />
      </svg>
    );
  }
  // The flap, 660×240 from the top edge. Its inside is drawn tip-up, because
  // the face is flipped once more when the flap opens.
  const d =
    part === "flap"
      ? "M0,0 L660,0 L351,224.7 Q330,240 309,224.7 Z"
      : "M0,240 L660,240 L351,15.3 Q330,0 309,15.3 Z";
  return (
    <svg className="hero-layer" viewBox="0 0 660 240" preserveAspectRatio="none">
      <defs>
        {grain}
        <clipPath id={`${id}c`}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={d} style={{ fill: part === "flap" ? "var(--env-flap)" : "var(--env-inside)" }} />
      <rect
        width="660"
        height="240"
        fill="#fff"
        filter={`url(#${id}g)`}
        clipPath={`url(#${id}c)`}
      />
    </svg>
  );
}
