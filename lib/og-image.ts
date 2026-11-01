/**
 * The per-snippet share image, direction A "Opened letter" (og/v1 spec).
 *
 * Everything here is pure: the route loads the snippet, fonts and card, and
 * this module decides what the 1200×630 image says and where it goes,
 * including every fallback in spec §4. Keeping the decisions here means they
 * are testable without rasterizing.
 */
import { createHash } from "node:crypto";

export const OG_SIZE = { width: 1200, height: 630 } as const;

/**
 * Where publish stores the card-only render (no background) that the share
 * image lays into the envelope. Derived rather than stored in a column, so
 * snippets published before it existed, or through MCP, simply have none.
 */
export function snippetCardPath(authorId: string, snippetId: string): string {
  return `${authorId}/snippets/${snippetId}/card.png`;
}

// ── Fonts ───────────────────────────────────────────────────────────────────

/** Advance widths and coverage read from a TTF's own tables. */
export type FontMetrics = {
  unitsPerEm: number;
  /** Advance width in font units, or undefined when the font has no glyph. */
  advance(codePoint: number): number | undefined;
};

/**
 * Minimal TrueType reader: `head` for units per em, `hhea`/`hmtx` for
 * advances, and the Unicode `cmap` (format 12, else format 4) for coverage.
 * Satori needs the text fitted before layout and would fetch any glyph the
 * fonts lack from a CDN, so both answers come from the bundled fonts.
 */
export function parseFontMetrics(font: Uint8Array): FontMetrics {
  const view = new DataView(font.buffer, font.byteOffset, font.byteLength);
  const tables = new Map<string, number>();
  const numTables = view.getUint16(4);
  for (let i = 0; i < numTables; i += 1) {
    const record = 12 + i * 16;
    const tag = String.fromCharCode(...font.subarray(record, record + 4));
    tables.set(tag, view.getUint32(record + 8));
  }
  const table = (tag: string) => {
    const offset = tables.get(tag);
    if (offset === undefined) throw new Error(`Font has no ${tag} table`);
    return offset;
  };

  const unitsPerEm = view.getUint16(table("head") + 18);
  const numberOfHMetrics = view.getUint16(table("hhea") + 34);
  const hmtx = table("hmtx");
  const advanceOfGlyph = (glyph: number) =>
    view.getUint16(hmtx + 4 * Math.min(glyph, numberOfHMetrics - 1));

  const cmap = table("cmap");
  const subtables: { platform: number; encoding: number; offset: number }[] = [];
  for (let i = 0; i < view.getUint16(cmap + 2); i += 1) {
    const record = cmap + 4 + i * 8;
    subtables.push({
      platform: view.getUint16(record),
      encoding: view.getUint16(record + 2),
      offset: cmap + view.getUint32(record + 4),
    });
  }
  const full = subtables.find(
    (s) => s.platform === 3 && s.encoding === 10 && view.getUint16(s.offset) === 12,
  );
  const bmp = subtables.find(
    (s) => s.platform === 3 && s.encoding === 1 && view.getUint16(s.offset) === 4,
  );

  let glyphOf: (codePoint: number) => number;
  if (full) {
    const groups = view.getUint32(full.offset + 12);
    glyphOf = (cp) => {
      for (let i = 0; i < groups; i += 1) {
        const g = full.offset + 16 + i * 12;
        const start = view.getUint32(g);
        if (cp >= start && cp <= view.getUint32(g + 4)) return view.getUint32(g + 8) + cp - start;
      }
      return 0;
    };
  } else if (bmp) {
    const segX2 = view.getUint16(bmp.offset + 6);
    const ends = bmp.offset + 14;
    const starts = ends + segX2 + 2;
    const deltas = starts + segX2;
    const ranges = deltas + segX2;
    glyphOf = (cp) => {
      if (cp > 0xffff) return 0;
      for (let i = 0; i < segX2; i += 2) {
        if (cp > view.getUint16(ends + i)) continue;
        const start = view.getUint16(starts + i);
        if (cp < start) return 0;
        const delta = view.getInt16(deltas + i);
        const rangeOffset = view.getUint16(ranges + i);
        if (rangeOffset === 0) return (cp + delta) & 0xffff;
        const glyph = view.getUint16(ranges + i + rangeOffset + 2 * (cp - start));
        return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
      }
      return 0;
    };
  } else {
    throw new Error("Font has no Unicode cmap");
  }

  return {
    unitsPerEm,
    advance(codePoint) {
      const glyph = glyphOf(codePoint);
      return glyph === 0 ? undefined : advanceOfGlyph(glyph);
    },
  };
}

