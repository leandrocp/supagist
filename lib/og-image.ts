/**
 * The per-snippet share image: the snippet's own export render, fitted whole
 * into the 1200×630 Open Graph frame, with a thin Supagist footer band.
 *
 * Everything here is pure: where the render goes, where the band goes, how
 * much of the frame the render covers, and the `?v=` that versions the URL.
 * `lib/og-render.ts` does the pixels.
 */
import { createHash } from "node:crypto";

export const OG_SIZE = { width: 1200, height: 630 } as const;

/**
 * The footer band: the flat seal, `supagist.app` and the author's handle on
 * one row along the bottom edge. It is drawn on the render's own background
 * padding or on the background that fills the rest of the frame, never over
 * the card.
 */
export const OG_BAND = { height: 40, inset: 20, seal: 20, fontSize: 15 } as const;

/**
 * Bump when the picture changes for the same snippet (a new layout or band),
 * so platforms that cache previews by URL fetch the new one.
 */
export const OG_LAYOUT_VERSION = "export-v2";

/** The share of the frame the render should cover when it can. */
export const OG_MIN_COVERAGE = 0.9;

export type OgLayout = {
  /** The part of the render that is used, in render pixels. */
  crop: { left: number; top: number; width: number; height: number };
  /** Where that part goes in the frame, in frame pixels. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Share of the frame the render covers, 0..1. */
  coverage: number;
};

type Crop = OgLayout["crop"];

/**
 * Places `crop` as large as it fits, centred, with the card (the crop less
 * `bottomPadding` of background at its foot) kept above the band.
 */
function place(crop: Crop, bottomPadding: number): OgLayout {
  const { width: W, height: H } = OG_SIZE;
  const bandTop = H - OG_BAND.height;
  const cardBottom = Math.max(1, crop.height - bottomPadding);
  const scale = Math.min(W / crop.width, H / crop.height, bandTop / cardBottom);
  const width = Math.round(crop.width * scale);
  const height = Math.round(crop.height * scale);
  const top = Math.max(0, Math.round(Math.min((H - height) / 2, bandTop - cardBottom * scale)));
  return {
    crop,
    left: Math.round((W - width) / 2),
    top,
    width,
    height,
    coverage: (width * height) / (W * H),
  };
}

/**
 * Fits a `width`×`height` render whole into the frame, as large as it goes,
 * centred. `padding` is the render's own background around the card on every
 * side (the canvas margin; 0 when the render is the card alone).
 *
 * The band may sit on that background but never on the card. When the
 * render's shape or the band leaves it under `OG_MIN_COVERAGE`, up to three
 * quarters of the background padding is trimmed: from the top (so the card
 * can move up past the band) and evenly from the sides of the long axis, only
 * as much as reaches the target. Code is never cropped.
 */
export function ogLayout(render: { width: number; height: number; padding: number }): OgLayout {
  const pad = Math.max(0, Math.min(render.padding, render.width / 2, render.height / 2));
  const full = { left: 0, top: 0, width: render.width, height: render.height };
  let best = place(full, pad);
  if (best.coverage >= OG_MIN_COVERAGE || pad === 0) return best;

  const vertical = render.width / render.height < OG_SIZE.width / OG_SIZE.height;
  const limit = Math.floor((pad * 3) / 4);
  const step = Math.max(1, Math.floor(limit / 24));
  // Least total trim first, so the first layout that reaches the target wins.
  for (let total = step; total <= 2 * limit; total += step) {
    // Prefer moving the card up over trimming both sides evenly.
    for (let top = Math.min(total, limit); top >= 0; top -= step) {
      const axis = total - top;
      // Vertically, the top loses both trims; neither may reach the card.
      if (axis > limit || (vertical && top + axis > limit)) continue;
      const crop = vertical
        ? { left: 0, top: top + axis, width: render.width, height: render.height - top - 2 * axis }
        : { left: axis, top, width: render.width - 2 * axis, height: render.height - top };
      const candidate = place(crop, vertical ? pad - axis : pad);
      if (candidate.coverage > best.coverage + 1e-9) best = candidate;
      if (best.coverage >= OG_MIN_COVERAGE) return best;
    }
  }
  return best;
}

/**
 * Where publish stores the card-only render beside its canonical PNG
 * (`canonical.png` -> `card.png`, `canonical-<v>.png` -> `card-<v>.png`).
 * Cleanup derives it the same way (`private.snippet_card_path`).
 */
export function cardPathFor(canonicalPath: string): string {
  const slash = canonicalPath.lastIndexOf("/");
  const name = canonicalPath.slice(slash + 1);
  const version =
    name.startsWith("canonical") && name.endsWith(".png")
      ? name.slice("canonical".length, -".png".length)
      : "";
  return `${canonicalPath.slice(0, slash + 1)}card${version}.png`;
}

/**
 * `?v=` for the share image URL. A published snippet is sealed, so the
 * picture depends only on what was published and on visibility (unlisted
 * images leave out the author). The title is not in the picture, so a title
 * change keeps the URL. Platforms cache previews by URL, so this is also what
 * busts WhatsApp, X, Slack and Discord when a snippet turns unlisted.
 */
export function ogVersion(snippet: {
  code: string;
  filename: string;
  language: string | null;
  theme: string;
  font_id: string;
  appearance: unknown;
  visibility: "public" | "unlisted";
  author: { username: string; avatar_url: string | null } | null;
}): string {
  const unlisted = snippet.visibility === "unlisted";
  const key = JSON.stringify([
    OG_LAYOUT_VERSION,
    snippet.code,
    snippet.filename,
    snippet.language,
    snippet.theme,
    snippet.font_id,
    snippet.appearance,
    unlisted,
    unlisted ? null : (snippet.author?.username ?? null),
    unlisted ? null : (snippet.author?.avatar_url ?? null),
  ]);
  return createHash("sha256").update(key).digest("hex").slice(0, 12);
}
