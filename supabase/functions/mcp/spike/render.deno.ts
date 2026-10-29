import { strict as assert } from "node:assert";
import { renderSnippet, supportedLanguages, supportedThemes } from "../render.ts";
import { renderFixture } from "./fixtures.ts";
import { loadImageDataUrl } from "./assets.ts";

// Keep the fault-injection cases independent of parsers cached by other local
// Deno runs. This affects only this test worker, not the public renderer.
Reflect.deleteProperty(globalThis, "caches");

Deno.test("public renderer: all fixtures, SVG/PNG, 1x/2x, real highlighting and assets", async () => {
  for (const fixture of ["plain", "vercel", "avatars"] as const) {
    let previousWidth = 0;
    let previousHeight = 0;
    for (const pixelRatio of [1, 2] as const) {
      const svg = await renderSnippet(renderFixture(fixture, "svg", pixelRatio));
      const text = new TextDecoder().decode(svg.bytes);
      assert.equal(svg.svg, text);
      assert.equal(svg.png, undefined);
      assert.match(text, /data:font\/ttf;base64,/);
      assert.match(text, /format\('truetype'\)/);
      assert.match(text, /<tspan fill="#[\da-f]+">export<\/tspan>/i);
      assert.ok(
        new Set([...text.matchAll(/<tspan fill="([^"]+)"/g)].map((match) => match[1])).size > 2,
      );
      assert.equal(text.includes("brand-card-shadow"), fixture !== "plain");
      if (fixture !== "plain") assert.match(text, /<feDropShadow[^>]*stdDeviation="17"/);
      if (fixture === "avatars") {
        assert.match(text, /data:image\/png;base64,iVBOR/);
        assert.match(text, /value30/);
        assert.match(text, /fill="url\(#avatar-/);
      }
      const png = await renderSnippet(renderFixture(fixture, "png", pixelRatio));
      assert.equal(png.png, png.bytes);
      assert.deepEqual([...png.bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      const view = new DataView(png.bytes.buffer, png.bytes.byteOffset);
      assert.equal(view.getUint32(16), svg.width);
      assert.equal(view.getUint32(20), svg.height);
      assert.equal(png.width, svg.width);
      assert.ok(png.bytes.length > 2000);
      if (pixelRatio === 2) {
        assert.equal(svg.width, previousWidth * 2);
        assert.equal(svg.height, previousHeight * 2);
      }
      previousWidth = svg.width;
      previousHeight = svg.height;
    }
  }
});

Deno.test("invalid parsers/themes/ratios and remote avatars fail rather than silently degrading", async () => {
  const input = renderFixture("plain", "svg", 1);
  assert.ok(supportedLanguages.includes("typescript"));
  assert.ok(supportedThemes.includes("github_dark"));
  await assert.rejects(() => renderSnippet({ ...input, language: "m0-missing-parser" }));
  await assert.rejects(() => renderSnippet({ ...input, theme: "m0-missing-theme" }));
  await assert.rejects(() => renderSnippet({ ...input, pixelRatio: 3 as 1 }), /pixelRatio/);
  await assert.rejects(() => loadImageDataUrl("https://example.com/avatar.png"), /refuses remote/);
});

Deno.test("runtime parser integrity and network failures are surfaced, never plaintext", async () => {
  const originalFetch = globalThis.fetch;
  let intercepted = 0;
  globalThis.fetch = (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.endsWith("/tree-sitter-json.wasm")) {
      intercepted++;
      return Promise.resolve(new Response(new Uint8Array([0, 1, 2, 3])));
    }
    if (url.endsWith("/tree-sitter-python.wasm")) {
      intercepted++;
      return Promise.reject(new Error("M0 test: parser network unavailable"));
    }
    return originalFetch(input, init);
  };
  try {
    const input = renderFixture("plain", "svg", 1);
    await assert.rejects(
      () => renderSnippet({ ...input, language: "json", code: '{"answer":42}' }),
      /integrity/,
    );
    await assert.rejects(
      () => renderSnippet({ ...input, language: "python", code: "answer = 42" }),
      /network unavailable/,
    );
    assert.equal(intercepted, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
