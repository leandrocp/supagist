import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { assetBytes, loadFontBase64, loadImageDataUrl } from "./assets";

const root = new URL("../../../../", import.meta.url);
const sha256 = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const fonts = {
  "/fonts/jetbrains-mono.woff2": "JetBrainsMono-Regular.ttf",
  "/fonts/geist-mono.woff2": "GeistMono.ttf",
  "/fonts/fira-code.woff2": "FiraCode.ttf",
  "/fonts/hack.woff2": "Hack.ttf",
};
const images = {
  "m0:avatar-1": "avatar-1.png",
  "m0:avatar-2": "avatar-2.png",
  "/brands/tailwind-beams.png": "tailwind-beams.png",
  "/brands/resend-dark.png": "resend-dark.png",
  "/brands/lumis-icon-light.svg": "lumis-icon-light.svg",
  "/brands/lumis-icon-dark.svg": "lumis-icon-dark.svg",
};

afterEach(() => vi.unstubAllGlobals());

describe("Edge asset allowlist", () => {
  it("embeds the exact corresponding TTF for all four app font paths", async () => {
    vi.stubGlobal("Deno", { readFile });
    const embedded = new Set<string>();
    for (const [path, name] of Object.entries(fonts)) {
      const encoded = await loadFontBase64(path);
      expect(
        Buffer.from(encoded, "base64").equals(
          readFileSync(new URL(`../assets/${name}`, import.meta.url)),
        ),
        name,
      ).toBe(true);
      embedded.add(encoded);
      expect(await loadFontBase64(path)).toBe(encoded);
    }
    expect(embedded.size).toBe(4);
  });

  it("embeds only the fixed brand images and original M0 avatars", async () => {
    vi.stubGlobal("Deno", { readFile });
    for (const [path, name] of Object.entries(images)) {
      const type = name.endsWith(".svg") ? "image/svg+xml" : "image/png";
      expect(await loadImageDataUrl(path)).toBe(
        `data:${type};base64,${readFileSync(new URL(`../assets/${name}`, import.meta.url)).toString("base64")}`,
      );
    }
  });

  it("rejects URLs, traversal, inherited property names and unbundled local paths", async () => {
    const read = vi.fn();
    vi.stubGlobal("Deno", { readFile: read });
    for (const path of [
      "https://example.com/brands/tailwind-beams.png",
      "//example.com/avatar.png",
      "data:image/png;base64,AA==",
      "/brands/../brands/tailwind-beams.png",
      "/brands/tailwind-beams.png?foo=1",
      "/brands/supabase.svg",
      "m0:avatar-3",
      "toString",
      "__proto__",
    ]) {
      await expect(loadImageDataUrl(path)).rejects.toThrow();
      await expect(loadFontBase64(path)).rejects.toThrow();
      expect(() => assetBytes(path)).toThrow();
    }
    expect(read).not.toHaveBeenCalled();
  });
});

