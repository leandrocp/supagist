import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  hexToRgb,
  luminance,
  ogFit,
  ogImageHash,
  ogImagePath,
  ogSource,
  parseOgImageFile,
  pickCornerInk,
  planOgMarks,
  sampleCorner,
  type CornerSample,
  type Rgb,
} from "./og-compose";

const engine169 = (card: { left: number; top: number; width: number; height: number }) => ({
  width: 1600,
  height: 900,
  card,
  codeFontPx: 18,
});

describe("ogSource (spec §3a)", () => {
  it("uses the engine 16:9 scene only when the snippet has its own canvas", () => {
    expect(ogSource(true, 16)).toBe("scene");
    expect(ogSource(true, 128)).toBe("scene");
    expect(ogSource(true, 0)).toBe("bare");
    expect(ogSource(false, 64)).toBe("transparent");
  });
});

describe("ogFit layout choice", () => {
  it("puts a card that fits between the corner zones beside them, full height", () => {
    // beside = min(0.75 cover, 594/800, 880/1200) = 0.7333; above = 550/800 = 0.6875.
    const fit = ogFit(engine169({ left: 200, top: 50, width: 1200, height: 800 }), "scene");
    expect(fit.layout).toBe("beside");
    expect(fit.scale).toBeCloseTo(880 / 1200, 6);
    expect(fit.card.left).toBeCloseTo(160, 6);
    expect(fit.card.left + fit.card.width).toBeCloseTo(1040, 6);
    expect(fit.card.top).toBeGreaterThanOrEqual(18);
    expect(fit.card.top + fit.card.height).toBeLessThanOrEqual(630 - 18 + 1e-9);
    expect(fit.codeFontPx).toBeCloseTo(18 * (880 / 1200), 6);
  });

  it("goes above for a wide card (tight 16:9 padding): full width, centred, ending above y 568", () => {
    // beside = 880/1546 = 0.569; above = min(0.75, 550/600, 1152/1546) = 0.7451.
    const fit = ogFit(engine169({ left: 27, top: 150, width: 1546, height: 600 }), "scene");
    expect(fit.layout).toBe("above");
    expect(fit.scale).toBeCloseTo(1152 / 1546, 6);
    expect(fit.card.top).toBeCloseTo((630 - 600 * fit.scale) / 2, 6);
    expect(fit.card.top + fit.card.height).toBeLessThan(568);
    // The scaled canvas is 1192 px wide: its side edges are inside the frame,
    // so they feather by 0.8 × own margin × scale; the top and bottom run off
    // the frame and don't.
    expect(fit.covers).toBe(false);
    expect(fit.feather.left).toBeCloseTo(0.8 * 27 * fit.scale, 6);
    expect(fit.feather.right).toBeCloseTo(0.8 * 27 * fit.scale, 6);
    expect(fit.feather.top).toBe(0);
    expect(fit.feather.bottom).toBe(0);
    expect(fit.exportAreaPct).toBeCloseTo((100 * 1600 * fit.scale * 630) / (1200 * 630), 6);
  });

  it("bottom-aligns an above card to y 568 when centring would enter the corner zones", () => {
    // above = min(0.75, 550/700, 1152/1568) = 0.7347 → 514 px tall; centred it ends at 572.
    const fit = ogFit(engine169({ left: 16, top: 100, width: 1568, height: 700 }), "scene");
    expect(fit.layout).toBe("above");
    expect(fit.card.top + fit.card.height).toBeCloseTo(568, 6);
  });

  it("fills the frame at cover scale when the card allows it", () => {
    const fit = ogFit(engine169({ left: 400, top: 100, width: 800, height: 700 }), "scene");
    expect(fit.scale).toBeCloseTo(0.75, 6);
    expect(fit.covers).toBe(true);
    expect(fit.exportAreaPct).toBeCloseTo(100, 6);
  });

  it("gives a bare card a 32 px margin, upscales it, and keeps its own edges sharp", () => {
    // beside = min(1.5, (630 − 64)/480, 880/700) = 1.1792
    const fit = ogFit(
      {
        width: 700,
        height: 480,
        card: { left: 0, top: 0, width: 700, height: 480 },
        codeFontPx: 14,
      },
      "bare",
    );
    expect(fit.layout).toBe("beside");
    expect(fit.scale).toBeCloseTo(566 / 480, 6);
    expect(fit.card.top).toBeCloseTo(32, 6);
    expect(fit.feather).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(fit.covers).toBe(false);
  });

  it("caps the upscale of a small card at 1.5× the export", () => {
    const fit = ogFit(
      {
        width: 300,
        height: 100,
        card: { left: 0, top: 0, width: 300, height: 100 },
        codeFontPx: 14,
      },
      "transparent",
    );
    expect(fit.scale).toBe(1.5);
    expect(fit.codeFontPx).toBe(21);
  });

  it("never scales a canvas render past cover", () => {
    // A short card on a large 16:9 canvas: everything else allows more than 0.75.
    const fit = ogFit(engine169({ left: 600, top: 400, width: 400, height: 100 }), "scene");
    expect(fit.scale).toBe(0.75);
  });
});

