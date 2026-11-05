/**
 * The share image for public snippets, to Designer's OG spec v2.1: the
 * snippet's own export, fitted into 1200×630 with the Supagist lockup in the
 * bottom-left corner and `supagist.app` in the bottom-right. No bar, no box.
 *
 * Everything here is pure: which render to start from (§3a), where it goes
 * (beside or above), which ink and seal each corner gets and how much scrim
 * it needs (§2), and the versioned URL (§6.1). `lib/og-compose-render.ts`
 * does the pixels.
 */
import { createHash } from "node:crypto";

export const OG_FRAME = { width: 1200, height: 630 } as const;

/** Bump when the picture changes for the same snippet, so its URL changes. */
export const OG_RENDERER_VERSION = "og-v2.1.0";

/** §2 tokens. */
export const OG_MARKS = {
  inset: 28,
  centerY: 601,
  seal: 32,
  wordmark: { width: 59.2, height: 17.66 },
  /** Seal → wordmark gap: 0.4 × cap (12.8 px). */
  gap: 5.1,
  urlFontSize: 15,
  /** The corner zones, and the rows sampled under the marks (§6.4). */
  zoneWidth: 160,
  sampleTop: 579,
  sampleBottom: 623,
} as const;

/** §3a fit constants. */
export const OG_FIT = {
  /** Width between the corner zones (1200 − 2 × 160). */
  besideWidth: 880,
  /** Full width less a 24 px side inset. */
  aboveWidth: 1152,
  /** A card in the above layout ends above this. */
  aboveBottom: 568,
  margin: 18,
  /** The margin when the export has under `ownCanvasMin` px of its own canvas there. */
  bareMargin: 32,
  ownCanvasMin: 14,
  maxUpscale: 1.5,
  feather: 36,
} as const;

/** Busy corner: a corner that needs more scrim than this drops its mark (§2). */
export const OG_BUSY_POOL = 0.35;

/** Supagist ground and ink colours (assets/brand/brand.md §3). */
export const OG_COLORS = {
  paper: "#F4EDE0",
  night: "#121212",
  inkOnDark: "#F1E9DA",
  inkOnLight: "#1C1A17",
  white: "#FFFFFF",
  wax: "#C7362B",
} as const;

export type Rect = { left: number; top: number; width: number; height: number };

/**
 * §3a: which render the share image starts from. A snippet with its own
 * canvas (a background and at least 16 px of padding) uses the engine's 16:9
 * render; a background with no padding is a bare card on its own scene; no
 * background is a card on the opposite brand ground.
 */
export type OgSource = "scene" | "bare" | "transparent";

export function ogSource(hasBackground: boolean, outerPadding: number): OgSource {
  if (!hasBackground) return "transparent";
  return outerPadding >= 16 ? "scene" : "bare";
}

export type OgFit = {
  layout: "beside" | "above";
  /** Frame px per export px. */
  scale: number;
  /** The card, in frame px. */
  card: Rect;
  /** The whole render, in frame px (it may run past the frame). */
  canvas: Rect;
  /** Feather on each render edge that lies inside the frame, in frame px. */
  feather: { top: number; right: number; bottom: number; left: number };
  /** Whether the render covers the whole frame (no scene needed under it). */
  covers: boolean;
  /** Share of the frame the render covers, 0..100. */
  exportAreaPct: number;
  codeFontPx: number;
};

/**
 * Places a render (`width`×`height` export px, its card at `card`) in the
 * frame: beside (between the corner zones, full height) or above (full width,
 * ending above y 568), whichever gives the larger scale. Never past cover or
 * 1.5× the export, never cropping the card.
 */
