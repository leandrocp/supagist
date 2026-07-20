import { existsSync } from "node:fs";
import { join } from "node:path";
import { availableThemes } from "@lumis-sh/lumis";
import { describe, expect, it } from "vitest";
import { DEFAULT_FOOTER_SETTINGS, DEFAULT_HEADER_SETTINGS } from "./export-metadata";
import {
  BRAND_PRESETS,
  applyBrandPreset,
  findMatchingBrandPreset,
  getBrandPreset,
  normalizeLegacyBrandTheme,
  resolveBrandScene,
} from "./brand-presets";

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

describe("BRAND_PRESETS", () => {
  it("ships the complete social-developer launch catalog", () => {
    expect(BRAND_PRESETS).toHaveLength(25);
    expect(BRAND_PRESETS.map((preset) => preset.name)).toEqual(
      expect.arrayContaining([
        "Supabase",
        "Vercel",
        "Tailwind",
        "GitHub",
        "OpenAI",
        "Cloudflare",
        "Linear",
        "Cursor",
        "Anthropic",
        "Perplexity",
        "Hugging Face",
      ]),
    );
  });

  it("includes granular header and footer defaults in every brand", () => {
    for (const preset of BRAND_PRESETS) {
      expect(preset.settings.header).toMatchObject({
        enabled: expect.any(Boolean),
        showFilename: expect.any(Boolean),
        showLanguage: expect.any(Boolean),
        filenamePosition: expect.stringMatching(/^(left|center|right)$/),
        languagePosition: expect.stringMatching(/^(left|center|right)$/),
      });
      expect(preset.settings.footer).toMatchObject({
        enabled: expect.any(Boolean),
        showLanguage: expect.any(Boolean),
        showTheme: expect.any(Boolean),
        showLineCount: expect.any(Boolean),
        showCharCount: expect.any(Boolean),
        showAuthor: expect.any(Boolean),
        alignment: expect.stringMatching(/^(left|center|right)$/),
      });
    }
  });

  it("maps every brand to an official Lumis theme", () => {
    const officialThemes = new Set(availableThemes().map((theme) => theme.name));

    for (const preset of BRAND_PRESETS) {
      expect(
        officialThemes.has(preset.settings.theme),
        `${preset.name}: ${preset.settings.theme}`,
      ).toBe(true);
    }
  });

  it("migrates legacy synthetic brand themes to official Lumis ids", () => {
    expect(normalizeLegacyBrandTheme("supabase-dark")).toBe("github_dark");
    expect(normalizeLegacyBrandTheme("tailwind-light")).toBe("github_light");
    expect(normalizeLegacyBrandTheme("github_dark")).toBe("github_dark");
  });

  it("gives every brand a premium scene and six signature brands bespoke geometry", () => {
    const guides = Object.fromEntries(
      BRAND_PRESETS.map((preset) => [preset.id, resolveBrandScene(preset).guide]),
    );

    expect(guides).toMatchObject({
      supabase: "studio",
      vercel: "registration",
      tailwind: "crosshair",
      stripe: "stripe-planes",
      openai: "halo",
      linear: "beam",
    });
    for (const preset of BRAND_PRESETS) {
      const scene = resolveBrandScene(preset);
      expect(scene.glows.length).toBeGreaterThanOrEqual(2);
      expect(scene.frame.rimFrom).toBeTruthy();
      expect(scene.frame.shadow.blur).toBeGreaterThan(20);
    }
  });

  it("uses stable unique ids, background labels, and local logo assets", () => {
    expect(new Set(BRAND_PRESETS.map((preset) => preset.id)).size).toBe(BRAND_PRESETS.length);
    expect(new Set(BRAND_PRESETS.map((preset) => preset.background.label)).size).toBe(
      BRAND_PRESETS.length,
    );

    for (const preset of BRAND_PRESETS) {
      expect(preset.logoUrl).toBe(`/brands/${preset.id}.svg`);
      expect(existsSync(join(process.cwd(), "public", preset.logoUrl))).toBe(true);
      expect(preset.background.brandId).toBe(preset.id);
    }
  });
});

describe("brand preset application", () => {
  it("atomically applies every brand-controlled appearance option", () => {
    const preset = getBrandPreset("tailwind");
    if (!preset) throw new Error("Tailwind preset is missing");
    const result = applyBrandPreset(BASE_APPEARANCE, preset);

    expect(result).toEqual({
      ...BASE_APPEARANCE,
      ...preset.settings,
      background: preset.background.label,
    });
    expect(findMatchingBrandPreset(result)?.id).toBe("tailwind");
  });

  it("becomes custom when Header or Footer metadata is changed independently", () => {
    const preset = getBrandPreset("tailwind");
    if (!preset) throw new Error("Tailwind preset is missing");
    const applied = applyBrandPreset(BASE_APPEARANCE, preset);

    expect(
      findMatchingBrandPreset({
        ...applied,
        header: { ...applied.header, showLanguage: !applied.header.showLanguage },
      }),
    ).toBeNull();
    expect(
      findMatchingBrandPreset({
        ...applied,
        footer: { ...applied.footer, enabled: !applied.footer.enabled },
      }),
    ).toBeNull();
  });

  it("becomes custom when Theme is changed independently", () => {
    const preset = getBrandPreset("supabase");
    if (!preset) throw new Error("Supabase preset is missing");
    const applied = applyBrandPreset(BASE_APPEARANCE, preset);

    expect(findMatchingBrandPreset({ ...applied, theme: "github_light" })).toBeNull();
    expect(applied.background).toBe(preset.background.label);
  });
});