describe("M0 generated renderer provenance", () => {
  it("ships a local browser-only vendor graph with exact versions and output integrity", async () => {
    const vendor = new URL("./generated/vendor/", import.meta.url);
    const manifest = JSON.parse(readFileSync(new URL("vendor-manifest.json", vendor), "utf8"));
    expect(manifest.versions["@lumis-sh/lumis"]).toBe("0.10.1");
    expect(manifest.versions["@lumis-sh/themes"]).toBe("0.4.3");
    expect(manifest.versions["@resvg/resvg-wasm"]).toBeUndefined();
    expect(readdirSync(vendor)).not.toContain("resvg.js");
    for (const [name, metadata] of Object.entries(manifest.outputs)) {
      const bytes = readFileSync(new URL(name, vendor));
      expect(sha256(bytes), name).toBe((metadata as { sha256: string }).sha256);
      expect(name).not.toMatch(/\.node$|\.wasm$/);
      if (name.endsWith(".js")) expect(bytes.toString(), name).not.toContain("npm:");
    }
    for (const [name, hash] of Object.entries(manifest.sources)) {
      expect(sha256(readFileSync(new URL(name, root))), name).toBe(hash);
      expect(name).not.toContain("lumis-native");
    }
    expect(readFileSync(new URL("../assets/vendor-licenses.txt", import.meta.url), "utf8")).toBe(
      readFileSync(new URL("vendor-licenses.txt", vendor), "utf8"),
    );
    const { runtimeKind } = await import("./generated/vendor/lumis.js");
    expect(runtimeKind()).toBe("wasm");
  });

  it("keeps every lazy theme's public data identical to themes 0.4.3", async () => {
    const { themes } = await import("./generated/themes.js");
    const names = readdirSync(new URL("node_modules/@lumis-sh/themes/dist/json/", root))
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.slice(0, -5))
      .sort();
    expect(Object.keys(themes).sort()).toEqual(names);
    for (const name of names) {
      const expected = JSON.parse(
        readFileSync(new URL(`node_modules/@lumis-sh/themes/dist/json/${name}.json`, root), "utf8"),
      );
      expect(
        (await (themes as Record<string, () => Promise<{ default: unknown }>>)[name]()).default,
        name,
      ).toEqual(expected);
    }
  });

  it("matches every original app source instead of silently drifting", () => {
    const sources = JSON.parse(
      readFileSync(new URL("./generated/sources.json", import.meta.url), "utf8"),
    );
    for (const [file, digest] of Object.entries(sources))
      expect(sha256(readFileSync(new URL(file, root))), file).toBe(digest);
  });
  it("ships digest-matched fonts and PNGs with source integrity and font licenses", () => {
    const assets = new URL("../assets/", import.meta.url);
    const manifest = JSON.parse(readFileSync(new URL("manifest.json", assets), "utf8"));
    for (const [name, metadata] of Object.entries(manifest)) {
      const entry = metadata as {
        sha256: string;
        bytes: number;
        source?: string;
        sourceSha256?: string;
      };
      const bytes = readFileSync(new URL(name, assets));
      expect(sha256(bytes), name).toBe(entry.sha256);
      expect(bytes.byteLength, name).toBe(entry.bytes);
      if (entry.source)
        expect(sha256(readFileSync(new URL(entry.source, root))), entry.source).toBe(
          entry.sourceSha256,
        );
    }
    expect(readdirSync(assets).filter((name) => name.endsWith(".wasm"))).toEqual([]);
    for (const name of Object.values(images).filter((name) => name.endsWith(".png")))
      expect([...readFileSync(new URL(name, assets)).subarray(0, 8)]).toEqual([
        137, 80, 78, 71, 13, 10, 26, 10,
      ]);
    for (const name of [
      "tailwind-beams.png",
      "resend-dark.png",
      "lumis-icon-light.svg",
      "lumis-icon-dark.svg",
    ]) {
      expect(manifest[name].source).toBe(`public/brands/${name}`);
      expect(
        readFileSync(new URL(name, assets)).equals(
          readFileSync(new URL(`public/brands/${name}`, root)),
        ),
        name,
      ).toBe(true);
    }
    for (const [path, name] of Object.entries(fonts)) {
      expect([...readFileSync(new URL(name, assets)).subarray(0, 4)]).toEqual([0, 1, 0, 0]);
      const entry = manifest[name];
      const license = readFileSync(new URL(entry.license, assets), "utf8");
      expect(license).toContain("Copyright");
      expect(license).toContain(
        name === "Hack.ttf" ? "BITSTREAM VERA LICENSE" : "OPEN FONT LICENSE",
      );
      if (name !== "JetBrainsMono-Regular.ttf") {
        expect(entry.source).toBe(`public${path}`);
        expect(entry.conversion).toContain("fonttools==4.60.1");
        expect(entry.conversion).toContain("recalcTimestamp=False");
      }
    }
  });
});
