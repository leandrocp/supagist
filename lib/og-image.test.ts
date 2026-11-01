import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildOgModel,
  cardSource,
  emojiAssetName,
  fitTitle,
  formatCount,
  ogVersion,
  parseFontMetrics,
  textWidth,
  TITLE,
  viewsLabel,
  type OgSnippet,
} from "@/lib/og-image";

const font = (name: string) =>
  parseFontMetrics(
    new Uint8Array(readFileSync(new URL(`../assets/og/fonts/${name}`, import.meta.url))),
  );
const fonts = {
  title: font("Fraunces144pt-SemiBold-Soft50-latin.ttf"),
  body: font("Geist-Medium-latin.ttf"),
  mono: font("IBMPlexMono-Medium-latin.ttf"),
};
const allEmoji = () => true;

const snippet: OgSnippet = {
  filename: "seal-button.tsx",
  language: "tsx",
  languageName: "TSX",
  lineCount: 11,
  viewCount: 137,
  createdAt: "2026-10-31T23:30:00Z",
  unlisted: false,
  dark: false,
  author: { username: "leandrocp", avatarUrl: null },
  reactionEmojis: ["🔥", "🔥", "❤️", "👀", "👀", "👀"],
  commentCount: 2,
  card: { width: 1180, height: 800 },
};

describe("font metrics", () => {
  it("reads real advances: Plex Mono is monospaced, Fraunces is not", () => {
    expect(textWidth("iiii", fonts.mono, 16)).toBeCloseTo(textWidth("WWWW", fonts.mono, 16));
    expect(textWidth("iiii", fonts.title, 76)).toBeLessThan(textWidth("WWWW", fonts.title, 76) / 2);
  });

  it("reports characters outside the Latin subset as missing", () => {
    expect(fonts.body.advance("a".codePointAt(0)!)).toBeGreaterThan(0);
    expect(fonts.body.advance("漢".codePointAt(0)!)).toBeUndefined();
  });
});

describe("fitTitle", () => {
  it("keeps a short name at 76 px", () => {
    expect(fitTitle("seal-button.tsx", fonts.title)).toEqual({ text: "seal-button.tsx", size: 76 });
  });

  it("drops directories and shrinks a longer name to fit 470 px", () => {
    const fit = fitTitle("lib/render/line_wrap.ex", fonts.title);
    expect(fit.text).toBe("line_wrap.ex");
    const long = fitTitle("highlight_with_line_wrap.ex", fonts.title);
    expect(long.size).toBeLessThan(76);
    expect(long.size).toBeGreaterThanOrEqual(TITLE.minSize);
    expect(textWidth(long.text, fonts.title, long.size, TITLE.tracking)).toBeLessThanOrEqual(470);
  });

  it("past the 30 px floor, ellipsizes the middle and keeps the extension", () => {
    const fit = fitTitle(
      "highlight_with_line_wrap_pipeline_and_more_and_more_stages.ex",
      fonts.title,
    );
    expect(fit.size).toBe(30);
    expect(fit.text).toContain("…");
    expect(fit.text.startsWith("highlight")).toBe(true);
    expect(fit.text.endsWith(".ex")).toBe(true);
    expect(textWidth(fit.text, fonts.title, 30, TITLE.tracking)).toBeLessThanOrEqual(470);
  });

  it("never draws tofu: characters the font lacks are dropped", () => {
    expect(fitTitle("日本.ts", fonts.title).text).toBe(".ts");
  });
});

describe("numbers", () => {
  it("buckets views at the spec boundaries", () => {
    expect(viewsLabel(9)).toBeNull();
    expect(viewsLabel(10)).toBe("10+ views");
    expect(viewsLabel(99)).toBe("50+ views");
    expect(viewsLabel(100)).toBe("100+ views");
    expect(viewsLabel(2499)).toBe("1k+ views");
    expect(viewsLabel(2500)).toBe("2.5k+ views");
    expect(viewsLabel(1_000_000)).toBe("10k+ views");
  });

  it("formats counts of 1000 and up as k, without rounding up", () => {
    expect(formatCount(999)).toBe("999");
    expect(formatCount(1000)).toBe("1k");
    expect(formatCount(1290)).toBe("1.2k");
  });

  it("names emoji assets by code point without U+FE0F", () => {
    expect(emojiAssetName("❤️")).toBe("2764");
    expect(emojiAssetName("👍")).toBe("1f44d");
  });
});

