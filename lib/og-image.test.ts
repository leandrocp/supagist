import { describe, expect, it } from "vitest";
import { OG_BAND, OG_SIZE, cardPathFor, ogLayout, ogVersion } from "@/lib/og-image";

const bandTop = OG_SIZE.height - OG_BAND.height;
const frameArea = OG_SIZE.width * OG_SIZE.height;

describe("ogLayout", () => {
  it("fills the frame with a 16:9 canvas, keeping the whole render", () => {
    // The 16:9 export at 2×: 3200×1800 with a 128 px canvas margin.
    const layout = ogLayout({ width: 3200, height: 1800, padding: 256 });
    expect(layout.crop).toEqual({ left: 0, top: 0, width: 3200, height: 1800 });
    expect(layout).toMatchObject({ left: 40, top: 0, width: 1120, height: 630 });
    expect(layout.coverage).toBeCloseTo((1120 * 630) / frameArea);
  });

  it("moves a tight 16:9 card up into its own top margin to clear the band", () => {
    // Inertia: 64 px margin at 2×, so the card would end at 607 px, inside
    // the band. Only top background is dropped, and coverage stays ≥ 90%.
    const layout = ogLayout({ width: 3200, height: 1800, padding: 64 });
    const scale = layout.width / layout.crop.width;
    const cardBottom = layout.top + (1800 - 64 - layout.crop.top) * scale;
    expect(cardBottom).toBeLessThanOrEqual(bandTop + 0.5);
    expect(layout.crop.top).toBeGreaterThan(0);
    expect(layout.crop.top).toBeLessThanOrEqual(64);
    expect(layout.crop.top + layout.crop.height).toBe(1800);
    expect(layout.coverage).toBeGreaterThanOrEqual(0.9);
  });

  it("trims only background from a short auto-sized render to reach 90%", () => {
    const layout = ogLayout({ width: 912, height: 544, padding: 128 });
    expect(layout.coverage).toBeGreaterThanOrEqual(0.9);
    // The card (inside the 128 px margin) is never cut.
    expect(layout.crop.left).toBeLessThanOrEqual(128);
    expect(layout.crop.top).toBeLessThanOrEqual(128);
    expect(912 - layout.crop.left - layout.crop.width).toBeLessThanOrEqual(128);
    expect(544 - layout.crop.top - layout.crop.height).toBeLessThanOrEqual(128);
  });

  it("fits a tall render whole, centred, above the band, without cropping the card", () => {
    const layout = ogLayout({ width: 1012, height: 1904, padding: 128 });
    const scale = layout.width / layout.crop.width;
    expect(layout.crop.top).toBeLessThanOrEqual(96);
    expect(1904 - layout.crop.top - layout.crop.height).toBeLessThanOrEqual(96);
    expect(
      layout.top +
        (layout.crop.height - (128 - (1904 - layout.crop.top - layout.crop.height))) * scale,
    ).toBeLessThanOrEqual(bandTop + 0.5);
    expect(layout.left * 2 + layout.width).toBeCloseTo(OG_SIZE.width, -1);
    // A tall shape cannot reach 90%; the backdrop fills the rest.
    expect(layout.coverage).toBeLessThan(0.5);
  });

  it("keeps a card with no background whole and clear of the band", () => {
    const layout = ogLayout({ width: 1920, height: 1632, padding: 0 });
    expect(layout.crop).toEqual({ left: 0, top: 0, width: 1920, height: 1632 });
    expect(layout.top + layout.height).toBeLessThanOrEqual(bandTop);
  });
});

describe("ogVersion", () => {
  const snippet = {
    code: "const a = 1;",
    filename: "a.ts",
    language: "typescript",
    theme: "github_dark",
    font_id: "jetbrains",
    appearance: { background: "Vercel" },
    visibility: "public" as const,
    title: "First title",
    author: { username: "leandrocp", avatar_url: "https://a.test/1.png" },
  };

  it("keeps the URL on a title change, which is not in the picture", () => {
    const renamed = { ...snippet, title: "Renamed" };
    expect(ogVersion(renamed)).toBe(ogVersion(snippet));
  });

  it("changes on a visibility change and with anything drawn", () => {
    const base = ogVersion(snippet);
    expect(ogVersion({ ...snippet, visibility: "unlisted" })).not.toBe(base);
    expect(ogVersion({ ...snippet, appearance: { background: "Lumis" } })).not.toBe(base);
    expect(ogVersion({ ...snippet, author: { ...snippet.author, username: "x" } })).not.toBe(base);
  });

  it("ignores the author for unlisted snippets, whose image leaves it out", () => {
    const unlisted = { ...snippet, visibility: "unlisted" as const };
    expect(ogVersion({ ...unlisted, author: null })).toBe(ogVersion(unlisted));
  });
});

describe("cardPathFor", () => {
  it("sits beside the canonical PNG under the same version", () => {
    expect(cardPathFor("u/snippets/s/canonical.png")).toBe("u/snippets/s/card.png");
    expect(cardPathFor("u/snippets/s/canonical-3.png")).toBe("u/snippets/s/card-3.png");
  });
});
