import { describe, expect, it } from "vitest";
import { getBrandPreset } from "./brand-presets";
import { DEFAULT_FOOTER_SETTINGS, DEFAULT_HEADER_SETTINGS } from "./export-metadata";
import {
  backgroundSource,
  draftBrand,
  pickBrandPreset,
  withDefaultBackground,
} from "./brand-background";

const BASE_APPEARANCE = {
  theme: "github_light",
  background: null as string | null,
  fontId: "system",
  outerPadding: 64,
  innerPadding: 16,
  cornerRadius: 12,
  lineNumbers: false,
  header: DEFAULT_HEADER_SETTINGS,
  footer: DEFAULT_FOOTER_SETTINGS,
  windowDecoration: "macos" as const,
};

describe("background defaulting", () => {
  const DRAFT = { ...BASE_APPEARANCE, brandId: null, backgroundOverride: false };

  it("follows the Brand, then the Theme when the Brand turns Custom, and back", () => {
    const supabase = getBrandPreset("supabase")!;
    const branded = pickBrandPreset(DRAFT, supabase);
    expect(branded.background).toBe("Supabase");
    expect(backgroundSource(branded)).toBe("brand");

    // github_light is not Supabase's theme: Brand is Custom, no outer canvas.
    const themed = withDefaultBackground({ ...branded, theme: "github_light" });
    expect(themed.background).toBeNull();
    expect(draftBrand(themed)).toBeNull();
    expect(backgroundSource(themed)).toBe("theme");

    const back = withDefaultBackground({ ...themed, theme: supabase.settings.theme });
    expect(back.background).toBe("Supabase");
    expect(draftBrand(back)?.id).toBe("supabase");
  });

  it("keeps a hand-picked background through Brand and Theme changes until reset", () => {
    // Mintlify and OpenAI share every setting but the background, so only the
    // remembered pick tells them apart once the background is overridden.
    const mintlify = getBrandPreset("mintlify")!;
    const openai = getBrandPreset("openai")!;
    expect(mintlify.settings).toEqual(openai.settings);

    const picked = {
      ...pickBrandPreset(DRAFT, mintlify),
      background: "Sunset",
      backgroundOverride: true,
    };
    expect(draftBrand(picked)?.id).toBe("mintlify");
    expect(backgroundSource(picked)).toBe("override");
    expect(withDefaultBackground({ ...picked, theme: "github_light" }).background).toBe("Sunset");

    const switched = pickBrandPreset(picked, openai);
    expect(switched.background).toBe("Sunset");
    expect(draftBrand(switched)?.id).toBe("openai");

    const reset = withDefaultBackground({ ...switched, backgroundOverride: false });
    expect(reset.background).toBe("OpenAI");
    expect(backgroundSource(reset)).toBe("brand");
  });

  it("follows the Theme for a Custom draft with no background", () => {
    expect(backgroundSource(DRAFT)).toBe("theme");
    expect(withDefaultBackground({ ...DRAFT, theme: "github_dark" }).background).toBeNull();
  });
});