export function ogFit(
  render: { width: number; height: number; card: Rect; codeFontPx: number },
  source: OgSource,
): OgFit {
  const { width: FW, height: FH } = OG_FRAME;
  const { card } = render;
  const own = {
    top: card.top,
    left: card.left,
    bottom: render.height - card.top - card.height,
    right: render.width - card.left - card.width,
  };
  const marginFor = (ownPx: number) =>
    source !== "transparent" && ownPx >= OG_FIT.ownCanvasMin ? OG_FIT.margin : OG_FIT.bareMargin;
  const top = marginFor(own.top);
  const bottom = marginFor(own.bottom);
  const cap = Math.min(Math.max(FW / render.width, FH / render.height), OG_FIT.maxUpscale);
  const beside = Math.min(cap, (FH - top - bottom) / card.height, OG_FIT.besideWidth / card.width);
  const above = Math.min(
    cap,
    (OG_FIT.aboveBottom - top) / card.height,
    OG_FIT.aboveWidth / card.width,
  );
  const layout = above > beside ? "above" : "beside";
  const scale = Math.max(beside, above);

  const width = card.width * scale;
  const height = card.height * scale;
  const left = (FW - width) / 2;
  let y: number;
  if (layout === "beside") {
    y = top + (FH - top - bottom - height) / 2;
  } else {
    const centred = (FH - height) / 2;
    y = centred + height <= OG_FIT.aboveBottom ? centred : OG_FIT.aboveBottom - height;
  }
  const canvas = {
    left: left - card.left * scale,
    top: y - card.top * scale,
    width: render.width * scale,
    height: render.height * scale,
  };
  const featherFor = (ownPx: number, inside: boolean) =>
    source === "transparent" || !inside ? 0 : Math.min(OG_FIT.feather, 0.8 * ownPx * scale);
  const right = canvas.left + canvas.width;
  const foot = canvas.top + canvas.height;
  const tolerance = 0.5;
  const covers =
    source !== "transparent" &&
    canvas.left <= tolerance &&
    canvas.top <= tolerance &&
    right >= FW - tolerance &&
    foot >= FH - tolerance;
  const visible =
    Math.max(0, Math.min(right, FW) - Math.max(canvas.left, 0)) *
    Math.max(0, Math.min(foot, FH) - Math.max(canvas.top, 0));
  return {
    layout,
    scale,
    card: { left, top: y, width, height },
    canvas,
    feather: {
      top: featherFor(own.top, canvas.top > tolerance),
      left: featherFor(own.left, canvas.left > tolerance),
      bottom: featherFor(own.bottom, foot < FH - tolerance),
      right: featherFor(own.right, right < FW - tolerance),
    },
    covers,
    exportAreaPct: (100 * visible) / (FW * FH),
    codeFontPx: render.codeFontPx * scale,
  };
}

// ── Contrast (§2, §6.4) ──────────────────────────────────────────────────────

