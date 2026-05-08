// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockHighlighter } = vi.hoisted(() => ({
  mockHighlighter: {
    loadLanguage: vi.fn(),
    highlightIter: vi.fn(),
  },
}));

vi.mock("@lumis-sh/lumis", () => ({
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

vi.mock("@/lib/lumis-client", () => ({
  clientHighlighterPromise: Promise.resolve(mockHighlighter),
}));

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
} from "./export-utils";
import type { SvgToken } from "./export-utils";

// Re-apply highlighter implementations before each test so mock call counts
// are fresh and implementations are always set even after vi.clearAllMocks().
beforeEach(() => {
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

// ── Brand frame chrome ───────────────────────────────────────────────────────

describe("EXPORT_BRAND_BACKGROUNDS — frame chrome", () => {
  it("Vercel hides the macOS dots but shows the centred filename when toggle is on", async () => {
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
    expect(svg).not.toContain("#ff5f57"); // red dot still hidden
    // Centred filename now renders for branded themes that don't ship a
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

  it("Stripe hides the dots, has a rounded card with a brand-blue stroke", async () => {
    const { EXPORT_BRAND_BACKGROUNDS, createHighlightedSvg } = await import("./export-utils");
    const stripe = EXPORT_BRAND_BACKGROUNDS.find((b) => b.label === "Stripe")!;
    const svg = await createHighlightedSvg("x", "f.ts", "github_light", 1200, undefined, stripe);
    expect(svg).not.toContain("#ff5f57");
    expect(svg).toMatch(/<rect[^>]*rx="8"[^>]*stroke="#0F395E"/);
  });

  it("Resend hides the dots and renders a left-aligned filename strip with the language", async () => {
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
    expect(svg).not.toContain("#ff5f57");
    // Filename + language sit in their own header strip (left-aligned, with
    // the language label in the right slot). The lumis mock in this test
    // file doesn't carry display names, so languageDisplayName falls
    // through to the id verbatim.
    expect(svg).toMatch(/<text[^>]*>notes.md<\/text>/);
    expect(svg).toMatch(/<text[^>]*>markdown<\/text>/);
  });

  it("Tailwind keeps the macOS dots", async () => {
    const { EXPORT_BRAND_BACKGROUNDS, createHighlightedSvg } = await import("./export-utils");
    const tailwind = EXPORT_BRAND_BACKGROUNDS.find((b) => b.label === "Tailwind")!;
    const svg = await createHighlightedSvg("x", "f.ts", "github_light", 1200, undefined, tailwind);
    expect(svg).toContain("#ff5f57");
    expect(svg).toContain("#febc2e");
    expect(svg).toContain("#28c840");
  });

  it("Supabase hides dots and renders a left-aligned filename strip without a language label", async () => {
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
    expect(svg).not.toContain("#ff5f57");
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
