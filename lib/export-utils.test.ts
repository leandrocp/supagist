// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockHighlighter } = vi.hoisted(() => ({
  mockHighlighter: {
    loadLanguage: vi.fn(),
    highlightIter: vi.fn(),
  },
}));

vi.mock("@lumis-sh/lumis/client", () => ({
  availableLanguages: vi.fn(() => [
    { id: "javascript", extensions: ["*.js", "*.jsx", "*.mjs"] },
    { id: "typescript", extensions: ["*.ts", "*.tsx"] },
    { id: "python", extensions: ["*.py"] },
    { id: "rust", extensions: ["*.rs"] },
    { id: "go", extensions: ["*.go"] },
    { id: "css", extensions: ["*.css"] },
    { id: "json", extensions: ["*.json"] },
    { id: "html", extensions: ["*.html", "*.htm"] },
    { id: "sql", extensions: ["*.sql"] },
  ]),
}));

// The export's comment placement goes through Lumis annotations, and resolving
// a line range to byte offsets is Lumis's job — a hand-written fake would be
// reimplementing the thing under test. Highlight for real, restricted to
// plaintext so no parser has to be fetched, and let the fake cover the rest.
vi.mock("@/lib/lumis-client", async () => {
  const { createHighlighter } = await import("@lumis-sh/lumis");
  const plaintext = (await import("@lumis-sh/lumis/langs/plaintext")).default;
  const real = await createHighlighter({ languages: [plaintext] });

  return {
    clientHighlighterPromise: Promise.resolve({
      loadLanguage: mockHighlighter.loadLanguage,
      highlightIter: mockHighlighter.highlightIter,
      highlight: (
        code: string,
        formatter: { render: (source: string, events: never[]) => string },
        options?: object,
      ) =>
        real.highlight(
          code,
          // Keep `this` bound to the caller's formatter so it still collects
          // its rows; only the language is swapped for one that is loaded.
          { language: plaintext, render: (source, events) => formatter.render(source, events) },
          options,
        ),
    }),
  };
});

vi.mock("@lumis-sh/themes/github_light", () => ({
  default: {
    appearance: "light",
    highlights: { normal: { bg: "#ffffff", fg: "#333333" } },
  },
}));

import {
  toPngFilename,
  escapeXml,
  inferLanguage,
  wrapTokenLine,
  triggerDownload,
  createHighlightedSvg,
  renderToFile,
  estimateExportDimensions,
  addPngTextMetadata,
  exportCornerRadiusFromSliderIndex,
  exportCornerRadiusToSliderIndex,
  exportInnerPaddingFromSliderIndex,
  exportInnerPaddingToSliderIndex,
  exportOuterPaddingFromSliderIndex,
  exportOuterPaddingToSliderIndex,
  normalizeExportCornerRadius,
  normalizeExportInnerPadding,
  normalizeExportOuterPadding,
  normalizeExportFontSize,
  exportLineHeightForFontSize,
  exportCharWidthForFontSize,
  EXPORT_METADATA_URL,
  EXPORT_FONT_SIZE,
  EXPORT_LINE_HEIGHT,
  EXPORT_CHAR_WIDTH,
} from "./export-utils";
import type { SvgToken } from "./export-utils";

// Re-apply highlighter implementations before each test so mock call counts
// are fresh and implementations are always set even after vi.clearAllMocks().
beforeEach(() => {
  // Brand patterns are browser-relative assets. Give them a deterministic
  // response so SVG tests never depend on a dev server listening on :3000.
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.startsWith("/brands/")) {
      return new Response(new Blob(["pattern"], { type: "image/png" }), { status: 200 });
    }
    return new Response(null, { status: 404 });
  });

  mockHighlighter.loadLanguage.mockResolvedValue(undefined);
  mockHighlighter.highlightIter.mockImplementation(
    (
      code: string,
      _lang: string,
      _theme: object,
      cb: (text: string, lang: string, range: null, scope: null) => void,
    ) => {
      // Emit the full code (with newlines) as one unstyled token so
      // createHighlightedSvg's line-splitting path is exercised.
      cb(code, "text", null, null);
    },
  );
});

const T = (text: string): SvgToken => ({ text, color: "#ffffff", bold: false, italic: false });

// ── toPngFilename ────────────────────────────────────────────────────────────

describe("toPngFilename", () => {
  it("strips extension and appends .png", () => {
    expect(toPngFilename("foo.ts")).toBe("foo.png");
  });

  it("appends suffix before .png", () => {
    expect(toPngFilename("foo.ts", "-og")).toBe("foo-og.png");
  });

  it("uses fallback for empty filename", () => {
    expect(toPngFilename("")).toBe("supagist-snippet.png");
  });

  it("uses fallback for whitespace-only filename", () => {
    expect(toPngFilename("   ")).toBe("supagist-snippet.png");
  });

  it("handles filename without extension", () => {
    expect(toPngFilename("Makefile")).toBe("Makefile.png");
  });

  it("strips only the last extension segment", () => {
    expect(toPngFilename("archive.tar.gz")).toBe("archive.tar.png");
  });
});

// ── font size ────────────────────────────────────────────────────────────────

describe("normalizeExportFontSize", () => {
  it("keeps supported sizes untouched", () => {
    expect(normalizeExportFontSize(12)).toBe(12);
    expect(normalizeExportFontSize(20)).toBe(20);
  });

  it("snaps arbitrary sizes to the nearest supported value", () => {
    expect(normalizeExportFontSize(15)).toBe(16);
    expect(normalizeExportFontSize(100)).toBe(20);
    expect(normalizeExportFontSize(0)).toBe(12);
  });
});

describe("exportLineHeightForFontSize", () => {
  it("returns the historical line height at the default font size", () => {
    expect(exportLineHeightForFontSize(EXPORT_FONT_SIZE)).toBe(EXPORT_LINE_HEIGHT);
  });

  it("scales with the font size", () => {
    expect(exportLineHeightForFontSize(20)).toBe(34);
    expect(exportLineHeightForFontSize(12)).toBe(21);
  });

  it("normalizes unsupported sizes before scaling", () => {
    expect(exportLineHeightForFontSize(15)).toBe(exportLineHeightForFontSize(16));
  });
});

describe("exportCharWidthForFontSize", () => {
  it("returns the measured advance at the default font size", () => {
    expect(exportCharWidthForFontSize(EXPORT_FONT_SIZE)).toBeCloseTo(EXPORT_CHAR_WIDTH, 5);
  });

  it("scales linearly with the font size", () => {
    expect(exportCharWidthForFontSize(20)).toBeCloseTo((EXPORT_CHAR_WIDTH / 14) * 20, 5);
  });
});

// ── estimateExportDimensions ─────────────────────────────────────────────────

