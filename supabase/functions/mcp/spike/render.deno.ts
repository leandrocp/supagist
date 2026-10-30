import { strict as assert } from "node:assert";
import {
  renderSnippet,
  supportedLanguages,
  supportedThemes,
  appearanceOptions,
} from "../render.ts";
import { renderFixture } from "./fixtures.ts";
import { loadImageDataUrl } from "./assets.ts";

// Keep the fault-injection cases independent of parsers cached by other local
// Deno runs. This affects only this test worker, not the public renderer.
Reflect.deleteProperty(globalThis, "caches");

Deno.test("public renderer: all fixtures, SVG only, 1x/2x, real highlighting and assets", async () => {
  for (const fixture of ["plain", "vercel", "avatars"] as const) {
    let previousWidth = 0;
    let previousHeight = 0;
    for (const pixelRatio of [1, 2] as const) {
      const svg = await renderSnippet(renderFixture(fixture, "svg", pixelRatio));
      const text = new TextDecoder().decode(svg.bytes);
      assert.equal(svg.svg, text);
      assert.equal(svg.contentType, "image/svg+xml");
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
      assert.ok(text.includes(`width="${svg.width}" height="${svg.height}"`));
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
  await assert.rejects(() => renderSnippet({ ...input, format: "png" as "svg" }), /svg/);
  await assert.rejects(
    () => loadImageDataUrl("https://example.com/avatar.png"),
    /bundled image paths/,
  );
});

Deno.test("Supabase brand is a full scene, and explicit controls override preset defaults", async () => {
  const code = 'const greeting = "Olá, Supagist!";\nconsole.log(greeting);';
  const branded = await renderSnippet({ code, brand: "supabase", filename: "greeting.js" });
  const syntaxOnly = await renderSnippet({ code, theme: "supabase-dark" });
  assert.match(branded.svg, /#3ECF8E/);
  assert.match(branded.svg, /brand-card-shadow/);
  assert.match(branded.svg, /font-family:'Geist Mono'/);
  assert.match(branded.svg, /greeting.js/);
  assert.doesNotMatch(branded.svg, /#ff5f57/);
  assert.doesNotMatch(syntaxOnly.svg, /brand-card-shadow/);
  const custom = await renderSnippet({
    code,
    brand: "supabase",
    background: null,
    theme: "github_light",
    fontId: "fira",
    filename: "greeting.js",
    language: null,
    fontSize: 18,
    lineNumbers: true,
    innerPadding: 32,
    cornerRadius: 16,
    windowDecoration: "windows",
    header: { showFilename: false, showLanguage: true, languagePosition: "left" },
    footer: {
      enabled: true,
      showTheme: false,
      showAuthor: true,
      showCharCount: true,
      alignment: "right",
    },
    author: "Leandro",
    comments: { 2: { body: "Visible comment", author: "Ada" } },
    reactions: { 1: [{ emoji: "+1", reactors: [{ username: "Grace" }] }] },
  });
  assert.doesNotMatch(custom.svg, /brand-card-shadow/);
  assert.match(custom.svg, /font-family:'Fira Code'/);
  assert.match(custom.svg, /font-family:'Hack'/);
  assert.match(custom.svg, /&quot;Fira Code&quot;,&quot;Hack&quot;/);
  assert.match(custom.svg, /font-size="18"/);
  assert.match(custom.svg, /Leandro/);
  assert.match(custom.svg, /Visible comment/);
  assert.match(custom.svg, />\+1</);
  assert.match(custom.svg, /rx="16"/);
  assert.doesNotMatch(custom.svg, /greeting.js/);
  assert.doesNotMatch(custom.svg, /github_light/);
  const hidden = await renderSnippet({
    code,
    header: { enabled: false },
    footer: { enabled: false },
    comments: { 1: { body: "Hidden comment" } },
    showComments: false,
    reactions: { 1: [{ emoji: "+1", reactors: [{ username: "Grace" }] }] },
    showReactions: false,
  });
  assert.doesNotMatch(hidden.svg, /Hidden comment|>\+1</);
});

Deno.test("every advertised brand embeds its font and required pattern; layout limits reject truncation", async () => {
  for (const brand of appearanceOptions.brands) {
    const result = await renderSnippet({ code: "const answer = 42;", brand: brand.id });
    assert.match(result.svg, /data:font\/ttf;base64,/);
    assert.match(result.svg, /brand-card-shadow/);
    if (["tailwind", "resend"].includes(brand.id))
      assert.match(result.svg, /data:image\/png;base64,/);
  }
  await assert.rejects(() => renderSnippet({ code: "x".repeat(3301) }), /30 visual rows/);
  const code = Array(30).fill("x").join("\n");
  await assert.rejects(
    () => renderSnippet({ code, comments: { 1: { body: "one extra row" } } }),
    /30 visual rows/,
  );
  const fits = await renderSnippet({
    code,
    comments: { 1: { body: "hidden" } },
    showComments: false,
  });
  assert.doesNotMatch(fits.svg, /hidden|>…</);
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
