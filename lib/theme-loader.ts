import type { ThemeData } from "@lumis-sh/themes";
import { buildLumisThemeFromBrand, getBrandTheme, type BrandTheme } from "@/lib/brand-themes";

type ThemeModule = { default: ThemeData };

export type LoadedTheme = {
  /** The Lumis-shaped theme object the highlighter consumes. */
  data: ThemeData;
  /** Set when the id resolves to a brand entry — drives the page chrome. */
  brand: BrandTheme | null;
};

/**
 * Resolve a `snippets.theme` id to a Lumis-shaped theme + optional brand
 * metadata. Brand themes are looked up in the local registry; everything else
 * falls through to a dynamic `@lumis-sh/themes/<id>` import. Lets every
 * surface (saved view server render, home composer client render, export SVG)
 * load themes through a single seam without each one re-coding the
 * brand-vs-lumis branching.
 */
export async function loadTheme(themeId: string): Promise<LoadedTheme> {
  const brand = getBrandTheme(themeId);
  if (brand) {
    return { data: buildLumisThemeFromBrand(brand), brand };
  }
  const mod = (await import(`@lumis-sh/themes/${themeId}`)) as ThemeModule;
  return { data: mod.default, brand: null };
}