/**
 * Drop every character the font cannot draw. Satori would otherwise fetch a
 * fallback (emoji or a Google font) at render time, and the spec forbids tofu.
 */
export function drawableText(text: string, font: FontMetrics): string {
  return Array.from(text)
    .filter((char) => font.advance(char.codePointAt(0)!) !== undefined)
    .join("");
}

/** Rendered width in px at `size`, with `tracking` in em. */
export function textWidth(text: string, font: FontMetrics, size: number, tracking = 0): number {
  const chars = Array.from(text);
  const units = chars.reduce((sum, char) => sum + (font.advance(char.codePointAt(0)!) ?? 0), 0);
  return (units / font.unitsPerEm) * size + Math.max(0, chars.length - 1) * tracking * size;
}

// ── Title ───────────────────────────────────────────────────────────────────

export const TITLE = { maxSize: 76, minSize: 30, width: 470, tracking: -0.025 } as const;

/**
 * Spec §2.2 and §4: basename only, Fraunces at 76 px shrunk to fit 470 px
 * down to a 30 px floor; past the floor, a middle ellipsis that keeps the
 * extension (`highlight_wit…wrap_pipeline.ex`).
 */
export function fitTitle(filename: string, font: FontMetrics): { text: string; size: number } {
  const basename = filename.split("/").filter(Boolean).at(-1) ?? filename;
  const text = drawableText(basename, font) || "snippet";
  const measure = (t: string, size: number) => textWidth(t, font, size, TITLE.tracking);

  const natural = measure(text, TITLE.maxSize);
  if (natural <= TITLE.width) return { text, size: TITLE.maxSize };

  const shrunk = Math.floor((TITLE.maxSize * TITLE.width) / natural);
  if (shrunk >= TITLE.minSize) return { text, size: shrunk };

  const chars = Array.from(text);
  const dot = text.lastIndexOf(".");
  const extension = dot > 0 ? Array.from(text.slice(dot)).length : 0;
  for (let keep = chars.length - 1; keep > extension; keep -= 1) {
    const tail = Math.max(extension, Math.ceil(keep / 2));
    const candidate = `${chars.slice(0, keep - tail).join("")}…${chars.slice(-tail).join("")}`;
    if (measure(candidate, TITLE.minSize) <= TITLE.width) {
      return { text: candidate, size: TITLE.minSize };
    }
  }
  return { text: `…${chars.slice(-extension).join("")}`, size: TITLE.minSize };
}

// ── Numbers ─────────────────────────────────────────────────────────────────

/** Spec §5 view buckets. A new view only changes the image at a boundary. */
export const VIEW_BUCKETS = [0, 10, 50, 100, 250, 500, 1000, 2500, 5000, 10000] as const;

export function viewBucket(views: number): number {
  return VIEW_BUCKETS.findLast((floor) => views >= floor) ?? 0;
}

/** Counts ≥ 1000 read as `1.2k` (spec §4). */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  const k = Math.floor(n / 100) / 10;
  return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
}

/** "100+ views"; nothing under the first bucket, which would read as empty. */
export function viewsLabel(views: number): string | null {
  const bucket = viewBucket(views);
  return bucket === 0 ? null : `${formatCount(bucket)}+ views`;
}

// ── Emoji ───────────────────────────────────────────────────────────────────

/** Bundled Noto file stem for an emoji: code points in hex, U+FE0F dropped. */
export function emojiAssetName(emoji: string): string {
  return Array.from(emoji)
    .map((char) => char.codePointAt(0)!)
    .filter((cp) => cp !== 0xfe0f)
    .map((cp) => cp.toString(16).padStart(4, "0"))
    .join("_");
}

// ── Model ───────────────────────────────────────────────────────────────────

export type OgSnippet = {
  filename: string;
  language: string | null;
  /** Display name, e.g. "TSX". */
  languageName: string | null;
  lineCount: number;
  viewCount: number;
  createdAt: string;
  unlisted: boolean;
  dark: boolean;
  author: { username: string; avatarUrl: string | null } | null;
  /** One entry per reaction row (user × line × emoji). */
  reactionEmojis: string[];
  commentCount: number;
  /** Intrinsic size of the stored card render, or null when there is none. */
  card: { width: number; height: number } | null;
};

export type OgModel = {
  dark: boolean;
  title: { text: string; size: number };
  author: { username: string; initial: string } | null;
  /** Up to four, most-used first, each with a bundled glyph. */
  reactions: { emoji: string; asset: string; count: string }[];
  /** Hidden when zero. */
  comments: string | null;
  meta: string;
  unlistedPill: boolean;
  card: { left: number; top: number; width: number; height: number } | null;
};

export const CARD = { width: 590, centerX: 850, minTop: 128, pocketTop: 412 } as const;

