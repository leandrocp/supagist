import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  installExportAssetLoader,
  loadExportFontFiles,
  rasterizeSvg,
  readPublicAsset as loader,
  safePublicRelativePath,
} from "./export-server";
import { EXPORT_FONTS } from "./export-utils";

describe("readPublicAsset", () => {
  it("reads a bundled font out of public/", async () => {
    const asset = await loader("/fonts/jetbrains-mono.woff2");
    const onDisk = await readFile(join(process.cwd(), "public/fonts/jetbrains-mono.woff2"));
    expect(asset?.contentType).toBe("font/woff2");
    expect(asset?.bytes.byteLength).toBe(onDisk.byteLength);
  });

  it("labels brand artwork with the right content type", async () => {
    expect((await loader("/brands/supabase.svg"))?.contentType).toBe("image/svg+xml");
    expect((await loader("/brands/tailwind-beams.png"))?.contentType).toBe("image/png");
  });

  it("refuses to traverse out of public/", async () => {
    // The loader runs inside a request-scoped render, so this is a hard
    // boundary, not just tidiness.
    expect(await loader("/../package.json")).toBeNull();
    expect(await loader("/fonts/../../package.json")).toBeNull();
  });

  it("refuses a path that is not root-relative", async () => {
    expect(await loader("fonts/jetbrains-mono.woff2")).toBeNull();
    expect(await loader("https://example.com/font.woff2")).toBeNull();
  });

  it("refuses a null byte in the path", async () => {
    expect(await loader("/fonts/jetbrains-mono.woff2\0.txt")).toBeNull();
  });

  it("returns null for a missing file rather than throwing", async () => {
    expect(await loader("/fonts/does-not-exist.woff2")).toBeNull();
  });

  it("is idempotent, so repeated renders do not reinstall it", () => {
    expect(() => {
      installExportAssetLoader();
      installExportAssetLoader();
    }).not.toThrow();
  });
});

describe("safePublicRelativePath", () => {
  it("strips the leading slash off an in-bounds path", () => {
    expect(safePublicRelativePath("/fonts/hack.woff2")).toBe("fonts/hack.woff2");
  });

  it("rejects traversal, relative, and null-byte paths", () => {
    expect(safePublicRelativePath("/../package.json")).toBeNull();
    expect(safePublicRelativePath("/fonts/../../secrets")).toBeNull();
    expect(safePublicRelativePath("fonts/hack.woff2")).toBeNull();
    expect(safePublicRelativePath("/fonts/hack\0.woff2")).toBeNull();
  });

  it("rejects the public root itself", () => {
    expect(safePublicRelativePath("/")).toBeNull();
  });
});

describe("loadExportFontFiles", () => {
  it("converts every bundled woff2 into a font resvg can read", async () => {
    const files = await loadExportFontFiles();
    const expected = EXPORT_FONTS.filter((font) => font.file).length;
    expect(files).toHaveLength(expected);
  });

  it("produces real sfnt files, not the woff2 originals", async () => {
    // resvg silently renders nothing for woff2, so the magic number is the
    // difference between a highlighted card and a blank rectangle.
    const [first] = await loadExportFontFiles();
    const magic = (await readFile(first)).subarray(0, 4).toString("hex");
    expect(["00010000", "74727565", "4f54544f"]).toContain(magic);
  });

  it("caches the conversion across calls", async () => {
    const a = await loadExportFontFiles();
    const b = await loadExportFontFiles();
    expect(a).toBe(b);
  });
});

describe("rasterizeSvg", () => {
  const svg = (width: number, height: number) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="#101010"/>` +
    `<text x="10" y="30" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="16" fill="#4ade80">const x = 42;</text>` +
    `</svg>`;

  function pngWidth(bytes: Uint8Array) {
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(16);
  }

  it("renders at the requested scale", async () => {
    const png = await rasterizeSvg(svg(400, 120), { scale: 2, width: 400 });
    expect(pngWidth(png)).toBe(800);
  });

  it("rounds a fractional output width up rather than truncating", async () => {
    const png = await rasterizeSvg(svg(401, 120), { scale: 1.5, width: 401 });
    expect(pngWidth(png)).toBe(Math.ceil(401 * 1.5));
  });

  it("resolves the CSS monospace stack used by the System font option", async () => {
    // `EXPORT_FONTS[0].family` is a CSS stack with no bundled face; without a
    // monospaceFamily fallback resvg draws no glyphs at all.
    const withText = await rasterizeSvg(svg(400, 120), { scale: 1, width: 400 });
    const blank = await rasterizeSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120"><rect width="400" height="120" fill="#101010"/></svg>`,
      { scale: 1, width: 400 },
    );
    expect(withText.byteLength).toBeGreaterThan(blank.byteLength);
  });
});
