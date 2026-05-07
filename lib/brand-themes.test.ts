import { describe, it, expect } from "vitest";
import {
  BRAND_THEMES,
  buildLumisThemeFromBrand,
  getBrandTheme,
  isBrandThemeId,
} from "./brand-themes";

describe("BRAND_THEMES registry", () => {
  it("includes all 5 brands", () => {
    const brands = new Set(BRAND_THEMES.map((t) => t.brand));
    expect(brands).toEqual(new Set(["supabase", "vercel", "tailwind", "resend", "stripe"]));
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

  it("ids follow the `<brand>-<appearance>` pattern", () => {
    for (const t of BRAND_THEMES) {
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