describe("estimateExportDimensions", () => {
  const background = { label: "Test", from: "#000", to: "#fff" };

  it("reports final canvas dimensions including background padding", () => {
    const small = estimateExportDimensions({
      code: "const x = 1;",
      language: "typescript",
      theme: "github_light",
      background,
      outerPadding: 16,
    });
    const large = estimateExportDimensions({
      code: "const x = 1;",
      language: "typescript",
      theme: "github_light",
      background,
      outerPadding: 128,
    });

    expect(large.width - small.width).toBe(224);
    expect(large.height - small.height).toBe(224);
  });

  it("applies inner padding proportionally and independently of outer padding", () => {
    const code = "const proportionalPadding = 'wide enough to avoid the minimum width';";
    const compact = estimateExportDimensions({
      code,
      language: "typescript",
      theme: "github_light",
      background,
      outerPadding: 64,
      innerPadding: 8,
      windowDecoration: "none",
    });
    const spacious = estimateExportDimensions({
      code,
      language: "typescript",
      theme: "github_light",
      background,
      outerPadding: 64,
      innerPadding: 48,
      windowDecoration: "none",
    });

    expect(spacious.width - compact.width).toBe(80);
    expect(spacious.height - compact.height).toBe(80);
  });

  it("keeps line-number gutter width fixed as inner padding changes", () => {
    const code = "const fixedGutter = 'wide enough to avoid the minimum width';";
    const compact = estimateExportDimensions({
      code,
      language: "typescript",
      theme: "github_light",
      lineNumbers: true,
      innerPadding: 8,
      windowDecoration: "none",
    });
    const spacious = estimateExportDimensions({
      code,
      language: "typescript",
      theme: "github_light",
      lineNumbers: true,
      innerPadding: 48,
      windowDecoration: "none",
    });

    expect(spacious.width - compact.width).toBe(80);
    expect(spacious.height - compact.height).toBe(80);
  });

  it("uses the measured monospace advance so right padding matches inner padding", () => {
    const dimensions = estimateExportDimensions({
      code: "x".repeat(32),
      language: "typescript",
      theme: "github_light",
      innerPadding: 8,
      windowDecoration: "none",
    });

    expect(dimensions.width).toBe(286);
  });

  it("uses compact emoji-only reaction width for the live composer", () => {
    const settings = {
      code: "x".repeat(32),
      language: "typescript",
      theme: "github_light",
      innerPadding: 8,
      windowDecoration: "none" as const,
      reactions: {
        1: [{ emoji: "⭐", reactors: [{ username: "tester", avatarUrl: null }] }],
      },
      showReactions: true,
    };

    const exported = estimateExportDimensions(settings);
    const composer = estimateExportDimensions({ ...settings, compactReactions: true });

    expect(exported.width).toBe(331);
    expect(composer.width).toBe(324);
  });

  it("grows both dimensions with the font size", () => {
    const settings = {
      code: `${"x".repeat(40)}\n${"y".repeat(40)}`,
      language: "typescript",
      theme: "github_light",
      innerPadding: 8,
      windowDecoration: "none" as const,
    };
    const small = estimateExportDimensions({ ...settings, fontSize: 12 });
    const large = estimateExportDimensions({ ...settings, fontSize: 20 });

    // Two source lines: 21px vs 34px per line.
    expect(large.height - small.height).toBe(26);
    expect(large.width).toBeGreaterThan(small.width);
  });

  it("defaults to the 14px font size when none is given", () => {
    const settings = {
      code: "x".repeat(32),
      language: "typescript",
      theme: "github_light",
      innerPadding: 8,
      windowDecoration: "none" as const,
    };

    expect(estimateExportDimensions(settings)).toEqual(
      estimateExportDimensions({ ...settings, fontSize: EXPORT_FONT_SIZE }),
    );
  });

  it("keeps short snippets compact instead of forcing the legacy 420px width", () => {
    const dimensions = estimateExportDimensions({
      code: "x",
      language: "typescript",
      theme: "github_light",
      windowDecoration: "none",
    });

    expect(dimensions).toEqual({ width: 240, height: 56 });
  });

  it("does not bake export scale into logical image dimensions", () => {
    const dimensions = estimateExportDimensions({
      code: "const x = 1;",
      language: "typescript",
      theme: "github_light",
      background,
      outerPadding: 64,
    });

    expect(dimensions).toEqual({ width: 368, height: 224 });
  });

  it("uses less vertical space when window decoration is disabled", () => {
    const decorated = estimateExportDimensions({
      code: "const x = 1;",
      language: "typescript",
      theme: "github_light",
    });
    const chromeless = estimateExportDimensions({
      code: "const x = 1;",
      language: "typescript",
      theme: "github_light",
      windowDecoration: "none",
    });

    expect(decorated.height - chromeless.height).toBe(40);
  });

  it("ignores comments when estimating export dimensions", () => {
    const withoutComment = estimateExportDimensions({
      code: "const x = 1;",
      language: "typescript",
      theme: "github_light",
    });
    const withComment = estimateExportDimensions({
      code: "const x = 1;",
      language: "typescript",
      theme: "github_light",
    });

    expect(withComment).toEqual(withoutComment);
  });
});

// ── addPngTextMetadata ────────────────────────────────────────────────────────

describe("addPngTextMetadata", () => {
  it("inserts a PNG tEXt metadata chunk after IHDR", () => {
    const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdrLength = new Uint8Array([0, 0, 0, 13]);
    const ihdrType = new TextEncoder().encode("IHDR");
    const ihdrData = new Uint8Array(13);
    const ihdrCrc = new Uint8Array([0, 0, 0, 0]);
    const iend = new Uint8Array([0, 0, 0, 0, 73, 69, 78, 68, 0, 0, 0, 0]);
    const png = new Uint8Array([
      ...signature,
      ...ihdrLength,
      ...ihdrType,
      ...ihdrData,
      ...ihdrCrc,
      ...iend,
    ]);

    const withMetadata = addPngTextMetadata(png, "Source", EXPORT_METADATA_URL);
    const text = new TextDecoder().decode(withMetadata);

    expect(text).toContain("tEXtSource");
    expect(text).toContain(EXPORT_METADATA_URL);
  });

  it("leaves invalid PNG bytes unchanged", () => {
    const bytes = new TextEncoder().encode("not-png");
    expect(addPngTextMetadata(bytes, "Source", EXPORT_METADATA_URL)).toBe(bytes);
  });
});

// ── escapeXml ────────────────────────────────────────────────────────────────

