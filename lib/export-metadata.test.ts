import { describe, expect, it } from "vitest";
import {
  DEFAULT_FOOTER_SETTINGS,
  DEFAULT_HEADER_SETTINGS,
  normalizeFooterSettings,
  normalizeHeaderSettings,
  visibleFooterItems,
} from "./brand-presets";

describe("export metadata settings", () => {
  it("normalizes legacy filename and footer toggles", () => {
    expect(normalizeHeaderSettings(undefined, false)).toEqual({
      ...DEFAULT_HEADER_SETTINGS,
      showFilename: false,
    });
    expect(normalizeFooterSettings(undefined, true)).toEqual({
      ...DEFAULT_FOOTER_SETTINGS,
      enabled: true,
    });
  });

  it("defaults filename to center and language to right", () => {
    expect(DEFAULT_HEADER_SETTINGS).toMatchObject({
      filenamePosition: "center",
      languagePosition: "right",
    });
  });

  it("preserves independent item positions while repairing invalid values", () => {
    expect(
      normalizeHeaderSettings({
        enabled: false,
        showFilename: true,
        showLanguage: false,
        filenamePosition: "left",
        languagePosition: "center",
      }),
    ).toEqual({
      enabled: false,
      showFilename: true,
      showLanguage: false,
      filenamePosition: "left",
      languagePosition: "center",
    });

    expect(
      normalizeHeaderSettings({ filenamePosition: "somewhere", languagePosition: "left" }),
    ).toMatchObject({ filenamePosition: "center", languagePosition: "left" });
    expect(normalizeFooterSettings({ alignment: "somewhere" })).toEqual(DEFAULT_FOOTER_SETTINGS);
  });

  it("migrates the previous shared Header alignment to both items", () => {
    expect(normalizeHeaderSettings({ alignment: "right" })).toMatchObject({
      filenamePosition: "right",
      languagePosition: "right",
    });
  });

  it("returns only enabled footer items in display order", () => {
    expect(
      visibleFooterItems({
        ...DEFAULT_FOOTER_SETTINGS,
        enabled: true,
        showLanguage: true,
        showTheme: false,
        showLineCount: true,
        showCharCount: false,
        showAuthor: true,
      }),
    ).toEqual(["language", "lineCount", "author"]);
  });
});