describe("buildOgModel", () => {
  it("shows the snippet's real data", () => {
    const model = buildOgModel(snippet, fonts, allEmoji);
    expect(model.author).toEqual({ username: "leandrocp", initial: "L" });
    expect(model.reactions).toEqual([
      { emoji: "👀", asset: "1f440", count: "3" },
      { emoji: "🔥", asset: "1f525", count: "2" },
      { emoji: "❤️", asset: "2764", count: "1" },
    ]);
    expect(model.comments).toBe("2");
    expect(model.meta).toBe("100+ views · 11 lines · TSX · Oct 31, 2026");
    expect(model.unlistedPill).toBe(false);
  });

  it("keeps the top four emoji and skips any without a bundled glyph", () => {
    const model = buildOgModel(
      { ...snippet, reactionEmojis: ["🔥", "🔥", "🔥", "😀", "😀", "👀", "👀", "❤️", "🎉", "🚀"] },
      fonts,
      (asset) => asset !== "1f600",
    );
    expect(model.reactions.map((r) => r.emoji)).toEqual(["🔥", "👀", "❤️", "🎉"]);
  });

  it("drops empty rows: no reactions, no comments, no author", () => {
    const model = buildOgModel(
      { ...snippet, reactionEmojis: [], commentCount: 0, author: null, viewCount: 3 },
      fonts,
      allEmoji,
    );
    expect(model.reactions).toEqual([]);
    expect(model.comments).toBeNull();
    expect(model.author).toBeNull();
    expect(model.meta).toBe("11 lines · TSX · Oct 31, 2026");
  });

  it("unlisted shows less: no author, views, date or reactions, plus the pill", () => {
    const model = buildOgModel({ ...snippet, unlisted: true }, fonts, allEmoji);
    expect(model.author).toBeNull();
    expect(model.reactions).toEqual([]);
    expect(model.comments).toBeNull();
    expect(model.meta).toBe("11 lines · TSX");
    expect(model.unlistedPill).toBe(true);
    expect(model.card).not.toBeNull();
  });

  it("tucks a tall card at 128 and sits a short one 20 px into the pocket", () => {
    expect(buildOgModel(snippet, fonts, allEmoji).card).toEqual({
      left: 555,
      top: 128,
      width: 590,
      height: 400,
    });
    const short = buildOgModel({ ...snippet, card: { width: 1180, height: 200 } }, fonts, allEmoji);
    expect(short.card).toMatchObject({ top: 412 - 100, height: 100 });
  });

  it("draws the envelope alone when there is no card", () => {
    expect(buildOgModel({ ...snippet, card: null }, fonts, allEmoji).card).toBeNull();
  });
});

describe("cardSource", () => {
  const row = {
    canonical_image_path: "u1/snippets/s1/canonical.png",
    svg_path: "u1/snippets/s1/canonical.svg",
  };

  it("prefers card.png, falling back to canonical.png for older snippets", () => {
    expect(cardSource(row)).toEqual({
      kind: "card",
      path: "u1/snippets/s1/card.png",
      fallback: "u1/snippets/s1/canonical.png",
    });
  });

  it("finds a web edit's card beside its versioned canonical PNG", () => {
    expect(
      cardSource({ ...row, canonical_image_path: "u1/snippets/s1/canonical-1a2b3c4d.png" }),
    ).toEqual({
      kind: "card",
      path: "u1/snippets/s1/card-1a2b3c4d.png",
      fallback: "u1/snippets/s1/canonical-1a2b3c4d.png",
    });
  });

  it("rasterizes the SVG for MCP publishes, and has nothing once an edit cleared the images", () => {
    expect(cardSource({ ...row, canonical_image_path: null })).toEqual({
      kind: "svg",
      path: "u1/snippets/s1/canonical.svg",
    });
    expect(cardSource({ ...row, canonical_image_path: null, svg_path: null })).toEqual({
      kind: "none",
    });
  });
});

describe("ogVersion", () => {
  const facts = {
    viewCount: 137,
    reactionEmojis: ["🔥", "❤️"],
    commentCount: 2,
    theme: "github_light",
    unlisted: false,
    lineCount: 11,
    language: "tsx",
    author: { username: "leandrocp", avatarUrl: null },
    card: { kind: "none" } as const,
    edit: {
      code: "const a = 1;",
      title: null,
      fontId: "jetbrains",
      appearance: { background: null },
    },
  };

  it("ignores views inside a bucket and reaction order", () => {
    expect(ogVersion({ ...facts, viewCount: 249, reactionEmojis: ["❤️", "🔥"] })).toBe(
      ogVersion(facts),
    );
  });

  it("changes when the picture would", () => {
    const base = ogVersion(facts);
    for (const change of [
      { viewCount: 250 },
      { reactionEmojis: ["🔥", "🔥"] },
      { commentCount: 3 },
      { unlisted: true },
      { theme: "dracula" },
      { lineCount: 12 },
    ]) {
      expect(ogVersion({ ...facts, ...change })).not.toBe(base);
    }
  });

  // Same line count, same theme: before, an edit like this kept the URL, so
  // WhatsApp and the CDN kept serving the pre-edit picture.
  it("changes on every owner edit, even one that keeps the line count", () => {
    const base = ogVersion(facts);
    for (const edit of [
      { code: "const b = 2;" },
      { title: "Renamed" },
      { fontId: "fira" },
      { appearance: { background: "Lumis" } },
    ]) {
      expect(ogVersion({ ...facts, edit: { ...facts.edit, ...edit } })).not.toBe(base);
    }
  });
});
