import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { availableThemes } from "@lumis-sh/lumis/client";
import { describe, expect, it } from "vitest";
import { DEFAULT_FOOTER_SETTINGS, DEFAULT_HEADER_SETTINGS } from "./export-metadata";
import { buildLumisThemeFromBrand, getBrandTheme, isBrandThemeId } from "./brand-themes";
import {
  BRAND_PRESETS,
  applyBrandPreset,
  findMatchingBrandPreset,
  getBrandPreset,
  REMOVED_THEME_MAP,
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
    expect(BRAND_PRESETS).toHaveLength(33);
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
        "Flue",
        "Files SDK",
        "RivetKit",
        "plz",
        "Lumis",
        "Lumis Dark",
        "MDEx Purple",
        "MDEx Purple Dark",
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

  it("maps every brand to an official Lumis theme, or its own registry theme", () => {
    const officialThemes = new Set(availableThemes().map((theme) => theme.name));

    for (const preset of BRAND_PRESETS) {
      const { theme } = preset.settings;
      // Only the layered Lumis/MDEx looks ship their own palettes.
      const known =
        officialThemes.has(theme) || ("decoration" in preset.background && isBrandThemeId(theme));
      expect(known, `${preset.name}: ${theme}`).toBe(true);
    }
  });

  it("leaves the 29 launch presets exactly as they were before Lumis and MDEx", () => {
    const launch = BRAND_PRESETS.filter((preset) => !NEW_PRESET_IDS.includes(preset.id));
    // Digest of the 29 presets on main before the Lumis/MDEx presets landed.
    expect(createHash("sha256").update(JSON.stringify(launch)).digest("hex")).toBe(
      "f1931dca2bfb10a204ac17774a7e9617cf729e094b8720838c72d57686111358",
    );
  });

  it("migrates legacy synthetic brand themes to official Lumis ids", () => {
    expect(normalizeLegacyBrandTheme("supabase-dark")).toBe("github_dark");
    expect(normalizeLegacyBrandTheme("tailwind-light")).toBe("github_light");
    expect(normalizeLegacyBrandTheme("github_dark")).toBe("github_dark");
  });

  it("maps themes removed in Lumis themes 0.10 onto themes that still exist", () => {
    const officialThemes = new Set(availableThemes().map((theme) => theme.name));
    for (const [removed, replacement] of Object.entries(REMOVED_THEME_MAP)) {
      expect(officialThemes.has(removed), removed).toBe(false);
      expect(officialThemes.has(replacement), replacement).toBe(true);
    }
    expect(normalizeLegacyBrandTheme("darkplus")).toBe("vscode_dark");
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
      expect(preset.background.brandId).toBe(preset.id);
      // A logo is optional — brands with no sourceable mark omit it rather
      // than pointing at a file we invented. But when one is declared it has
      // to be a real asset at the conventional path.
      if (!preset.logoUrl) continue;
      // Light/dark pairs share their project's multi-colour marks.
      if (!("logoFullColor" in preset)) expect(preset.logoUrl).toBe(`/brands/${preset.id}.svg`);
      expect(existsSync(join(process.cwd(), "public", preset.logoUrl))).toBe(true);
    }
  });

  it("ships no orphaned or invented brand marks", () => {
    const declared = new Set(
      BRAND_PRESETS.map((preset) => preset.logoUrl).filter((url): url is string => Boolean(url)),
    );

    // `plz` has no logo anywhere upstream, so it must not gain one by
    // accident — an invented mark would read as the project's real identity.
    expect(getBrandPreset("plz")?.logoUrl).toBeUndefined();
    expect(existsSync(join(process.cwd(), "public/brands/plz.svg"))).toBe(false);

    for (const id of ["flue", "files-sdk", "rivetkit"]) {
      expect(declared.has(`/brands/${id}.svg`), id).toBe(true);
    }
  });
});

