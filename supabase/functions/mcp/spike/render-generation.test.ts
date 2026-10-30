import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../../../../", import.meta.url);
const sha256 = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");

describe("M0 generated renderer provenance", () => {
  it("ships a local browser-only vendor graph with exact versions and output integrity", async () => {
    const vendor = new URL("./generated/vendor/", import.meta.url);
    const manifest = JSON.parse(readFileSync(new URL("vendor-manifest.json", vendor), "utf8"));
    expect(manifest.versions["@lumis-sh/lumis"]).toBe("0.9.0");
    expect(manifest.versions["@lumis-sh/themes"]).toBe("0.4.0");
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

  it("keeps every lazy theme's public data identical to themes 0.4.0", async () => {
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
  it("ships digest-matched TTF and actual PNG avatars, but no rasterizer or parser binaries", () => {
    const assets = new URL("../assets/", import.meta.url);
    const manifest = JSON.parse(readFileSync(new URL("manifest.json", assets), "utf8"));
    for (const [name, metadata] of Object.entries(manifest)) {
      expect(sha256(readFileSync(new URL(name, assets))), name).toBe(
        (metadata as { sha256: string }).sha256,
      );
    }
    expect(readdirSync(assets).filter((name) => name.endsWith(".wasm"))).toEqual([]);
    for (const name of ["avatar-1.png", "avatar-2.png"])
      expect([...readFileSync(new URL(name, assets)).subarray(0, 8)]).toEqual([
        137, 80, 78, 71, 13, 10, 26, 10,
      ]);
  });
});