export function buildOgModel(
  snippet: OgSnippet,
  fonts: { title: FontMetrics; body: FontMetrics; mono: FontMetrics },
  hasEmoji: (asset: string) => boolean,
): OgModel {
  const date = new Date(snippet.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const lines = `${snippet.lineCount} ${snippet.lineCount === 1 ? "line" : "lines"}`;
  const language = snippet.languageName ?? snippet.language;

  // Unlisted shows less (spec §4): no identity, social proof or date in
  // third-party caches, but still the code, the filename and the language.
  const meta = snippet.unlisted
    ? [lines, language]
    : [viewsLabel(snippet.viewCount), lines, language, date];

  const totals = new Map<string, number>();
  for (const emoji of snippet.reactionEmojis) totals.set(emoji, (totals.get(emoji) ?? 0) + 1);
  const reactions = snippet.unlisted
    ? []
    : [...totals]
        .map(([emoji, count]) => ({ emoji, count, asset: emojiAssetName(emoji) }))
        .filter((r) => hasEmoji(r.asset))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4)
        .map((r) => ({ emoji: r.emoji, asset: r.asset, count: formatCount(r.count) }));

  const username = snippet.author ? drawableText(snippet.author.username, fonts.body) : "";

  let card: OgModel["card"] = null;
  if (snippet.card) {
    const height = Math.round((snippet.card.height * CARD.width) / snippet.card.width);
    card = {
      left: CARD.centerX - CARD.width / 2,
      // Tall cards show their first lines; short ones sit 20 px into the pocket.
      top: Math.max(CARD.minTop, CARD.pocketTop - height),
      width: CARD.width,
      height,
    };
  }

  return {
    dark: snippet.dark,
    title: fitTitle(snippet.filename, fonts.title),
    author:
      snippet.unlisted || !username
        ? null
        : { username, initial: username.slice(0, 1).toUpperCase() },
    reactions,
    comments:
      snippet.unlisted || snippet.commentCount === 0 ? null : formatCount(snippet.commentCount),
    meta: drawableText(meta.filter(Boolean).join(" · "), fonts.mono),
    unlistedPill: snippet.unlisted,
    card,
  };
}

/**
 * Which stored render becomes the card (spec §5), cheapest and truest first.
 * Web publishes store `card.png` (no background) beside `canonical.png`;
 * snippets published before it existed only have the canonical PNG; MCP
 * publishes store only the SVG. An owner edit nulls the stored paths, and the
 * derived `card.png` is stale with them, so it counts only while
 * `canonical_image_path` is set. With no stored render (`none`), or when the
 * file is gone, the route renders the card from the live row instead.
 */
export type CardSource =
  | { kind: "card"; path: string; fallback: string }
  | { kind: "svg"; path: string }
  | { kind: "none" };

export function cardSource(snippet: {
  id: string;
  author_id: string | null;
  canonical_image_path: string | null;
  svg_path: string | null;
}): CardSource {
  if (snippet.canonical_image_path && snippet.author_id) {
    return {
      kind: "card",
      path: snippetCardPath(snippet.author_id, snippet.id),
      fallback: snippet.canonical_image_path,
    };
  }
  if (snippet.svg_path) return { kind: "svg", path: snippet.svg_path };
  return { kind: "none" };
}

/**
 * `?v=` for the image URL: changes whenever the picture would, and on every
 * owner edit. Platforms cache previews by URL, so this is also what busts
 * WhatsApp, X, Slack and Discord when a snippet gains reactions, is edited or
 * turns unlisted.
 */
export function ogVersion(facts: {
  /** Every owner-editable field, so each edit gets a fresh URL. */
  edit: {
    code: string;
    title: string | null;
    fontId: string;
    appearance: unknown;
  };
  viewCount: number;
  reactionEmojis: string[];
  commentCount: number;
  theme: string;
  unlisted: boolean;
  lineCount: number;
  language: string | null;
  author: { username: string; avatarUrl: string | null } | null;
  card: CardSource;
}): string {
  const totals = new Map<string, number>();
  for (const emoji of facts.reactionEmojis) totals.set(emoji, (totals.get(emoji) ?? 0) + 1);
  const key = JSON.stringify([
    viewBucket(facts.viewCount),
    [...totals].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    facts.commentCount,
    facts.theme,
    facts.unlisted,
    facts.lineCount,
    facts.language,
    facts.author?.username ?? null,
    facts.author?.avatarUrl ?? null,
    facts.card.kind === "none" ? null : facts.card.path,
    facts.edit,
  ]);
  return createHash("sha256").update(key).digest("hex").slice(0, 12);
}
