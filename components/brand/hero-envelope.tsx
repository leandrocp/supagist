"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";

/**
 * The home hero: a little postal loop. A code card types itself out above an
 * open envelope, slides in, the flap folds shut, the wax seal stamps down, a
 * postmark lands and the envelope is sent off. The next one arrives sealed,
 * its seal cracks, the flap opens and the next snippet rises out. Repeat.
 *
 * The envelope is Envelope B (public/brand/envelope-b*.svg) split into its
 * layers so the card can sit inside it and the flap can fold. React only
 * steps `data-phase`; globals.css (".hero-scene") does every movement.
 * Reduced motion keeps the first frame: the card out of an open envelope.
 * Decorative: the h1 says it.
 */

type Tone = "kw" | "fn" | "str" | "tag" | "num";
type Token = readonly [text: string, tone?: Tone];
type Theme = Record<"bg" | "fg" | "muted" | "border" | Tone, string>;
type Snippet = { file: string; lang: string; theme: Theme; lines: readonly (readonly Token[])[] };

const HERO_SNIPPETS: readonly Snippet[] = [
  {
    file: "snippet.tsx",
    lang: "TSX",
    // github_light
    theme: {
      bg: "#ffffff",
      fg: "#1f2328",
      muted: "#6e7781",
      border: "#d0d7de",
      kw: "#cf222e",
      fn: "#8250df",
      str: "#0a3069",
      tag: "#116329",
      num: "#0550ae",
    },
    lines: [
      [["export", "kw"], [" "], ["function", "kw"], [" "], ["Render", "fn"], ["() {"]],
      [
        ["  "],
        ["return", "kw"],
        [" <"],
        ["h1", "tag"],
        [">"],
        ["Hello, Supagist!", "str"],
        ["</"],
        ["h1", "tag"],
        [">;"],
      ],
      [["}"]],
    ],
  },
  {
    file: "gist.ex",
    lang: "Elixir",
    // dracula
    theme: {
      bg: "#282a36",
      fg: "#f8f8f2",
      muted: "#6272a4",
      border: "#44475a",
      kw: "#ff79c6",
      fn: "#50fa7b",
      str: "#f1fa8c",
      tag: "#8be9fd",
      num: "#bd93f9",
    },
    lines: [
      [["defmodule", "kw"], [" "], ["Gist", "tag"], [" "], ["do", "kw"]],
      [
        ["  "],
        ["def", "kw"],
        [" "],
        ["share", "fn"],
        ["(code), "],
        ["do:", "num"],
        [" "],
        ["seal", "fn"],
        ["(code)"],
      ],
      [["end", "kw"]],
    ],
  },
  {
    file: "main.rs",
    lang: "Rust",
    // catppuccin_mocha
    theme: {
      bg: "#1e1e2e",
      fg: "#cdd6f4",
      muted: "#7f849c",
      border: "#313244",
      kw: "#cba6f7",
      fn: "#89b4fa",
      str: "#a6e3a1",
      tag: "#94e2d5",
      num: "#fab387",
    },
    lines: [
      [["fn", "kw"], [" "], ["main", "fn"], ["() {"]],
      [["    "], ["println!", "tag"], ["("], ['"sealed & sent"', "str"], [");"]],
      [["}"]],
    ],
  },
  {
    file: "shared.sql",
    lang: "SQL",
    // solarized_light
    theme: {
      bg: "#fdf6e3",
      fg: "#586e75",
      muted: "#93a1a1",
      border: "#eee8d5",
      kw: "#859900",
      fn: "#268bd2",
      str: "#2aa198",
      tag: "#b58900",
      num: "#d33682",
    },
    lines: [
      [["select", "kw"], [" title, lang"]],
      [["  "], ["from", "kw"], [" "], ["snippets", "fn"]],
      [[" "], ["where", "kw"], [" shared = "], ["true", "num"], [";"]],
    ],
  },
];

type HeroPhase =
  | "reading"
  | "insert"
  | "close"
  | "seal"
  | "post"
  | "send"
  | "away"
  | "arrive"
  | "crack"
  | "open"
  | "rise";

/** How long each phase holds before the next; "reading" waits for typing. */
const STEPS: readonly (readonly [HeroPhase, number])[] = [
  ["insert", 850],
  ["close", 600],
  ["seal", 650],
  ["post", 950],
  ["send", 700],
  ["away", 60],
  ["arrive", 900],
  ["crack", 600],
  ["open", 650],
  ["rise", 750],
  ["reading", 0],
];
const TYPE_MS = 30;
const READ_MS = 2200;
const FIRST_READ_MS = 1400;

function snippetLength(snippet: Snippet) {
  // Each line's characters plus one for its line break.
  return snippet.lines.reduce(
    (sum, line) => sum + line.reduce((n, [text]) => n + text.length, 0) + 1,
    0,
  );
}