describe("contrast", () => {
  it("matches WCAG luminance and contrast", () => {
    expect(luminance([255, 255, 255])).toBe(1);
    expect(luminance([0, 0, 0])).toBe(0);
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBe(21);
    // #777777 on white is the textbook just-under-4.5 grey.
    expect(contrastRatio(hexToRgb("#777777"), [255, 255, 255])).toBeCloseTo(4.48, 2);
  });

  it("samples the 2nd/98th percentile pixels, not the extremes", () => {
    // 100 px: 1 white, 2 light grey, 97 black. 98th percentile = light grey.
    const pixels = new Uint8Array(100 * 3);
    pixels.fill(255, 0, 3);
    pixels.fill(200, 3, 9);
    const sample = sampleCorner(pixels, 100, 3, { left: 0, top: 0, width: 100, height: 1 });
    expect(sample.brightest).toEqual([200, 200, 200]);
    expect(sample.darkest).toEqual([0, 0, 0]);
    expect(sample.mean[0]).toBeCloseTo((255 + 400) / 100, 6);
  });
});

const flat = (rgb: Rgb): CornerSample => ({ mean: rgb, darkest: rgb, brightest: rgb });
const NIGHT_GROUND = hexToRgb("#121212");
const PAPER_GROUND = hexToRgb("#F4EDE0");
const INERTIA_BLUE = hexToRgb("#195DFC");

