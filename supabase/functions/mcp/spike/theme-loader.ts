import { buildLumisThemeFromBrand, getBrandTheme } from "./generated/brand-themes.js";
import { themes } from "./generated/themes.js";

export async function loadTheme(id: string) {
  const brand = getBrandTheme(id);
  if (brand) return { data: buildLumisThemeFromBrand(brand), brand };
  const load = (themes as Record<string, () => Promise<{ default: unknown }>>)[id];
  if (!load) throw new Error(`Unknown theme: ${id}`);
  return { data: (await load()).default, brand: null };
}
