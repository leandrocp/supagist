import { describe, it, expect } from "vitest";
import {
  parseCliAppearance,
  resolveAppearanceBackground,
  findBackground,
  backgroundLabels,
  brandIds,
  fontIds,
  availableThemeIds,
  CliAppearanceError,
  DEFAULT_CLI_APPEARANCE,
} from "./cli-appearance";
import { getBrandPreset } from "./brand-presets";

describe("parseCliAppearance — defaults", () => {
  it("returns the default composition for an empty payload", () => {
    expect(parseCliAppearance({})).toEqual(DEFAULT_CLI_APPEARANCE);
  });

  it("treats a missing appearance the same as an empty one", () => {
    expect(parseCliAppearance(undefined)).toEqual(DEFAULT_CLI_APPEARANCE);
    expect(parseCliAppearance(null)).toEqual(DEFAULT_CLI_APPEARANCE);
  });

  it("does not let a caller mutate the shared default object", () => {
    const first = parseCliAppearance({});
    first.theme = "mutated";
    expect(parseCliAppearance({}).theme).toBe(DEFAULT_CLI_APPEARANCE.theme);
  });

  it("rejects a non-object appearance", () => {
    expect(() => parseCliAppearance("nord")).toThrow(CliAppearanceError);
    expect(() => parseCliAppearance([])).toThrow(/must be an object/);
  });
});

describe("parseCliAppearance — brands", () => {
  it("applies every field of a brand preset", () => {
    const preset = getBrandPreset("supabase")!;
    const appearance = parseCliAppearance({ brand: "supabase" });

    expect(appearance).toMatchObject({
      theme: preset.settings.theme,
      fontId: preset.settings.fontId,
      outerPadding: preset.settings.outerPadding,
      innerPadding: preset.settings.innerPadding,
      cornerRadius: preset.settings.cornerRadius,
      lineNumbers: preset.settings.lineNumbers,
      windowDecoration: preset.settings.windowDecoration,
      background: preset.background.label,
    });
  });

  it("accepts every registered brand id", () => {
    for (const id of brandIds()) {
      expect(() => parseCliAppearance({ brand: id })).not.toThrow();
    }
  });

  it("rejects an unknown brand and lists the valid ones", () => {
    expect(() => parseCliAppearance({ brand: "nope" })).toThrow(/Unknown brand "nope"/);
    expect(() => parseCliAppearance({ brand: "nope" })).toThrow(/supabase/);
  });

  it("lets an explicit option override the brand it was combined with", () => {
    // Brand is a starting composition, not a lock — same as the composer.
    const appearance = parseCliAppearance({ brand: "supabase", cornerRadius: 0 });
    expect(appearance.cornerRadius).toBe(0);
    expect(appearance.background).toBe(getBrandPreset("supabase")!.background.label);
  });

  it("applies the brand before the override regardless of key order", () => {
    const appearance = parseCliAppearance({ cornerRadius: 0, brand: "supabase" });
    expect(appearance.cornerRadius).toBe(0);
  });
});

describe("parseCliAppearance — theme", () => {
  it("accepts a theme Lumis knows about", () => {
    const [first] = Array.from(availableThemeIds());
    expect(parseCliAppearance({ theme: first }).theme).toBe(first);
  });

  it("rejects an unknown theme", () => {
    expect(() => parseCliAppearance({ theme: "not_a_theme" })).toThrow(/Unknown theme/);
  });

  it("rejects a non-string theme", () => {
    expect(() => parseCliAppearance({ theme: 7 })).toThrow(/must be a string/);
  });
});

describe("parseCliAppearance — background", () => {
  it("resolves a label case-insensitively to its canonical form", () => {
    expect(parseCliAppearance({ background: "candy" }).background).toBe("Candy");
  });

  it("keeps an explicit null, which means no canvas", () => {
    // `--no-background` sends null; treating it as "absent" would silently
    // reinstate the default 64px canvas.
    expect(parseCliAppearance({ background: null }).background).toBeNull();
  });

  it("clears a brand's canvas when null is passed alongside it", () => {
    expect(parseCliAppearance({ brand: "vercel", background: null }).background).toBeNull();
  });

  it("accepts every registered background label", () => {
    for (const label of backgroundLabels()) {
      expect(parseCliAppearance({ background: label }).background).toBe(label);
    }
  });

  it("rejects an unknown background", () => {
    expect(() => parseCliAppearance({ background: "Chartreuse" })).toThrow(/Unknown background/);
  });

  it("rejects a non-string, non-null background", () => {
    expect(() => parseCliAppearance({ background: 3 })).toThrow(/string or null/);
  });
});