describe("social-screenshot brand reproductions", () => {
  function preset(id: string) {
    const found = getBrandPreset(id);
    if (!found) throw new Error(`${id} preset is missing`);
    return found;
  }

  it("gives Flue a chromeless white card with a left-aligned filename strip", () => {
    const flue = preset("flue");

    // No traffic lights, but still a divider under the header strip — that is
    // exactly what `minimal` renders, and `none` would drop the divider.
    expect(flue.settings.windowDecoration).toBe("minimal");
    expect(flue.background.frame?.showDots).toBe(false);
    expect(flue.background.frame?.cardFill).toBe("#FFFFFF");
    expect(flue.background.frame?.headerStrip).toEqual({ showLanguage: false });
    expect(flue.settings.header.filenamePosition).toBe("left");
    expect(flue.settings.header.showLanguage).toBe(false);
    expect(flue.settings.lineNumbers).toBe(false);
    expect(resolveBrandScene(flue).guide).toBe("crosshair");
  });

  it("gives Files SDK grey traffic lights, a cream card, and line numbers", () => {
    const filesSdk = preset("files-sdk");

    // `macos-subtle` is the only decoration that paints monochrome dots; plain
    // `macos` would paint the red/yellow/green set the original does not use.
    expect(filesSdk.settings.windowDecoration).toBe("macos-subtle");
    expect(filesSdk.background.frame?.showDots).toBe(true);
    expect(filesSdk.background.frame?.cardFill).toBe("#FDFCF7");
    expect(filesSdk.settings.lineNumbers).toBe(true);
    expect(filesSdk.settings.header.filenamePosition).toBe("left");
    expect(filesSdk.settings.header.languagePosition).toBe("right");
    expect(filesSdk.settings.header.showLanguage).toBe(true);
    expect(resolveBrandScene(filesSdk).guide).toBe("crosshair");
  });

  it("gives RivetKit a centred filename on a black canvas with a diagonal sheen", () => {
    const rivetkit = preset("rivetkit");

    expect(rivetkit.background.from).toBe("#000000");
    expect(rivetkit.background.frame?.showCenteredFilename).toBe(true);
    expect(rivetkit.settings.header.filenamePosition).toBe("center");
    expect(rivetkit.settings.header.showLanguage).toBe(false);
    expect(rivetkit.settings.lineNumbers).toBe(true);
    expect(resolveBrandScene(rivetkit).guide).toBe("beam");
  });

  it("gives plz two concentric teal hairlines around the card", () => {
    const plz = preset("plz");
    const scene = resolveBrandScene(plz);

    // The look is the canvas rim and the card border sitting a few pixels
    // apart. A large outer padding would separate them into two unrelated
    // shapes, and a guide would add noise between them.
    expect(plz.settings.outerPadding).toBe(16);
    expect(scene.guide).toBe("none");
    expect(scene.canvasBorder).toContain("45,212,191");
    expect(plz.background.frame?.cardBorder?.color).toContain("45,212,191");
    // Concentric only holds while both rings share a radius.
    expect(scene.canvasRadius - plz.settings.outerPadding).toBeLessThanOrEqual(
      plz.background.frame?.cardRadius ?? 0,
    );
  });

  it("keeps every reproduction's card radius in sync with its corner radius", () => {
    for (const id of ["flue", "files-sdk", "rivetkit", "plz"]) {
      const brand = preset(id);
      expect(brand.background.frame?.cardRadius, id).toBe(brand.settings.cornerRadius);
    }
  });
});

const NEW_PRESET_IDS: readonly string[] = [
  "lumis",
  "lumis-dark",
  "mdex-purple",
  "mdex-purple-dark",
];

describe("Lumis and MDEx presets", () => {
  // WCAG 2 relative luminance / contrast ratio, independent of the renderer.
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const luminance = ([r, g, b]: number[]) =>
    0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!);
  const contrast = (fg: number[], bg: string) => {
    const [a, b] = [luminance(fg), luminance(rgb(bg))].sort((x, y) => y - x);
    return (a! + 0.05) / (b! + 0.05);
  };
  const over = (fg: string, opacity: number, bg: string) =>
    rgb(fg).map((value, i) => value * opacity + rgb(bg)[i]! * (1 - opacity));

  it("matches the documented contrast of known pairs", () => {
    expect(contrast(rgb("#5B3FD9"), "#FFFFFF")).toBeCloseTo(6.65, 1);
    expect(contrast(over("#F7F5F0", 0.62, "#161E3F"), "#161E3F")).toBeCloseTo(6.49, 1);
    expect(contrast(rgb("#717489"), "#FFFFFF")).toBeCloseTo(4.6, 1);
  });

  it.each(NEW_PRESET_IDS)("%s keeps every code token and header run at AA (4.5:1)", async (id) => {
    const preset = getBrandPreset(id)!;
    const frame = preset.background.frame;
    const card = frame.cardFill;
    const brandTheme = getBrandTheme(preset.settings.theme);
    const highlights = (
      brandTheme
        ? buildLumisThemeFromBrand(brandTheme)
        : (await import(`@lumis-sh/themes/${preset.settings.theme}`)).default
    ).highlights as Record<string, { fg?: string; bg?: string }>;

    for (const [scope, style] of Object.entries(highlights)) {
      // Line numbers are off in these presets; badge scopes sit on their own bg.
      if (!style.fg || scope.startsWith("line_number")) continue;
      const ratio = contrast(rgb(style.fg), style.bg ?? card);
      expect(ratio, `${scope} ${style.fg}`).toBeGreaterThanOrEqual(4.5);
    }

    const strip = "headerFill" in frame ? frame.headerFill : card;
    for (const run of [frame.filenameLabel, frame.languageLabel]) {
      const opacity = "opacity" in run ? run.opacity : 1;
      expect(contrast(over(run.color, opacity, strip), strip), run.color).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });

  it("applies 16:9, JetBrains Mono, no ligatures, no footer, and filename metadata", () => {
    for (const id of NEW_PRESET_IDS) {
      const { settings } = getBrandPreset(id)!;
      expect(settings, id).toMatchObject({
        aspectRatio: "16:9",
        fontId: "jetbrains",
        ligatures: false,
        lineNumbers: false,
        footer: { enabled: false },
        header: { showFilename: true, filenamePosition: "left" },
      });
      // Existing padding options only; the design's 200px is not one of them.
      expect([0, 16, 32, 64, 96, 128]).toContain(settings.outerPadding);
    }
    expect(getBrandPreset("lumis")?.settings.outerPadding).toBe(128);
    expect(getBrandPreset("mdex-purple")?.settings.outerPadding).toBe(96);
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
