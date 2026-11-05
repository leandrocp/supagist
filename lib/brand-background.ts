import {
  applyBrandPreset,
  findMatchingBrandPreset,
  getBrandPreset,
  type BrandAppearance,
  type BrandPreset,
} from "@/lib/brand-presets";

/**
 * A composer draft's look plus how its background was chosen. With no
 * override the background follows the Brand preset, or the Theme (no outer
 * canvas, so the card shows the Theme's own editor background) when the
 * Brand is Custom. A background picked in All options is an override and is
 * kept through Brand and Theme changes.
 */
export type BrandDraft = BrandAppearance & {
  /** The Brand preset picked last, so an overridden background still knows
   *  which Brand it replaces, and a Theme change back finds the Brand again. */
  brandId: string | null;
  backgroundOverride: boolean;
};

export type BackgroundSource = "override" | "brand" | "theme";

/** The Brand a draft is on, judging its background as that Brand's own. */
export function draftBrand(draft: BrandDraft): BrandPreset | null {
  const picked = draft.brandId ? getBrandPreset(draft.brandId) : null;
  return findMatchingBrandPreset(
    picked ? { ...draft, background: picked.background.label } : draft,
  );
}

export function backgroundSource(draft: BrandDraft): BackgroundSource {
  if (draft.backgroundOverride) return "override";
  return draftBrand(draft) ? "brand" : "theme";
}

/** Recompute the background from Brand or Theme, unless the user picked one. */
export function withDefaultBackground<T extends BrandDraft>(draft: T): T {
  if (draft.backgroundOverride) return draft;
  return { ...draft, background: draftBrand(draft)?.background.label ?? null };
}

/** Apply a Brand preset, keeping a background the user picked themselves. */
export function pickBrandPreset<T extends BrandDraft>(draft: T, preset: BrandPreset): T {
  const applied = { ...applyBrandPreset(draft, preset), brandId: preset.id };
  return draft.backgroundOverride ? { ...applied, background: draft.background } : applied;
}