export type Rgb = readonly [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const linear = (channel: number) => {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance, 0..1. */
export function luminance([r, g, b]: Rgb): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast ratio, 1..21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** What is under one corner's marks. */
export type CornerSample = {
  mean: Rgb;
  /** The 2nd-percentile pixel by luminance (what dark ink must clear). */
  darkest: Rgb;
  /** The 98th-percentile pixel by luminance (what light ink must clear). */
  brightest: Rgb;
};

/** Samples `region` of a raw RGB(A) frame. */
export function sampleCorner(
  pixels: Uint8Array,
  frameWidth: number,
  channels: number,
  region: Rect,
): CornerSample {
  const lums: { lum: number; at: number }[] = [];
  const sum = [0, 0, 0];
  for (let y = region.top; y < region.top + region.height; y++) {
    for (let x = region.left; x < region.left + region.width; x++) {
      const at = (y * frameWidth + x) * channels;
      const rgb: Rgb = [pixels[at]!, pixels[at + 1]!, pixels[at + 2]!];
      sum[0]! += rgb[0];
      sum[1]! += rgb[1];
      sum[2]! += rgb[2];
      lums.push({ lum: luminance(rgb), at });
    }
  }
  lums.sort((a, b) => a.lum - b.lum);
  const pick = (p: number): Rgb => {
    const { at } = lums[Math.min(lums.length - 1, Math.floor(p * (lums.length - 1)))]!;
    return [pixels[at]!, pixels[at + 1]!, pixels[at + 2]!];
  };
  const n = lums.length;
  return {
    mean: [sum[0]! / n, sum[1]! / n, sum[2]! / n],
    darkest: pick(0.02),
    brightest: pick(0.98),
  };
}

/** Text on a dark ground is light ink; on a light ground, dark ink. */
export type Polarity = "light-on-dark" | "dark-on-light";

/** The scrim pool's colour: the ground darkened (×0.55) or pushed 55% to white. */
export function poolTone(ground: Rgb, polarity: Polarity): Rgb {
  return polarity === "light-on-dark"
    ? [ground[0] * 0.55, ground[1] * 0.55, ground[2] * 0.55]
    : [
        ground[0] + (255 - ground[0]) * 0.55,
        ground[1] + (255 - ground[1]) * 0.55,
        ground[2] + (255 - ground[2]) * 0.55,
      ];
}

export const OG_POOL_STEPS = [
  0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85,
  0.9,
] as const;

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/**
 * The lowest pool alpha at which `ink` reaches 4.5:1 against the corner's
 * hardest pixel (98th percentile for light ink, 2nd for dark), or Infinity
 * when even 0.9 does not.
 */
export function poolAlphaFor(sample: CornerSample, ink: Rgb, polarity: Polarity): number {
  const hardest = polarity === "light-on-dark" ? sample.brightest : sample.darkest;
  const tone = poolTone(sample.mean, polarity);
  for (const alpha of OG_POOL_STEPS) {
    if (contrastRatio(ink, mix(hardest, tone, alpha)) >= 4.5) return alpha;
  }
  return Number.POSITIVE_INFINITY;
}

export type CornerInk = { polarity: Polarity; ink: string; alpha: number; tone: Rgb };

/**
 * Tries light-on-dark and dark-on-light; keeps the one that needs the least
 * scrim. `lightInk` is white next to a mono seal, Night ink otherwise.
 */
export function pickCornerInk(
  sample: CornerSample,
  lightInk: string = OG_COLORS.inkOnDark,
): CornerInk {
  const options = (["light-on-dark", "dark-on-light"] as const).map((polarity) => {
    const ink = polarity === "light-on-dark" ? lightInk : OG_COLORS.inkOnLight;
    return {
      polarity,
      ink,
      alpha: poolAlphaFor(sample, hexToRgb(ink), polarity),
      tone: poolTone(sample.mean, polarity),
      // Tie-break on contrast against the corner's average colour.
      against: contrastRatio(hexToRgb(ink), sample.mean),
    };
  });
  const [a, b] = options as [(typeof options)[0], (typeof options)[0]];
  const best = a.alpha < b.alpha || (a.alpha === b.alpha && a.against >= b.against) ? a : b;
  return { polarity: best.polarity, ink: best.ink, alpha: best.alpha, tone: best.tone };
}

export type SealVariant = "flat" | "flat-dark" | "mono-white" | "mono-ink";
export type WordmarkVariant = "ink" | "dark" | "white";

export type OgMarksPlan = {
  lockup: CornerInk & {
    corner: "left" | "right";
    seal: SealVariant;
    wordmark: WordmarkVariant;
  };
  /** The `supagist.app` label, or null when its corner is too busy. */
  url: CornerInk | null;
};

/**
 * Decides each corner's ink, seal, wordmark and scrim (§2): the lockup goes
 * bottom-left and the url bottom-right; a url corner that needs more than
 * 0.35 scrim drops the url; a lockup corner that does, when the other corner
 * is calmer, moves the lockup right and drops the url. The wax seal turns
 * mono when it is under 3:1 against its ground.
 */
export function planOgMarks(left: CornerSample, right: CornerSample): OgMarksPlan {
  const monoOn = (sample: CornerSample) => contrastRatio(hexToRgb(OG_COLORS.wax), sample.mean) < 3;
  const lightInk = (mono: boolean) => (mono ? OG_COLORS.white : OG_COLORS.inkOnDark);
  const leftInk = pickCornerInk(left, lightInk(monoOn(left)));
  const rightInk = pickCornerInk(right, lightInk(monoOn(right)));
  const moveRight = leftInk.alpha > OG_BUSY_POOL && rightInk.alpha < leftInk.alpha;
  const corner = moveRight ? "right" : "left";
  const mono = monoOn(moveRight ? right : left);
  const ink = moveRight ? rightInk : leftInk;
  const onDark = ink.polarity === "light-on-dark";
  const url = moveRight || rightInk.alpha > OG_BUSY_POOL ? null : rightInk;
  return {
    lockup: {
      ...ink,
      // The pool can't go past its last step; a corner that never reaches
      // 4.5:1 gets the strongest scrim there is.
      alpha: Math.min(ink.alpha, OG_POOL_STEPS.at(-1)!),
      corner,
      seal: mono ? (onDark ? "mono-white" : "mono-ink") : onDark ? "flat-dark" : "flat",
      wordmark: mono && onDark ? "white" : onDark ? "dark" : "ink",
    },
    url,
  };
}

// ── URL (§6.1) ───────────────────────────────────────────────────────────────

export type OgHashable = {
  code: string;
  filename: string;
  language: string | null;
  theme: string;
  font_id: string;
  appearance: unknown;
  author: { username: string; avatar_url: string | null } | null;
};

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/**
 * Renderer version + snippet content hash + preset/options hash. Anything
 * that changes the picture changes it; the title and visibility don't.
 */
export function ogImageHash(snippet: OgHashable): string {
  const content = sha256(JSON.stringify([snippet.code, snippet.filename, snippet.language]));
  const options = sha256(
    JSON.stringify([
      snippet.theme,
      snippet.font_id,
      snippet.appearance ?? null,
      snippet.author?.username ?? null,
      snippet.author?.avatar_url ?? null,
    ]),
  );
  return sha256(`${OG_RENDERER_VERSION}\n${content}\n${options}`).slice(0, 16);
}

/** `/og/<slug>-<short_id>.<hash>.jpg` */
export function ogImagePath(param: string, hash: string): string {
  return `/og/${param}.${hash}.jpg`;
}

/** The `[file]` segment of `/og/[file]`: `<param>.<hash>.jpg`. */
export function parseOgImageFile(file: string): { param: string; hash: string } | null {
  if (!file.endsWith(".jpg")) return null;
  const stem = file.slice(0, -".jpg".length);
  const dot = stem.lastIndexOf(".");
  if (dot <= 0) return null;
  const hash = stem.slice(dot + 1);
  if (!/^[0-9a-f]{16}$/.test(hash)) return null;
  return { param: stem.slice(0, dot), hash };
}

/** Where publish stores the image, in the owner's snippet folder. */
export function ogStoragePath(authorId: string, snippetId: string, hash: string): string {
  return `${authorId}/snippets/${snippetId}/og-${hash}.jpg`;
}