export function HeroEnvelope() {
  const scene = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<HeroPhase>("reading");
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(() => snippetLength(HERO_SNIPPETS[0]));
  const [first, setFirst] = useState(true);
  const [running, setRunning] = useState(false);

  const snippet = HERO_SNIPPETS[index];
  const total = snippetLength(snippet);

  // Only loop with motion allowed, and only while the hero is on screen.
  useEffect(() => {
    const node = scene.current;
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    if (!node || !motion.matches) return;
    let visible = false;
    const update = () => setRunning(visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(node);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    if (phase === "reading" && typed < total) {
      const timer = setTimeout(() => setTyped((n) => n + 1), TYPE_MS);
      return () => clearTimeout(timer);
    }
    const step = STEPS.findIndex(([name]) => name === phase);
    const hold = phase === "reading" ? (first ? FIRST_READ_MS : READ_MS) : STEPS[step][1];
    const [next] = STEPS[(step + 1) % STEPS.length];
    const timer = setTimeout(() => {
      if (next === "away") {
        // Off screen: the next letter is already sealed with a fresh snippet.
        setIndex((i) => (i + 1) % HERO_SNIPPETS.length);
        setTyped(0);
        setFirst(false);
      }
      setPhase(next);
    }, hold);
    return () => clearTimeout(timer);
  }, [running, phase, typed, total, first]);

  function track(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || !scene.current) return;
    const box = scene.current.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 2 - 1;
    const y = ((event.clientY - box.top) / box.height) * 2 - 1;
    scene.current.style.setProperty("--px", clamp(x).toFixed(3));
    scene.current.style.setProperty("--py", clamp(y).toFixed(3));
  }

  function reset() {
    scene.current?.style.setProperty("--px", "0");
    scene.current?.style.setProperty("--py", "0");
  }

  return (
    <div
      ref={scene}
      aria-hidden="true"
      data-testid="hero-envelope"
      data-phase={phase}
      onPointerMove={track}
      onPointerLeave={reset}
      className="hero-scene relative ml-auto w-[min(100%,500px)]"
    >
      <div className="hero-tilt absolute inset-0">
        <div className="hero-rig">
          <div className="hero-body">
            <EnvelopeLayer part="back" />
            <div className="hero-flap">
              <div className="hero-flap-face">
                <EnvelopeLayer part="flap" />
                <Postmark />
              </div>
              <div className="hero-flap-face hero-flap-inside">
                <EnvelopeLayer part="inside" />
              </div>
            </div>
            <CodeCard snippet={snippet} typed={typed} />
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
              <img
                src="/brand/seal-r3-240.png"
                alt=""
                width={240}
                height={240}
                decoding="async"
                className="hero-seal-half hero-seal-left"
              />
              <img
                src="/brand/seal-r3-240.png"
                alt=""
                width={240}
                height={240}
                decoding="async"
                className="hero-seal-half hero-seal-right"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CodeCard({ snippet, typed }: { snippet: Snippet; typed: number }) {
  const { theme } = snippet;
  let left = typed;
  return (
    <div
      className="hero-card"
      style={
        {
          "--c-bg": theme.bg,
          "--c-fg": theme.fg,
          "--c-muted": theme.muted,
          "--c-border": theme.border,
        } as CSSProperties
      }
    >
      <div className="hero-card-bar">
        <span className="hero-card-dots">
          <i style={{ background: "#ff5f57" }} />
          <i style={{ background: "#febc2e" }} />
          <i style={{ background: "#28c840" }} />
        </span>
        <span className="hero-card-file">{snippet.file}</span>
        <span className="hero-card-lang">{snippet.lang}</span>
      </div>
      <pre className="hero-card-code">
        {snippet.lines.map((line, row) => {
          const length = line.reduce((n, [text]) => n + text.length, 0);
          // The caret sits where typing has reached, or after the last line.
          const caret = left >= 0 && (left <= length || row === snippet.lines.length - 1);
          const tokens = line.map(([text, tone], col) => {
            const shown = text.slice(0, Math.max(0, left));
            left -= text.length;
            return shown ? (
              <span key={col} style={tone ? { color: theme[tone] } : undefined}>
                {shown}
              </span>
            ) : null;
          });
          left -= 1;
          return (
            <span key={row}>
              {tokens}
              {caret ? <span className="hero-caret" /> : null}
              {"\n"}
            </span>
          );
        })}
      </pre>
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

/** A round ink postmark with wavy cancellation lines. */
function Postmark() {
  const id = "hero-postmark";
  return (
    <svg className="hero-postmark" viewBox="0 0 220 110">
      <defs>
        <path id={`${id}r`} d="M55,15 a40,40 0 1,1 -0.1,0" />
      </defs>
      <circle cx="55" cy="55" r="48" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="55" cy="55" r="30" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text fontSize="11" fontWeight="700" letterSpacing="2.4" fill="currentColor">
        <textPath href={`#${id}r`}>SUPAGIST · SHARED · SENT ·</textPath>
      </text>
      <text x="55" y="60" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">
        {"</>"}
      </text>
      {[34, 50, 66, 82].map((y) => (
        <path
          key={y}
          d={`M112,${y} q12,-7 24,0 t24,0 t24,0 t24,0`}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function clamp(value: number) {
  return Math.max(-1, Math.min(1, value));
}