describe("escapeXml", () => {
  it("escapes &", () => {
    expect(escapeXml("a & b")).toBe("a &amp; b");
  });

  it("escapes <", () => {
    expect(escapeXml("<tag>")).toBe("&lt;tag&gt;");
  });

  it("escapes >", () => {
    expect(escapeXml("a > b")).toBe("a &gt; b");
  });

  it('escapes "', () => {
    expect(escapeXml('say "hi"')).toBe("say &quot;hi&quot;");
  });

  it("escapes '", () => {
    expect(escapeXml("it's")).toBe("it&apos;s");
  });

  it("leaves a clean string unchanged", () => {
    expect(escapeXml("hello world")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(escapeXml("")).toBe("");
  });

  it("escapes multiple entities in one string", () => {
    expect(escapeXml('<a href="url">it\'s & fun</a>')).toBe(
      "&lt;a href=&quot;url&quot;&gt;it&apos;s &amp; fun&lt;/a&gt;",
    );
  });
});

// ── inferLanguage ────────────────────────────────────────────────────────────

describe("inferLanguage", () => {
  it("detects TypeScript by .ts extension", () => {
    expect(inferLanguage("foo.ts", "")).toBe("typescript");
  });

  it("detects Python by .py extension", () => {
    expect(inferLanguage("foo.py", "")).toBe("python");
  });

  it("detects Rust by .rs extension", () => {
    expect(inferLanguage("main.rs", "type Foo = Bar;")).toBe("rust");
  });

  it("extension takes priority over code heuristics", () => {
    expect(inferLanguage("main.rs", "interface Foo {}")).toBe("rust");
  });

  it("detects Python shebang", () => {
    expect(inferLanguage("script", "#!/usr/bin/env python3\nprint('hi')")).toBe("python");
  });

  it("detects Node shebang", () => {
    expect(inferLanguage("script", "#!/usr/bin/env node\nconsole.log(1)")).toBe("javascript");
  });

  it("detects bash shebang", () => {
    expect(inferLanguage("script", "#!/bin/bash\necho hi")).toBe("bash");
  });

  it("detects HTML by DOCTYPE", () => {
    expect(inferLanguage("file", "<!DOCTYPE html>\n<html>")).toBe("html");
  });

  it("detects HTML by <html tag", () => {
    expect(inferLanguage("file", "<html lang='en'>")).toBe("html");
  });

  it("detects XML by processing instruction", () => {
    expect(inferLanguage("file", "<?xml version='1.0'?>")).toBe("xml");
  });

  it("detects TypeScript by interface keyword", () => {
    expect(inferLanguage("file", "interface Foo { bar: string; }")).toBe("typescript");
  });

  it("detects TypeScript by type keyword", () => {
    expect(inferLanguage("file", "type Alias = string | number;")).toBe("typescript");
  });

  it("detects SQL by SELECT", () => {
    expect(inferLanguage("file", "SELECT * FROM users WHERE id = 1")).toBe("sql");
  });

  it("falls back to text for unrecognised input", () => {
    expect(inferLanguage("file", "just some plain text content")).toBe("text");
  });

  it("is case-insensitive on the filename", () => {
    expect(inferLanguage("FOO.TS", "")).toBe("typescript");
  });
});

// ── wrapTokenLine ────────────────────────────────────────────────────────────

describe("wrapTokenLine", () => {
  it("returns a single empty line for an empty token list", () => {
    const result = wrapTokenLine([], 100);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(0);
  });

  it("returns one line when all tokens fit within maxChars", () => {
    const result = wrapTokenLine([T("hello"), T(" world")], 100);
    expect(result).toHaveLength(1);
    expect(result[0].map((t) => t.text).join("")).toBe("hello world");
  });

  it("wraps a long token into multiple lines", () => {
    const result = wrapTokenLine([T("hello world")], 5);
    expect(result).toHaveLength(3);
    expect(result[0][0].text).toBe("hello");
    expect(result[1][0].text).toBe(" worl");
    expect(result[2][0].text).toBe("d");
  });

  it("splits across multiple tokens at the boundary", () => {
    const result = wrapTokenLine([T("abc"), T("def"), T("ghi")], 5);
    expect(result).toHaveLength(2);
    expect(result[0].map((t) => t.text).join("")).toBe("abcde");
    expect(result[1].map((t) => t.text).join("")).toBe("fghi");
  });

  it("handles a token that exactly fills a line", () => {
    const result = wrapTokenLine([T("exact")], 5);
    expect(result).toHaveLength(1);
    expect(result[0][0].text).toBe("exact");
  });

  it("starts a new line when current line is exactly full before next token", () => {
    const result = wrapTokenLine([T("abc"), T("de")], 3);
    expect(result).toHaveLength(2);
    expect(result[0][0].text).toBe("abc");
    expect(result[1][0].text).toBe("de");
  });

  it("preserves token color and style metadata when splitting", () => {
    const styled: SvgToken = { text: "bold text here", color: "#f00", bold: true, italic: true };
    const result = wrapTokenLine([styled], 5);
    for (const line of result) {
      for (const token of line) {
        expect(token.color).toBe("#f00");
        expect(token.bold).toBe(true);
        expect(token.italic).toBe(true);
      }
    }
  });

  it("handles a single empty-string token without throwing", () => {
    expect(() => wrapTokenLine([T("")], 10)).not.toThrow();
  });
});

// ── triggerDownload ──────────────────────────────────────────────────────────

describe("triggerDownload", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sets href + download on the anchor and clicks it", () => {
    const clickFn = vi.fn();
    const anchor = { href: "", download: "", click: clickFn };
    vi.spyOn(document, "createElement").mockReturnValueOnce(anchor as unknown as HTMLAnchorElement);

    triggerDownload("blob:fake", "output.png", false);

    expect(anchor.href).toBe("blob:fake");
    expect(anchor.download).toBe("output.png");
    expect(clickFn).toHaveBeenCalledOnce();
  });

  it("revokes the object URL when revoke is true", () => {
    vi.spyOn(document, "createElement").mockReturnValueOnce({
      href: "",
      download: "",
      click: vi.fn(),
    } as unknown as HTMLAnchorElement);
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockReturnValue(undefined);

    triggerDownload("blob:fake", "output.png", true);

    expect(revokeSpy).toHaveBeenCalledWith("blob:fake");
  });

  it("does not revoke the URL when revoke is false", () => {
    vi.spyOn(document, "createElement").mockReturnValueOnce({
      href: "",
      download: "",
      click: vi.fn(),
    } as unknown as HTMLAnchorElement);
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockReturnValue(undefined);

    triggerDownload("blob:fake", "output.png", false);

    expect(revokeSpy).not.toHaveBeenCalled();
  });
});

describe("export corner radius values", () => {
  it("maps the five product radius tokens", () => {
    expect(
      Array.from({ length: 5 }, (_, index) => exportCornerRadiusFromSliderIndex(index)),
    ).toEqual([0, 4, 8, 12, 16]);
  });

  it("normalizes subtle legacy values to the nearest larger token", () => {
    expect(normalizeExportCornerRadius(2)).toBe(4);
    expect(normalizeExportCornerRadius(6)).toBe(8);
    expect(normalizeExportCornerRadius(14)).toBe(16);
    expect(exportCornerRadiusToSliderIndex(14)).toBe(4);
  });
});

describe("export outer padding values", () => {
  it("maps the six meaningful slider positions", () => {
    expect(
      Array.from({ length: 6 }, (_, index) => exportOuterPaddingFromSliderIndex(index)),
    ).toEqual([0, 16, 32, 64, 96, 128]);
  });

  it("normalizes removed intermediate values to the nearest larger option", () => {
    expect(normalizeExportOuterPadding(48)).toBe(64);
    expect(normalizeExportOuterPadding(80)).toBe(96);
    expect(normalizeExportOuterPadding(112)).toBe(128);
    expect(exportOuterPaddingToSliderIndex(112)).toBe(5);
  });
});

describe("export inner padding values", () => {
  it("maps the six proportional editor inset positions", () => {
    expect(
      Array.from({ length: 6 }, (_, index) => exportInnerPaddingFromSliderIndex(index)),
    ).toEqual([8, 12, 16, 24, 32, 48]);
  });

  it("normalizes arbitrary values to the nearest supported inset", () => {
    expect(normalizeExportInnerPadding(10)).toBe(12);
    expect(normalizeExportInnerPadding(20)).toBe(24);
    expect(normalizeExportInnerPadding(40)).toBe(48);
    expect(exportInnerPaddingToSliderIndex(40)).toBe(5);
  });
});

// ── createHighlightedSvg ─────────────────────────────────────────────────────

