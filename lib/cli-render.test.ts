import { describe, it, expect } from "vitest";
import { renderCliSnippetAssets, svgIntrinsicWidth, OG_WIDTH, OG_HEIGHT } from "./cli-render";
import { parseCliAppearance } from "./cli-appearance";

const CODE = `export function greet(name: string) {
  return \`Hello, \${name}!\`;
}`;

function pngSize(bytes: Uint8Array): { width: number; height: number } {
  // IHDR is always the first chunk: 8-byte signature, 4-byte length, 4-byte
  // type, then width and height as big-endian uint32s.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function isPng(bytes: Uint8Array): boolean {
  return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
}

describe("svgIntrinsicWidth", () => {
  it("reads the width attribute off the generated markup", () => {
    expect(svgIntrinsicWidth('<svg width="742" height="300">', 1200)).toBe(742);
  });

  it("falls back when the attribute is missing", () => {
    expect(svgIntrinsicWidth("<svg>", 1200)).toBe(1200);
  });

  it("falls back when the attribute is not a positive integer", () => {
    expect(svgIntrinsicWidth('<svg width="0">', 1200)).toBe(1200);
    expect(svgIntrinsicWidth('<svg width="abc">', 1200)).toBe(1200);
  });
});

describe("renderCliSnippetAssets", () => {
  it("renders a real PNG pair and an SVG for a default composition", async () => {
    const result = await renderCliSnippetAssets({
      code: CODE,
      filename: "greet.ts",
      language: "typescript",
      appearance: parseCliAppearance({}),
      authorUsername: "testuser",
      authorAvatarUrl: null,
      sourceUrl: "https://supagist.app/greet-ts-abc123",
    });

    expect(isPng(result.canonicalPng)).toBe(true);
    expect(isPng(result.ogPng)).toBe(true);
    expect(result.svg.startsWith("<svg")).toBe(true);
  }, 60_000);

  it("emits OG images at exactly 1200x630 so social platforms accept them", async () => {
    const result = await renderCliSnippetAssets({
      code: CODE,
      filename: "greet.ts",
      language: "typescript",
      appearance: parseCliAppearance({}),
      authorUsername: "testuser",
      authorAvatarUrl: null,
    });

    expect(pngSize(result.ogPng)).toEqual({ width: OG_WIDTH, height: OG_HEIGHT });
  }, 60_000);

  it("scales the canonical PNG by the requested pixel ratio", async () => {
    const base = {
      code: CODE,
      filename: "greet.ts",
      language: "typescript",
      authorUsername: "testuser",
      authorAvatarUrl: null,
    };
    const at2x = await renderCliSnippetAssets({
      ...base,
      appearance: parseCliAppearance({ pixelRatio: 2 }),
    });
    const at4x = await renderCliSnippetAssets({
      ...base,
      appearance: parseCliAppearance({ pixelRatio: 4 }),
    });

    expect(pngSize(at4x.canonicalPng).width).toBe(pngSize(at2x.canonicalPng).width * 2);
  }, 60_000);

  it("actually rasterises glyphs rather than an empty card", async () => {
    // Regression guard for the font pipeline: resvg cannot read woff2, so if
    // the woff2 -> sfnt conversion regresses every render still succeeds but
    // comes back as a blank rectangle. A text-bearing card compresses to
    // meaningfully more bytes than an empty one of the same size.
    const withText = await renderCliSnippetAssets({
      code: CODE,
      filename: "greet.ts",
      language: "typescript",
      appearance: parseCliAppearance({ pixelRatio: 2 }),
      authorUsername: "testuser",
      authorAvatarUrl: null,
    });
    const empty = await renderCliSnippetAssets({
      code: "\n\n\n",
      filename: "greet.ts",
      language: "typescript",
      appearance: parseCliAppearance({ pixelRatio: 2 }),
      authorUsername: "testuser",
      authorAvatarUrl: null,
    });

    expect(withText.canonicalPng.byteLength).toBeGreaterThan(empty.canonicalPng.byteLength * 1.5);
  }, 60_000);

  it("applies a brand preset's background to the canonical export", async () => {
    const branded = await renderCliSnippetAssets({
      code: CODE,
      filename: "greet.ts",
      language: "typescript",
      appearance: parseCliAppearance({ brand: "supabase" }),
      authorUsername: "testuser",
      authorAvatarUrl: null,
    });
    const plain = await renderCliSnippetAssets({
      code: CODE,
      filename: "greet.ts",
      language: "typescript",
      appearance: parseCliAppearance({ background: null }),
      authorUsername: "testuser",
      authorAvatarUrl: null,
    });

    // The brand canvas pads the card, so the branded export is strictly wider.
    expect(pngSize(branded.canonicalPng).width).toBeGreaterThan(pngSize(plain.canonicalPng).width);
  }, 60_000);

  it("embeds the snippet URL as PNG Source metadata", async () => {
    const result = await renderCliSnippetAssets({
      code: CODE,
      filename: "greet.ts",
      language: "typescript",
      appearance: parseCliAppearance({}),
      authorUsername: "testuser",
      authorAvatarUrl: null,
      sourceUrl: "https://supagist.app/greet-ts-abc123",
    });

    const text = Buffer.from(result.ogPng).toString("latin1");
    expect(text).toContain("Source");
    expect(text).toContain("https://supagist.app/greet-ts-abc123");
  }, 60_000);
});
