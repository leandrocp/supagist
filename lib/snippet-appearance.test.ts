import { describe, expect, it } from "vitest";
import { BRAND_PRESETS, applyBrandPreset } from "@/lib/brand-presets";
import {
  DEFAULT_SNIPPET_APPEARANCE,
  findExportBackground,
  parseSnippetAppearance,
} from "@/lib/snippet-appearance";

describe("parseSnippetAppearance", () => {
  it.each(BRAND_PRESETS.map((preset) => [preset.id, preset] as const))(
    "keeps every %s brand setting a composer draft carries",
    (_id, preset) => {
      const draft = applyBrandPreset(
        {
          ...DEFAULT_SNIPPET_APPEARANCE,
          theme: "github_light",
          fontId: "system",
          code: "x",
          filename: "a.ts",
        },
        preset,
      );
      const parsed = parseSnippetAppearance(JSON.parse(JSON.stringify(draft)));
      expect(parsed.background).toBe(preset.background.label);
      expect(findExportBackground(parsed.background)?.brandId).toBe(preset.id);
      expect(parsed).toMatchObject({
        outerPadding: preset.settings.outerPadding,
        innerPadding: preset.settings.innerPadding,
        cornerRadius: preset.settings.cornerRadius,
        lineNumbers: preset.settings.lineNumbers,
        header: preset.settings.header,
        footer: preset.settings.footer,
        windowDecoration: preset.settings.windowDecoration,
      });
      // Brands without these keep the draft's values, which here are the defaults.
      const settings: { aspectRatio?: "16:9" | null; ligatures?: boolean } = preset.settings;
      expect(parsed.aspectRatio).toBe(settings.aspectRatio ?? null);
      expect(parsed.ligatures).toBe(settings.ligatures ?? true);
      // Draft-only fields are not part of the stored appearance.
      expect(Object.keys(parsed)).not.toContain("code");
      expect(Object.keys(parsed)).not.toContain("theme");
    },
  );

  it("snaps values to the options the composer offers", () => {
    expect(
      parseSnippetAppearance({
        outerPadding: 100,
        innerPadding: 50,
        cornerRadius: 3,
        fontSize: 15,
        pixelRatio: 3,
      }),
    ).toMatchObject({
      outerPadding: 96,
      innerPadding: 48,
      cornerRadius: 4,
      fontSize: 16,
      pixelRatio: DEFAULT_SNIPPET_APPEARANCE.pixelRatio,
    });
  });

  it("drops values that cannot be rendered", () => {
    const parsed = parseSnippetAppearance({
      background: "Not a background",
      windowDecoration: "fancy",
      aspectRatio: "4:3",
      lineNumbers: "yes",
      outerPadding: Number.NaN,
      header: "left",
    });
    expect(parsed.background).toBeNull();
    expect(parsed.windowDecoration).toBe("macos");
    expect(parsed.aspectRatio).toBeNull();
    expect(parsed.lineNumbers).toBe(false);
    expect(parsed.outerPadding).toBe(DEFAULT_SNIPPET_APPEARANCE.outerPadding);
    expect(parsed.header).toEqual(DEFAULT_SNIPPET_APPEARANCE.header);
  });

  it.each([null, undefined, [], "Lumis", 4])("reads %j as the default appearance", (value) => {
    expect(parseSnippetAppearance(value)).toEqual(DEFAULT_SNIPPET_APPEARANCE);
  });

  it("keeps a generic gradient background", () => {
    expect(parseSnippetAppearance({ background: "Sunset" }).background).toBe("Sunset");
  });
});