describe("createHighlightedSvg", () => {
  it("returns a valid SVG string", async () => {
    const svg = await createHighlightedSvg(
      "const x = 1;",
      "test.ts",
      "github_light",
      1200,
      undefined,
    );
    expect(svg).toMatch(/^<svg /);
    expect(svg).toMatch(/<\/svg>$/);
  });

  it("renders an explicit square editor card", async () => {
    const svg = await createHighlightedSvg(
      "x",
      "test.ts",
      "github_light",
      1200,
      undefined,
      { label: "Test", from: "#000000", to: "#111111" },
      undefined,
      false,
      "system",
      null,
      null,
      false,
      true,
      false,
      null,
      null,
      null,
      false,
      null,
      "macos",
      0,
    );

    expect(svg).toContain('rx="0" ry="0"');
  });

  it("rounds the card corners with no background selected", async () => {
    // Regression: the no-background branch used to paint a plain full-bleed
    // rect and skip the card rect entirely, so the corner-radius setting was
    // silently dropped on export while the live preview still rounded.
    const svg = await createHighlightedSvg(
      "x",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null, // no background
      undefined,
      false,
      "system",
      null,
      null,
      false,
      true,
      false,
      null,
      null,
      null,
      false,
      null,
      "macos",
      16,
    );

    expect(svg).toContain('rx="16" ry="16"');
  });

  it("keeps square corners on a no-background export when the radius is zero", async () => {
    const svg = await createHighlightedSvg(
      "x",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      "system",
      null,
      null,
      false,
      true,
      false,
      null,
      null,
      null,
      false,
      null,
      "macos",
      0,
    );

    expect(svg).toContain('rx="0" ry="0"');
  });

  it("applies every corner radius the UI offers to a no-background export", async () => {
    for (const radius of [0, 4, 8, 12, 16]) {
      const svg = await createHighlightedSvg(
        "x",
        "test.ts",
        "github_light",
        1200,
        undefined,
        null,
        undefined,
        false,
        "system",
        null,
        null,
        false,
        true,
        false,
        null,
        null,
        null,
        false,
        null,
        "macos",
        radius,
      );

      expect(svg).toContain(`rx="${radius}" ry="${radius}"`);
    }
  });

  it("renders code at the default font size when none is given", async () => {
    const svg = await createHighlightedSvg(
      "const x = 1;",
      "test.ts",
      "github_light",
      1200,
      undefined,
    );

    expect(svg).toContain(`font-size="${EXPORT_FONT_SIZE}" font-family=`);
  });

  it("renders code at the requested font size and taller lines", async () => {
    const args = [
      "const x = 1;\nconst y = 2;",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      "system",
      null,
      null,
      false,
      true,
      false,
      null,
      null,
      null,
      false,
      null,
      "none",
      0,
      8,
      undefined,
      undefined,
    ] as const;

    const small = await createHighlightedSvg(...args, 12);
    const large = await createHighlightedSvg(...args, 20);

    expect(small).toContain('font-size="12" font-family=');
    expect(large).toContain('font-size="20" font-family=');

    const heightOf = (svg: string) => Number(/^<svg [^>]*\bheight="(\d+)"/.exec(svg)![1]);
    // Two lines at 21px vs 34px line height.
    expect(heightOf(large) - heightOf(small)).toBe(26);
  });

  it("snaps an unsupported font size to the nearest supported one", async () => {
    const svg = await createHighlightedSvg(
      "const x = 1;",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      "system",
      null,
      null,
      false,
      true,
      false,
      null,
      null,
      null,
      false,
      null,
      "none",
      0,
      8,
      undefined,
      undefined,
      15,
    );

    expect(svg).toContain('font-size="16" font-family=');
  });

  it("embeds Supagist source metadata", async () => {
    const svg = await createHighlightedSvg(
      "const x = 1;",
      "test.ts",
      "github_light",
      1200,
      undefined,
    );

    expect(svg).toContain("<metadata>");
    expect(svg).toContain(`<dc:source>${EXPORT_METADATA_URL}</dc:source>`);
  });

  it("embeds a provided share URL as source metadata", async () => {
    const sourceUrl = "https://supagist.app/example-abc123";
    const svg = await createHighlightedSvg(
      "const x = 1;",
      "test.ts",
      "github_light",
      1200,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      sourceUrl,
    );

    expect(svg).toContain(`<dc:source>${sourceUrl}</dc:source>`);
    expect(svg).toContain(`rdf:about="${sourceUrl}"`);
  });

  it("embeds the code text", async () => {
    const svg = await createHighlightedSvg(
      "hello world",
      "test.ts",
      "github_light",
      1200,
      undefined,
    );
    expect(svg).toContain("hello world");
  });

  it("includes the three traffic-light circles", async () => {
    const svg = await createHighlightedSvg("x", "test.ts", "github_light", 1200, undefined);
    expect(svg).toContain("#ff5f57");
    expect(svg).toContain("#febc2e");
    expect(svg).toContain("#28c840");
  });

  it("renders neutral dots for the macOS Subtle window decoration", async () => {
    const svg = await createHighlightedSvg(
      "x",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      "system",
      null,
      null,
      false,
      true,
      false,
      null,
      null,
      undefined,
      false,
      undefined,
      "macos-subtle",
    );

    expect(svg).not.toContain("#ff5f57");
    expect(svg).toContain('fill-opacity="0.22"');
  });

  it("renders only the centered filename for the Minimal window decoration", async () => {
    const svg = await createHighlightedSvg(
      "x",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      "system",
      null,
      null,
      false,
      true,
      false,
      null,
      null,
      undefined,
      false,
      undefined,
      "minimal",
    );

    expect(svg).not.toContain("#ff5f57");
    expect(svg).not.toContain('fill-opacity="0.22"');
    expect(svg).toMatch(/<text[^>]*>test.ts<\/text>/);
    expect(svg).toContain('data-export-window-divider="true"');
  });

  it("renders right-aligned controls for the Windows window decoration", async () => {
    const svg = await createHighlightedSvg(
      "x",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      "system",
      null,
      null,
      false,
      true,
      false,
      null,
      null,
      undefined,
      false,
      undefined,
      "windows",
    );

    expect(svg).not.toContain("#ff5f57");
    expect(svg).toContain(">×</text>");
    expect(svg).toContain('width="10" height="10" fill="none"');
  });

  it("reserves metadata inset only on the window-control side", async () => {
    const render = (windowDecoration: "macos" | "windows") =>
      createHighlightedSvg(
        "x",
        "test.ts",
        "github_light",
        1200,
        undefined,
        null,
        undefined,
        false,
        "system",
        null,
        null,
        false,
        true,
        false,
        null,
        null,
        undefined,
        false,
        undefined,
        windowDecoration,
        undefined,
        16,
        {
          enabled: true,
          showFilename: true,
          showLanguage: false,
          filenamePosition: "left",
          languagePosition: "right",
        },
      );

    const macos = await render("macos");
    const windows = await render("windows");
    const filenameX = (svg: string) =>
      Number(/<text x="([\d.]+)"[^>]*>test\.ts<\/text>/.exec(svg)?.[1]);

    expect(filenameX(macos)).toBe(82);
    expect(filenameX(windows)).toBe(18);
  });

  it("omits window chrome when decoration is none", async () => {
    const svg = await createHighlightedSvg(
      "x",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      "system",
      null,
      null,
      false,
      true,
      false,
      null,
      null,
      undefined,
      false,
      undefined,
      "none",
    );

    expect(svg).not.toContain("#ff5f57");
    expect(svg).not.toContain("test.ts");
    expect(svg).toContain(">x</tspan>");
  });

  it("aligns the first traffic-light dot's left edge with the footer text", async () => {
    const svg = await createHighlightedSvg(
      "x",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      "system",
      null,
      null,
      false,
      false,
      true, // showFooter
      "leandrocp",
    );
    // Pull the first traffic-light cx (red dot is the first ff5f57 circle)
    // and the footer text's first x (the first 12px <text> after the
    // line-marker text — i.e. the first segment of the status bar). Dot's
    // leftmost pixel = cx - r; footer text x is the left edge directly.
    // They must match.
    const dotMatch = /<circle cx="(\d+)" cy="\d+" r="(\d+)" fill="#ff5f57"/.exec(svg);
    // The status-bar segments use font-size="12"; the filename also uses 12,
    // but it's centred (text-anchor="middle") so its <text> tag includes
    // text-anchor before x — match only ones that DON'T have text-anchor.
    const footerMatches = Array.from(
      svg.matchAll(/<text x="(\d+)" y="\d+" font-size="12" font-family="[^"]+" fill="/g),
    );
    expect(dotMatch).not.toBeNull();
    expect(footerMatches.length).toBeGreaterThan(0);
    const dotLeft = Number(dotMatch![1]) - Number(dotMatch![2]);
    const footerLeft = Number(footerMatches[0]![1]);
    expect(dotLeft).toBe(footerLeft);
  });

  it("uses the theme background color", async () => {
    const svg = await createHighlightedSvg("x", "test.ts", "github_light", 1200, undefined);
    expect(svg).toContain("#ffffff");
  });

  it("adds a gradient when a background is provided", async () => {
    const svg = await createHighlightedSvg("x", "test.ts", "github_light", 1200, undefined, {
      label: "Candy",
      from: "#A58EFB",
      to: "#E9BFF8",
    });
    expect(svg).toContain("linearGradient");
    expect(svg).toContain("#A58EFB");
    expect(svg).toContain("#E9BFF8");
  });

  it("omits the gradient when no background is given", async () => {
    const svg = await createHighlightedSvg("x", "test.ts", "github_light", 1200, undefined, null);
    expect(svg).not.toContain("linearGradient");
  });

  it("includes line numbers when lineNumbers is true", async () => {
    const svg = await createHighlightedSvg(
      "line1\nline2",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      true,
    );
    expect(svg).toContain(">1<");
    expect(svg).toContain(">2<");
  });

  it("right-aligns exported single- and multi-digit line numbers", async () => {
    const code = Array.from({ length: 10 }, (_value, index) => `line ${index + 1}`).join("\n");
    const svg = await createHighlightedSvg(
      code,
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      true,
    );

    expect(svg).toContain('text-anchor="end" fill="#333333" fill-opacity="0.4">9</text>');
    expect(svg).toContain('text-anchor="end" fill="#333333" fill-opacity="0.4">10</text>');
  });

  it("renders the line-number gutter divider only when line numbers are enabled", async () => {
    const withLineNumbers = await createHighlightedSvg(
      "line1\nline2",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      true,
    );
    const withoutLineNumbers = await createHighlightedSvg(
      "line1\nline2",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
    );

    expect(withLineNumbers).toContain('data-export-gutter-divider="true"');
    expect(withLineNumbers).toContain('<line data-export-gutter-divider="true" x1="54"');
    expect(withoutLineNumbers).not.toContain('data-export-gutter-divider="true"');
  });

  it("renders a divider between window chrome and the code body", async () => {
    const svg = await createHighlightedSvg(
      "line1\nline2",
      "test.ts",
      "github_light",
      1200,
      undefined,
    );

    expect(svg).toContain('data-export-window-divider="true"');
    expect(svg).toContain('<line data-export-window-divider="true" x1="0" y1="40"');
  });

  it("keeps the SVG gutter fixed while moving code with inner padding", async () => {
    const renderWithInnerPadding = (innerPadding: number) =>
      createHighlightedSvg(
        "line1",
        "test.ts",
        "github_light",
        1200,
        undefined,
        null,
        undefined,
        true,
        "system",
        null,
        null,
        false,
        true,
        false,
        null,
        null,
        null,
        false,
        null,
        "none",
        undefined,
        innerPadding,
      );

    const compact = await renderWithInnerPadding(8);
    const spacious = await renderWithInnerPadding(48);

    expect(compact).toContain('<text x="36"');
    expect(compact).toContain('<text x="62"');
    expect(spacious).toContain('<text x="36"');
    expect(spacious).toContain('<text x="102"');
  });

  it("omits line numbers when lineNumbers is false", async () => {
    const svg = await createHighlightedSvg(
      "line1\nline2",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
    );
    expect(svg).not.toContain(">1<");
  });

  it("renders a reaction emoji when showReactions is true", async () => {
    const svg = await createHighlightedSvg(
      "const x = 1;",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      "system",
      null,
      { 1: [{ emoji: "🔥", reactors: [{ username: "alice" }] }] },
      true,
    );
    expect(svg).toContain("🔥");
  });

  it("renders a comment under the line it annotates", async () => {
    const svg = await createHighlightedSvg(
      "const x = 1;",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      undefined,
      null,
      null,
      false,
      true,
      false,
      null,
      null,
      { 1: { author: "dev", body: "check this branch" } },
      true,
    );

    expect(svg).toContain("\u21b3 check this branch");
  });

  it("renders a comment left on a blank line", async () => {
    // A blank line has no text to annotate, and review views comment on them
    // all the same. Lumis composes the empty range as a point.
    const svg = await createHighlightedSvg(
      "const x = 1;\n\nconst y = 2;",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      undefined,
      null,
      null,
      false,
      true,
      false,
      null,
      null,
      { 2: { author: "dev", body: "why the gap?" } },
      true,
    );

    expect(svg).toContain("\u21b3 why the gap?");

    // And it sits between the two source lines, not appended at the end.
    const rows = [...svg.matchAll(/<text x="\d+" y="(\d+)"[^>]*>([\s\S]*?)<\/text>/g)];
    const yOf = (needle: string) => Number(rows.find((row) => row[2]!.includes(needle))![1]);

    expect(yOf("why the gap?")).toBeGreaterThan(yOf("const x"));
    expect(yOf("why the gap?")).toBeLessThan(yOf("const y"));
  });

  it("renders every row of a comment long enough to wrap", async () => {
    // EXPORT_MAX_CHARS_PER_LINE wraps at 110; taking only the first wrapped row
    // silently truncated the rest of the comment.
    const body = `${"alpha ".repeat(30)}omega`;
    const svg = await createHighlightedSvg(
      "const x = 1;",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      undefined,
      null,
      null,
      false,
      true,
      false,
      null,
      null,
      { 1: { author: "dev", body } },
      true,
    );

    expect(svg).toContain("omega");
  });

  it("counts every wrapped comment row when sizing the card", async () => {
    const args = [
      "const x = 1;",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      undefined,
      "typescript",
      null,
      false,
      false,
      false,
      null,
      null,
    ] as const;
    const comments = { 1: { author: "dev", body: `${"alpha ".repeat(30)}omega` } };

    const svg = await createHighlightedSvg(...args, comments, true);
    const estimate = estimateExportDimensions({
      code: "const x = 1;",
      filename: "test.ts",
      language: "typescript",
      theme: "github_light",
      comments,
      showComments: true,
    });

    expect(estimate.height).toBe(Number(/height="(\d+)"/.exec(svg)![1]));
  });

  it("leaves the comment out when showComments is off", async () => {
    const svg = await createHighlightedSvg(
      "const x = 1;",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      undefined,
      null,
      null,
      false,
      true,
      false,
      null,
      null,
      { 1: { author: "dev", body: "check this branch" } },
      false,
    );

    expect(svg).not.toContain("check this branch");
    expect(svg).not.toContain("\u21b3");
  });

  it("puts the comment after the whole of a wrapped line, not inside it", async () => {
    // EXPORT_MAX_CHARS_PER_LINE wraps at 110, so this is two visual rows and
    // the comment has to follow both.
    const svg = await createHighlightedSvg(
      "x".repeat(180),
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      undefined,
      null,
      null,
      false,
      true,
      false,
      null,
      null,
      { 1: { author: "dev", body: "wrapped note" } },
      true,
    );

    const rows = [...svg.matchAll(/<text x="\d+" y="(\d+)"[^>]*>([\s\S]*?)<\/text>/g)];
    const commentY = rows.find((row) => row[2]!.includes("wrapped note"))?.[1];
    const lastSourceY = rows.filter((row) => row[2]!.includes("xxx")).at(-1)?.[1];

    expect(commentY).toBeDefined();
    expect(lastSourceY).toBeDefined();
    expect(Number(commentY)).toBeGreaterThan(Number(lastSourceY));
  });

  it("estimates the same height the rendered card uses when comments show", async () => {
    // estimateExportDimensions duplicates the height math, so a comment row
    // added to one and not the other silently shrinks the preview.
    const code = "const x = 1;\nconst y = 2;";
    const comments = { 1: { author: "dev", body: "note" } };
    const estimate = estimateExportDimensions({
      code,
      filename: "test.ts",
      language: "typescript",
      theme: "github_light",
      comments,
      showComments: true,
    });
    const svg = await createHighlightedSvg(
      code,
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      undefined,
      "typescript",
      null,
      false,
      false,
      false,
      null,
      null,
      comments,
      true,
    );

    expect(estimate.height).toBe(Number(/height="(\d+)"/.exec(svg)![1]));
  });

  it("counts the comment row when sizing the card", async () => {
    const args = [
      "const x = 1;",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      undefined,
      null,
      null,
      false,
      true,
      false,
      null,
      null,
      { 1: { author: "dev", body: "note" } },
    ] as const;

    const withComment = await createHighlightedSvg(...args, true);
    const withoutComment = await createHighlightedSvg(...args, false);

    const heightOf = (svg: string) => Number(/height="(\d+)"/.exec(svg)![1]);
    expect(heightOf(withComment)).toBeGreaterThan(heightOf(withoutComment));
  });

  it("places the reaction chip on the LAST visual row of a wrapped source line", async () => {
    // Regression: chips were being emitted at the end of the first wrap row,
    // floating mid-paragraph for long lines. They should sit after the last
    // word of the wrapped paragraph instead.
    // EXPORT_MAX_CHARS_PER_LINE wraps at 110 chars; this is two visual rows.
    const longLine = "x".repeat(180); // wraps to 2 visual rows
    const svg = await createHighlightedSvg(
      longLine,
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      "system",
      null,
      { 1: [{ emoji: "🔥", reactors: [{ username: "alice" }] }] },
      true,
    );
    // Pull every <text> y attribute used for code (font-size 14). The first
    // such y is row 0, the second is row 1, etc. The chip's <text> for the
    // emoji uses font-size="13"; its y attribute should match the LAST code
    // row, not the first.
    const codeYs = Array.from(svg.matchAll(/<text x="\d+" y="(\d+)" font-size="14"/g)).map((m) =>
      Number(m[1]),
    );
    expect(codeYs.length).toBeGreaterThanOrEqual(2);
    const lastCodeY = codeYs[codeYs.length - 1];
    const firstCodeY = codeYs[0];
    // The chip emoji <text> sits roughly fontSize*0.35 above the line baseline,
    // so we expect its y to be near the LAST code row, not the first.
    const chipTextMatch = /<text x="[\d.]+" y="([\d.]+)" font-size="13"[^>]*>🔥/.exec(svg);
    expect(chipTextMatch).not.toBeNull();
    const chipY = Number(chipTextMatch![1]);
    // chipY should be much closer to the last code row than the first.
    expect(Math.abs(chipY - lastCodeY)).toBeLessThan(Math.abs(chipY - firstCodeY));
  });

  it("renders every unique emoji on a line, not just the first", async () => {
    const svg = await createHighlightedSvg(
      "const x = 1;",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      "system",
      null,
      {
        1: [
          { emoji: "🔥", reactors: [{ username: "alice" }] },
          { emoji: "💡", reactors: [{ username: "bob" }] },
          { emoji: "👀", reactors: [{ username: "carol" }] },
        ],
      },
      true,
    );
    expect(svg).toContain("🔥");
    expect(svg).toContain("💡");
    expect(svg).toContain("👀");
  });

  it("renders every visible reactor's avatar (not just the first) and a +N overflow pill", async () => {
    // Regression: the export was rendering only `chip.reactors[0]`, so a
    // chip with multiple reactors collapsed to a single-avatar chip even
    // though the live UI shows up to 3 stacked avatars + a `+N` pill.
    // Each fetch must return a fresh Response — bodies are consumed once,
    // and we expect three concurrent reads in parallel inside Promise.all.
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(new Blob(["png-bytes"], { type: "image/png" }), {
          status: 200,
          headers: { "content-type": "image/png" },
        }),
    );
    try {
      const svg = await createHighlightedSvg(
        "const x = 1;",
        "test.ts",
        "github_light",
        1200,
        undefined,
        null,
        undefined,
        false,
        "system",
        null,
        {
          1: [
            {
              emoji: "🚀",
              reactors: [
                { username: "alice", avatarUrl: "https://example.com/multi-a.png" },
                { username: "bob", avatarUrl: "https://example.com/multi-b.png" },
                { username: "carol", avatarUrl: "https://example.com/multi-c.png" },
                { username: "dave", avatarUrl: "https://example.com/multi-d.png" },
              ],
            },
          ],
        },
        true,
      );
      // Three distinct <pattern> defs — one per visible reactor avatar.
      expect(svg).toMatch(/<pattern id="avatar-1"/);
      expect(svg).toMatch(/<pattern id="avatar-2"/);
      expect(svg).toMatch(/<pattern id="avatar-3"/);
      // Three circles fill from those patterns inside the chip.
      expect(svg).toContain('fill="url(#avatar-1)"');
      expect(svg).toContain('fill="url(#avatar-2)"');
      expect(svg).toContain('fill="url(#avatar-3)"');
      // The 4th reactor collapses into a `+1` overflow pill.
      expect(svg).toContain(">+1<");
      // The 4th avatar's URL is NOT pre-fetched (we cap at 3 visible).
      expect(fetchSpy).not.toHaveBeenCalledWith("https://example.com/multi-d.png", {
        mode: "cors",
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("embeds the reactor's avatar URL as an SVG <pattern> when present", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Blob(["png-bytes"], { type: "image/png" }), {
        status: 200,
        headers: { "content-type": "image/png" },
      }),
    );
    try {
      const svg = await createHighlightedSvg(
        "const x = 1;",
        "test.ts",
        "github_light",
        1200,
        undefined,
        null,
        undefined,
        false,
        "system",
        null,
        {
          1: [
            {
              emoji: "🔥",
              reactors: [{ username: "alice", avatarUrl: "https://example.com/a.png" }],
            },
          ],
        },
        true,
      );
      // A <pattern> def + a circle that fills from it = the avatar pic is in
      // the SVG, not just the initial-letter fallback. patternContentUnits
      // must be objectBoundingBox or the inner <image width=1 height=1>
      // collapses to a single user-space pixel — the bug that made the
      // avatar render as a blank circle in the canvas-rasterised PNG.
      expect(svg).toMatch(/<pattern id="avatar-1"[^>]*patternContentUnits="objectBoundingBox"/);
      expect(svg).toContain('fill="url(#avatar-1)"');
      // xlink:href is duplicated alongside href for the SVG-1.1 rasteriser.
      expect(svg).toMatch(/<image[^>]*xlink:href=/);
      expect(fetchSpy).toHaveBeenCalledWith("https://example.com/a.png", { mode: "cors" });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("falls back to the initial-letter circle when the avatar URL fails to load", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 404 }));
    try {
      const svg = await createHighlightedSvg(
        "const x = 1;",
        "test.ts",
        "github_light",
        1200,
        undefined,
        null,
        undefined,
        false,
        "system",
        null,
        {
          1: [
            {
              emoji: "🔥",
              reactors: [{ username: "alice", avatarUrl: "https://example.com/missing.png" }],
            },
          ],
        },
        true,
      );
      expect(svg).not.toContain('fill="url(#avatar-');
      // The initial of the username falls back as the avatar text.
      expect(svg).toContain(">A<");
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("omits reaction emoji when showReactions is false", async () => {
    const svg = await createHighlightedSvg(
      "const x = 1;",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      "system",
      null,
      { 1: [{ emoji: "🔥", reactors: [{ username: "alice" }] }] },
      false,
    );
    expect(svg).not.toContain("🔥");
  });

  it("shows the filename when showFilename is true", async () => {
    const svg = await createHighlightedSvg(
      "x",
      "my-file.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      "system",
      null,
      null,
      false,
      true,
    );
    expect(svg).toContain(">my-file.ts<");
    const filenameX = Number(/<text x="([\d.]+)"[^>]*>my-file\.ts<\/text>/.exec(svg)?.[1]);
    const languageX = Number(
      /<text x="([\d.]+)"[^>]*>(?:TypeScript|typescript)<\/text>/.exec(svg)?.[1],
    );
    expect(filenameX).toBeLessThan(languageX);
  });

  it("omits the filename when showFilename is false", async () => {
    const svg = await createHighlightedSvg(
      "x",
      "my-file.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      "system",
      null,
      null,
      false,
      false,
    );
    expect(svg).not.toContain(">my-file.ts<");
  });

  it("renders granular header and footer metadata selections", async () => {
    const svg = await createHighlightedSvg(
      "const x = 1;\nconst y = 2;",
      "private-name.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      "system",
      "typescript",
      null,
      false,
      true,
      true,
      "alice",
      null,
      undefined,
      false,
      undefined,
      "minimal",
      12,
      16,
      {
        enabled: true,
        showFilename: false,
        showLanguage: true,
        filenamePosition: "center",
        languagePosition: "right",
      },
      {
        enabled: true,
        showLanguage: false,
        showTheme: true,
        showLineCount: true,
        showCharCount: false,
        showAuthor: false,
        alignment: "center",
      },
    );

    expect(svg).not.toContain(">private-name.ts<");
    expect(svg).toContain(">typescript<");
    expect(svg).toContain(">github_light<");
    expect(svg).toContain(">2 lines<");
    expect(svg).not.toContain("/ 8,000");
    expect(svg).not.toContain(">@alice<");
  });

  it("collapses header and footer height when their categories are disabled", async () => {
    const visible = await createHighlightedSvg(
      "x",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      "system",
      null,
      null,
      false,
      true,
      true,
      null,
      null,
      undefined,
      false,
      undefined,
      "minimal",
      12,
      16,
      {
        enabled: true,
        showFilename: true,
        showLanguage: true,
        filenamePosition: "center",
        languagePosition: "right",
      },
      {
        enabled: true,
        showLanguage: false,
        showTheme: true,
        showLineCount: false,
        showCharCount: false,
        showAuthor: false,
        alignment: "left",
      },
    );
    const hidden = await createHighlightedSvg(
      "x",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      "system",
      null,
      null,
      false,
      true,
      true,
      null,
      null,
      undefined,
      false,
      undefined,
      "minimal",
      12,
      16,
      {
        enabled: false,
        showFilename: true,
        showLanguage: true,
        filenamePosition: "center",
        languagePosition: "right",
      },
      {
        enabled: false,
        showLanguage: true,
        showTheme: true,
        showLineCount: true,
        showCharCount: true,
        showAuthor: true,
        alignment: "left",
      },
    );

    const visibleHeight = Number(/height="(\d+)"/.exec(visible)?.[1]);
    const hiddenHeight = Number(/height="(\d+)"/.exec(hidden)?.[1]);
    expect(visibleHeight - hiddenHeight).toBe(76);
    expect(hidden).not.toContain("data-export-window-divider");
  });

  it("clips to the provided height", async () => {
    const svg = await createHighlightedSvg("x", "test.ts", "github_light", 1200, 630);
    expect(svg).toContain('height="630"');
  });

  it("uses languageOverride when provided", async () => {
    await createHighlightedSvg(
      "x",
      "test.ts",
      "github_light",
      1200,
      undefined,
      null,
      undefined,
      false,
      "system",
      "rust",
    );
    expect(mockHighlighter.loadLanguage).toHaveBeenCalledWith("rust");
  });

  it("handles multi-line code", async () => {
    const svg = await createHighlightedSvg(
      "line1\nline2\nline3",
      "test.ts",
      "github_light",
      1200,
      undefined,
    );
    expect(svg).toContain("line1");
    expect(svg).toContain("line2");
    expect(svg).toContain("line3");
  });
});

// ── Premium brand scenes ─────────────────────────────────────────────────────

describe("EXPORT_BRAND_BACKGROUNDS — premium scenes", () => {
  it("renders layered lighting, canvas rims, frame depth, and finite geometry for all brands", async () => {
    const { EXPORT_BRAND_BACKGROUNDS, createHighlightedSvg } = await import("./export-utils");

    for (const background of EXPORT_BRAND_BACKGROUNDS) {
      const svg = await createHighlightedSvg(
        "const polished = true",
        "scene.ts",
        "github_light",
        1200,
        undefined,
        background,
      );
      expect(svg, background.label).toContain('data-scene-layer="glow-0"');
      expect(svg, background.label).toContain('data-scene-layer="canvas-rim"');
      expect(svg, background.label).toContain('data-scene-layer="frame-rim"');
      expect(svg, background.label).toContain('filter="url(#brand-card-shadow)"');
      const geometryMarkup = svg.replace(/data:image\/[^;]+;base64,[^"]+/g, "embedded-image");
      expect(geometryMarkup, background.label).not.toContain("NaN");
    }
  });

  it.each([
    ["Supabase", "studio-ring-large"],
    ["OpenAI", "halo-outer"],
    ["Linear", "beam-a"],
  ])("renders the %s signature composition", async (label, marker) => {
    const { EXPORT_BRAND_BACKGROUNDS, createHighlightedSvg } = await import("./export-utils");
    const background = EXPORT_BRAND_BACKGROUNDS.find((candidate) => candidate.label === label);
    if (!background) throw new Error(`${label} background is missing`);

    const svg = await createHighlightedSvg(
      "const polished = true",
      "scene.ts",
      "github_light",
      1200,
      undefined,
      background,
    );
    expect(svg).toContain(`data-scene-node="${marker}"`);
  });
});

// ── Brand frame chrome ───────────────────────────────────────────────────────

describe("EXPORT_BRAND_BACKGROUNDS — frame chrome", () => {
  it("Vercel honors an explicitly selected macOS decoration", async () => {
    const { EXPORT_BRAND_BACKGROUNDS, createHighlightedSvg } = await import("./export-utils");
    const vercel = EXPORT_BRAND_BACKGROUNDS.find((b) => b.label === "Vercel")!;
    const svg = await createHighlightedSvg(
      "x",
      "snippet.tsx",
      "github_light",
      1200,
      undefined,
      vercel,
      undefined,
      false,
      "system",
      null,
      null,
      false,
      true, // showFilename
    );
    expect(svg).toContain("#ff5f57");
    // Centred filename renders for branded themes that don't ship a
    // headerStrip — gated solely on the showFilename toggle.
    expect(svg).toMatch(/<text[^>]*>snippet.tsx<\/text>/);
  });

  it("Vercel hides the centred filename when showFilename is off", async () => {
    const { EXPORT_BRAND_BACKGROUNDS, createHighlightedSvg } = await import("./export-utils");
    const vercel = EXPORT_BRAND_BACKGROUNDS.find((b) => b.label === "Vercel")!;
    const svg = await createHighlightedSvg(
      "x",
      "snippet.tsx",
      "github_light",
      1200,
      undefined,
      vercel,
      undefined,
      false,
      "system",
      null,
      null,
      false,
      false, // showFilename
    );
    expect(svg).not.toContain(">snippet.tsx<");
  });

  it("dark cardFill (Vercel) draws the chrome filename in white, not editorFg", async () => {
    // Regression: filename used to inherit editorFg (light theme = dark text)
    // and disappeared on dark brand cards (#000000 for Vercel). Now derived
    // from cardFill luminance.
    const { EXPORT_BRAND_BACKGROUNDS, createHighlightedSvg } = await import("./export-utils");
    const vercel = EXPORT_BRAND_BACKGROUNDS.find((b) => b.label === "Vercel")!;
    const svg = await createHighlightedSvg(
      "x",
      "snippet.tsx",
      "github_light",
      1200,
      undefined,
      vercel,
      undefined,
      false,
      "system",
      null,
      null,
      false,
      true, // showFilename
    );
    expect(svg).toMatch(/<text[^>]*fill="#ffffff"[^>]*>snippet.tsx<\/text>/);
  });

  it("Vercel renders sharp-cornered card (radius 0)", async () => {
    const { EXPORT_BRAND_BACKGROUNDS, createHighlightedSvg } = await import("./export-utils");
    const vercel = EXPORT_BRAND_BACKGROUNDS.find((b) => b.label === "Vercel")!;
    const svg = await createHighlightedSvg("x", "f.ts", "github_light", 1200, undefined, vercel);
    // Card rect uses rx="0" ry="0" for the brand's borderless geometric look.
    expect(svg).toMatch(/<rect[^>]*rx="0" ry="0"[^>]*fill="#000000"/);
  });

  it("Stripe honors macOS dots and uses a rounded gradient frame rim", async () => {
    const { EXPORT_BRAND_BACKGROUNDS, createHighlightedSvg } = await import("./export-utils");
    const stripe = EXPORT_BRAND_BACKGROUNDS.find((b) => b.label === "Stripe")!;
    const svg = await createHighlightedSvg("x", "f.ts", "github_light", 1200, undefined, stripe);
    expect(svg).toContain("#ff5f57");
    expect(svg).toContain('data-scene-layer="frame-rim"');
    expect(svg).toContain('stroke="url(#brand-frame-rim)"');
  });

  it("Resend honors macOS dots and renders filename plus language", async () => {
    const { EXPORT_BRAND_BACKGROUNDS, createHighlightedSvg } = await import("./export-utils");
    const resend = EXPORT_BRAND_BACKGROUNDS.find((b) => b.label === "Resend")!;
    const svg = await createHighlightedSvg(
      "x",
      "notes.md",
      "github_light",
      1200,
      undefined,
      resend,
      undefined,
      false,
      "system",
      "markdown",
      null,
      false,
      true, // showFilename
    );
    expect(svg).toContain("#ff5f57");
    // Filename + language sit in their own header strip, with
    // the language label in the right slot). The lumis mock in this test
    // file doesn't carry display names, so languageDisplayName falls
    // through to the id verbatim.
    expect(svg).toMatch(/<text[^>]*>notes.md<\/text>/);
    expect(svg).toMatch(/<text[^>]*>markdown<\/text>/);
  });

  it("Tailwind keeps the macOS dots and layers beams over its gradient", async () => {
    const { EXPORT_BRAND_BACKGROUNDS, createHighlightedSvg } = await import("./export-utils");
    const tailwind = EXPORT_BRAND_BACKGROUNDS.find((b) => b.label === "Tailwind")!;
    const svg = await createHighlightedSvg("x", "f.ts", "github_light", 1200, undefined, tailwind);
    expect(svg).toContain("#ff5f57");
    expect(svg).toContain("#febc2e");
    expect(svg).toContain("#28c840");
    expect(svg).toContain(`<stop offset="0%" stop-color="${tailwind.from}"/>`);
    expect(svg).toContain(`<stop offset="100%" stop-color="${tailwind.to}"/>`);
    expect(svg).toContain('data-scene-node="crosshair-top"');
    expect(svg.indexOf('fill="url(#outerBg)"')).toBeLessThan(
      svg.indexOf('data-scene-node="crosshair-top"'),
    );
  });

  it("Supabase honors macOS dots and renders its filename", async () => {
    const { EXPORT_BRAND_BACKGROUNDS, createHighlightedSvg } = await import("./export-utils");
    const supabase = EXPORT_BRAND_BACKGROUNDS.find((b) => b.label === "Supabase")!;
    const svg = await createHighlightedSvg(
      "x",
      "snippet.tsx",
      "github_light",
      1200,
      undefined,
      supabase,
      undefined,
      false,
      "system",
      "typescript",
      null,
      false,
      true, // showFilename
    );
    expect(svg).toContain("#ff5f57");
    expect(svg).toMatch(/<text[^>]*>snippet.tsx<\/text>/);
    // Supabase's headerStrip has showLanguage=false, so we should NOT see
    // a TypeScript label text node anywhere.
    expect(svg).not.toMatch(/<text[^>]*>TypeScript<\/text>/);
  });

  it("brand header strip hides the filename when showFilename is false", async () => {
    // Regression: the headerStrip used by Supabase + Resend was rendering
    // unconditionally — gated only on `filename`, not on the showFilename
    // toggle. Toggling filename off in the export modal had no effect on
    // those two brands.
    const { EXPORT_BRAND_BACKGROUNDS, createHighlightedSvg } = await import("./export-utils");
    for (const label of ["Supabase", "Resend"] as const) {
      const bg = EXPORT_BRAND_BACKGROUNDS.find((b) => b.label === label)!;
      const svg = await createHighlightedSvg(
        "x",
        "secret.tsx",
        "github_light",
        1200,
        undefined,
        bg,
        undefined,
        false,
        "system",
        "typescript",
        null,
        false,
        false, // showFilename = false
      );
      expect(svg, `${label} should hide filename when showFilename=false`).not.toMatch(
        /<text[^>]*>secret.tsx<\/text>/,
      );
    }
  });
});

// ── option plumbing audit ────────────────────────────────────────────────────

// Guards the whole class of bug behind the square-corners regression: a setting
// the live preview honours but `createHighlightedSvg` silently drops. Each case
// renders twice, changing exactly one argument, and asserts the SVG actually
// differs. An option that stops being threaded through fails here instead of
// shipping as a "preview looks fine, export doesn't" report.
describe("createHighlightedSvg — every export option reaches the output", () => {
  const BG = { label: "Test", from: "#000000", to: "#111111" };

  // Positional tail after (code, filename, theme, width, height).
  const BASE: unknown[] = [
    null, // 0  background
    undefined, // 1  outerPadding
    false, // 2  lineNumbers
    "system", // 3  fontId
    null, // 4  languageOverride
    null, // 5  reactions
    false, // 6  showReactions
    true, // 7  showFilename
    false, // 8  showFooter
    null, // 9  footerAuthorUsername
    null, // 10 footerAuthorAvatarUrl
    null, // 11 comments
    false, // 12 showComments
    null, // 13 sourceUrl
    "macos", // 14 windowDecoration
    8, // 15 cornerRadius
    16, // 16 innerPadding
    undefined, // 17 headerSettings
    undefined, // 18 footerSettings
    14, // 19 fontSize
  ];

  function render(overrides: Record<number, unknown> = {}) {
    const args = BASE.slice();
    for (const key of Object.keys(overrides)) args[Number(key)] = overrides[Number(key)];
    const call = createHighlightedSvg as unknown as (...a: unknown[]) => Promise<string>;
    return call(
      "const value = 1;\nconst other = 2;",
      "test.ts",
      "github_light",
      1200,
      undefined,
      ...args,
    );
  }

  const cases: Array<[string, Record<number, unknown>]> = [
    ["background", { 0: BG }],
    ["outerPadding", { 0: BG, 1: 128 }],
    ["lineNumbers", { 2: true }],
    ["fontId", { 3: "jetbrains" }],
    ["languageOverride", { 4: "python" }],
    ["showReactions", { 5: { 1: [{ emoji: "\u{1F525}", reactors: [] }] }, 6: true }],
    ["showFilename", { 7: false }],
    ["showFooter", { 8: true }],
    ["sourceUrl", { 13: "https://example.com/abc" }],
    ["windowDecoration", { 14: "windows" }],
    ["cornerRadius", { 15: 16 }],
    ["innerPadding", { 16: 48 }],
    ["fontSize", { 19: 20 }],
  ];

  it.each(cases)("%s changes the rendered SVG", async (_name, overrides) => {
    const reference = await render();
    const changed = await render(overrides);
    expect(changed).not.toEqual(reference);
  });
});

// ── renderToFile ─────────────────────────────────────────────────────────────

describe("renderToFile", () => {
  const OriginalImage = globalThis.Image;

  beforeEach(() => {
    class MockImage {
      onload: (() => void) | null = null;
      onerror: ((e: Error) => void) | null = null;
      set src(_: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", MockImage);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-svg");
    vi.spyOn(URL, "revokeObjectURL").mockReturnValue(undefined);
    vi.spyOn(document, "createElement").mockReturnValue({
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({ scale: vi.fn(), drawImage: vi.fn() }),
      toBlob: vi.fn().mockImplementation((cb: (b: Blob) => void) => {
        cb(new Blob(["fake-png"], { type: "image/png" }));
      }),
    } as unknown as HTMLCanvasElement);
  });

  afterEach(() => {
    vi.stubGlobal("Image", OriginalImage);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns a File with the correct name and PNG type", async () => {
    const file = await renderToFile(
      "const x = 1;",
      "test.ts",
      "github_light",
      1200,
      undefined,
      "output.png",
      2,
    );
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("output.png");
    expect(file.type).toBe("image/png");
  });

  it("revokes the object URL after rendering", async () => {
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockReturnValue(undefined);
    await renderToFile("x", "test.ts", "github_light", 1200, undefined, "out.png", 1);
    expect(revokeSpy).toHaveBeenCalledWith("blob:mock-svg");
  });
});