describe("ink, seal and scrim per corner (spec §2)", () => {
  it("uses Night ink and the dark flat seal on a dark ground, with no scrim", () => {
    const plan = planOgMarks(flat(NIGHT_GROUND), flat(NIGHT_GROUND));
    expect(plan.lockup).toMatchObject({
      corner: "left",
      ink: "#F1E9DA",
      seal: "flat-dark",
      wordmark: "dark",
      alpha: 0,
    });
    expect(plan.url).toMatchObject({ ink: "#F1E9DA", alpha: 0 });
  });

  it("uses Paper ink and the light flat seal on a light ground", () => {
    const plan = planOgMarks(flat(PAPER_GROUND), flat(PAPER_GROUND));
    expect(plan.lockup).toMatchObject({ ink: "#1C1A17", seal: "flat", wordmark: "ink", alpha: 0 });
  });

  it("turns the seal mono white on Inertia blue, where wax is under 3:1", () => {
    // Wax #C7362B vs #195DFC is ≈1.0:1. Night ink reaches only 4.34:1 there,
    // but white reaches 5.2:1, so a mono corner needs no scrim.
    expect(contrastRatio(hexToRgb("#C7362B"), INERTIA_BLUE)).toBeLessThan(3);
    expect(pickCornerInk(flat(INERTIA_BLUE)).alpha).toBeGreaterThan(0);
    const plan = planOgMarks(flat(INERTIA_BLUE), flat(INERTIA_BLUE));
    expect(plan.lockup).toMatchObject({
      ink: "#FFFFFF",
      seal: "mono-white",
      wordmark: "white",
      alpha: 0,
    });
    expect(plan.url).toMatchObject({ ink: "#FFFFFF", alpha: 0 });
  });

  it("picks the ink that needs the least scrim and the lowest step that reaches 4.5:1", () => {
    // A dark corner with a few bright pixels: light ink has to beat the
    // bright 98th percentile, dark ink only the dark 2nd percentile.
    const busyDark: CornerSample = {
      mean: [40, 40, 40],
      darkest: [10, 10, 10],
      brightest: [170, 170, 170],
    };
    // Light ink: the pool (tone 40 × 0.55 = 22) must pull #AAAAAA down to
    // ≈106 for 4.5:1 → alpha ≥ (170 − 106)/(170 − 22) = 0.43 → step 0.45.
    // Dark ink: the pool (tone 40 + 215 × 0.55 = 158) must lift #0A0A0A to
    // ≈130 → alpha ≥ 0.81 → step 0.85. Light ink needs less.
    const ink = pickCornerInk(busyDark);
    expect(ink).toMatchObject({ polarity: "light-on-dark", ink: "#F1E9DA", alpha: 0.45 });
    expect(ink.tone).toEqual([22, 22, 22]);
  });

  it("drops the url when its corner needs more than 0.35 scrim", () => {
    const busy: CornerSample = {
      mean: [128, 128, 128],
      darkest: [0, 0, 0],
      brightest: [255, 255, 255],
    };
    const plan = planOgMarks(flat(NIGHT_GROUND), busy);
    expect(plan.lockup.corner).toBe("left");
    expect(plan.url).toBeNull();
  });

  it("moves the lockup right and drops the url when only the left corner is busy", () => {
    const busy: CornerSample = {
      mean: [128, 128, 128],
      darkest: [0, 0, 0],
      brightest: [255, 255, 255],
    };
    const plan = planOgMarks(busy, flat(NIGHT_GROUND));
    expect(plan.lockup).toMatchObject({ corner: "right", alpha: 0, seal: "flat-dark" });
    expect(plan.url).toBeNull();
  });
});

describe("versioned URL (spec §6.1)", () => {
  const snippet = {
    code: "const a = 1;",
    filename: "a.ts",
    language: "typescript",
    theme: "github_dark",
    font_id: "jetbrains",
    appearance: { background: "Supabase", outerPadding: 64 },
    author: { username: "leandrocp", avatar_url: null },
  };

  it("is a 16-hex hash that ignores title and visibility", () => {
    const hash = ogImageHash(snippet);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
    expect(
      ogImageHash({ ...snippet, title: "Renamed", visibility: "unlisted" } as typeof snippet),
    ).toBe(hash);
  });

  it("changes with the content, the preset/options and the drawn author", () => {
    const hash = ogImageHash(snippet);
    const variants = [
      { ...snippet, code: "const a = 2;" },
      { ...snippet, filename: "b.ts" },
      { ...snippet, theme: "github_light" },
      { ...snippet, font_id: "geist" },
      { ...snippet, appearance: { ...snippet.appearance, outerPadding: 0 } },
      { ...snippet, author: { username: "leandrocp", avatar_url: "https://a.test/2.png" } },
    ];
    const hashes = new Set([hash, ...variants.map(ogImageHash)]);
    expect(hashes.size).toBe(variants.length + 1);
  });

  it("round-trips the URL and rejects anything else", () => {
    const hash = ogImageHash(snippet);
    const path = ogImagePath("a-ts-ab12cd", hash);
    expect(path).toBe(`/og/a-ts-ab12cd.${hash}.jpg`);
    expect(parseOgImageFile(path.slice("/og/".length))).toEqual({ param: "a-ts-ab12cd", hash });
    expect(parseOgImageFile(`a-ts-ab12cd.${hash}.png`)).toBeNull();
    expect(parseOgImageFile("a-ts-ab12cd.jpg")).toBeNull();
    expect(parseOgImageFile(`a-ts-ab12cd.${hash.toUpperCase()}.jpg`)).toBeNull();
    expect(parseOgImageFile(`.${hash}.jpg`)).toBeNull();
  });
});
