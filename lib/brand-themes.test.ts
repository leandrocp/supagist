import { describe, it, expect } from "vitest";
import {
  BRAND_THEMES,
  buildLumisThemeFromBrand,
  getBrandTheme,
  isBrandThemeId,
} from "./brand-themes";

// ray.so partner themes; Lumis and MDEx themes back their brand presets.
const RAYSO_BRANDS = new Set(["supabase", "vercel", "tailwind", "resend", "stripe"]);

describe("BRAND_THEMES registry", () => {
  it("includes the 5 ray.so brands plus the Lumis and MDEx preset themes", () => {
    const brands = new Set(BRAND_THEMES.map((t) => t.brand));
    expect(brands).toEqual(new Set([...RAYSO_BRANDS, "lumis", "mdex"]));
    expect(BRAND_THEMES.filter((t) => !RAYSO_BRANDS.has(t.brand)).map((t) => t.id)).toEqual([
      "lumis-paper",
      "lumis-dusk",
      "mdex-paper",
    ]);
  });

  it("ships light + dark for every brand except Stripe", () => {
    const byBrand: Record<string, string[]> = {};
    for (const t of BRAND_THEMES) {
      (byBrand[t.brand] ??= []).push(t.appearance);
    }
    expect(byBrand.supabase?.sort()).toEqual(["dark", "light"]);
    expect(byBrand.vercel?.sort()).toEqual(["dark", "light"]);
    expect(byBrand.tailwind?.sort()).toEqual(["dark", "light"]);
    expect(byBrand.resend?.sort()).toEqual(["dark", "light"]);
    // Stripe is intentionally dark-only — matches ray.so's catalog.
    expect(byBrand.stripe).toEqual(["dark"]);
  });

  it("uses unique ids", () => {
    const ids = BRAND_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ray.so theme ids follow the `<brand>-<appearance>` pattern", () => {
    for (const t of BRAND_THEMES.filter((theme) => RAYSO_BRANDS.has(theme.brand))) {
      expect(t.id).toBe(`${t.brand}-${t.appearance}`);
    }
  });
});

describe("getBrandTheme / isBrandThemeId", () => {
  it("returns the matching theme by id", () => {
    expect(getBrandTheme("vercel-dark")?.brand).toBe("vercel");
  });

  it("returns null for unknown ids", () => {
    expect(getBrandTheme("github_light")).toBeNull();
  });

  it("isBrandThemeId reflects registry membership", () => {
    expect(isBrandThemeId("supabase-light")).toBe(true);
    expect(isBrandThemeId("everforest_light")).toBe(false);
  });
});

describe("buildLumisThemeFromBrand", () => {
  it("returns a Lumis-shaped object the highlighter can consume", () => {
    const brand = getBrandTheme("supabase-dark")!;
    const theme = buildLumisThemeFromBrand(brand);
    expect(theme.name).toBe("supabase-dark");
    expect(theme.appearance).toBe("dark");
    // The SSR + export pipeline reads `highlights[scope].fg` — make sure the
    // ones every snippet hits at least once exist.
    expect(theme.highlights?.["normal"]?.fg).toBe(brand.palette.foreground);
    expect(theme.highlights?.["normal"]?.bg).toBe(brand.palette.editorBg);
    expect(theme.highlights?.["comment"]?.fg).toBe(brand.palette.comment);
    expect(theme.highlights?.["string"]?.fg).toBe(brand.palette.string);
    expect(theme.highlights?.["keyword"]?.fg).toBe(brand.palette.keyword);
    expect(theme.highlights?.["function"]?.fg).toBe(brand.palette.function);
  });

  it("expands a single palette colour to the full scope cluster", () => {
    // Regression: when a token is `keyword.return`, the highlighter looks up
    // that exact scope first. If we only set `keyword`, `keyword.return`
    // falls back to `normal.fg` and loses the brand colour. Our builder
    // expands each cluster so the common variants all get the same colour.
    const brand = getBrandTheme("vercel-dark")!;
    const theme = buildLumisThemeFromBrand(brand);
    const expectedKeyword = brand.palette.keyword;
    expect(theme.highlights?.["keyword.return"]?.fg).toBe(expectedKeyword);
    expect(theme.highlights?.["keyword.import"]?.fg).toBe(expectedKeyword);
    expect(theme.highlights?.["keyword.function"]?.fg).toBe(expectedKeyword);
  });

  it("marks markdown headings bold", () => {
    const brand = getBrandTheme("supabase-light")!;
    const theme = buildLumisThemeFromBrand(brand);
    expect(theme.highlights?.["markup.heading"]?.bold).toBe(true);
  });
});

describe("Lumis brand themes", () => {
  // Hue in degrees, or null for greys, from the sRGB channels.
  function hue(hex: string): number | null {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b);
    const chroma = max - Math.min(r, g, b);
    if (chroma < 0.08) return null;
    const h =
      max === r
        ? ((g - b) / chroma + 6) % 6
        : max === g
          ? (b - r) / chroma + 2
          : (r - g) / chroma + 4;
    return h * 60;
  }

  it("keeps every token out of the green and cyan hues (75°–200°)", () => {
    // Guard the hue helper itself: green and cyan land in the band, the sun does not.
    expect(hue("#358423")).toBeGreaterThan(75);
    expect(hue("#11efe3")).toBeLessThan(200);
    expect(hue("#ffc23d")).toBeLessThan(75);

    for (const id of ["lumis-paper", "lumis-dusk"]) {
      for (const [key, color] of Object.entries(getBrandTheme(id)!.palette)) {
        const h = hue(color);
        if (h === null) continue;
        expect(h >= 75 && h <= 200, `${id}.${key} ${color} hue ${h.toFixed(0)}`).toBe(false);
      }
    }
  });
});