describe("parseCliAppearance — enumerated values", () => {
  it.each([
    ["fontSize", 16],
    ["outerPadding", 32],
    ["innerPadding", 24],
    ["cornerRadius", 8],
    ["pixelRatio", 6],
  ] as const)("accepts a valid %s", (key, value) => {
    expect(parseCliAppearance({ [key]: value })[key]).toBe(value);
  });

  it.each([
    ["fontSize", 15],
    ["outerPadding", 50],
    ["innerPadding", 10],
    ["cornerRadius", 20],
    ["pixelRatio", 3],
  ])("rejects an out-of-set %s", (key, value) => {
    expect(() => parseCliAppearance({ [key]: value })).toThrow(/must be one of/);
  });

  it("rejects a numeric option passed as a string", () => {
    expect(() => parseCliAppearance({ fontSize: "16" })).toThrow(/must be one of/);
  });

  it("accepts each font id", () => {
    for (const id of fontIds()) {
      expect(parseCliAppearance({ font: id }).fontId).toBe(id);
    }
  });

  it("rejects an unknown font", () => {
    expect(() => parseCliAppearance({ font: "comic" })).toThrow(/Unknown font/);
  });

  it.each(["macos", "macos-subtle", "windows", "minimal", "none"])(
    "accepts the %s window style",
    (style) => {
      expect(parseCliAppearance({ window: style }).windowDecoration).toBe(style);
    },
  );

  it("rejects an unknown window style", () => {
    expect(() => parseCliAppearance({ window: "aqua" })).toThrow(/Unknown window style/);
  });

  it("accepts a boolean lineNumbers and rejects other types", () => {
    expect(parseCliAppearance({ lineNumbers: true }).lineNumbers).toBe(true);
    expect(() => parseCliAppearance({ lineNumbers: "yes" })).toThrow(/must be a boolean/);
  });
});

describe("parseCliAppearance — header and footer", () => {
  it("merges a partial header over the current settings", () => {
    const appearance = parseCliAppearance({ header: { enabled: false } });
    expect(appearance.header.enabled).toBe(false);
    expect(appearance.header.showFilename).toBe(DEFAULT_CLI_APPEARANCE.header.showFilename);
  });

  it("merges a partial footer over the current settings", () => {
    const appearance = parseCliAppearance({ footer: { enabled: true } });
    expect(appearance.footer.enabled).toBe(true);
    expect(appearance.footer.showTheme).toBe(DEFAULT_CLI_APPEARANCE.footer.showTheme);
  });

  it("merges over the brand's header rather than the global default", () => {
    const preset = getBrandPreset("vercel")!;
    const appearance = parseCliAppearance({ brand: "vercel", header: { enabled: true } });
    expect(appearance.header.filenamePosition).toBe(preset.settings.header.filenamePosition);
  });

  it("rejects a non-object header or footer", () => {
    expect(() => parseCliAppearance({ header: "on" })).toThrow(/`header` must be an object/);
    expect(() => parseCliAppearance({ footer: [] })).toThrow(/`footer` must be an object/);
  });

  it("drops unrecognised keys inside header and footer", () => {
    const appearance = parseCliAppearance({ header: { enabled: true, sparkle: true } });
    expect(appearance.header).not.toHaveProperty("sparkle");
  });
});

describe("findBackground / resolveAppearanceBackground", () => {
  it("finds a generic background", () => {
    expect(findBackground("Ocean")?.label).toBe("Ocean");
  });

  it("finds a brand background", () => {
    expect(findBackground(getBrandPreset("stripe")!.background.label)).not.toBeNull();
  });

  it("returns null for an unknown label", () => {
    expect(findBackground("Nope")).toBeNull();
  });

  it("resolves null for an appearance with no background", () => {
    expect(resolveAppearanceBackground(parseCliAppearance({ background: null }))).toBeNull();
  });

  it("resolves the definition for an appearance with a background", () => {
    const appearance = parseCliAppearance({ background: "Ocean" });
    expect(resolveAppearanceBackground(appearance)?.from).toBeDefined();
  });
});
