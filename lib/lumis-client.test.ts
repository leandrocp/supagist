import { readFile } from "node:fs/promises";
import { afterAll, describe, expect, it, vi } from "vitest";
import web from "@lumis-sh/wasm-bundle-web";
import system from "@lumis-sh/wasm-bundle-system";
import backend from "@lumis-sh/wasm-bundle-backend";
import { htmlInline } from "@lumis-sh/lumis/formatters";
import githubDark from "@lumis-sh/themes/github_dark";
import { clientHighlighterPromise } from "./lumis-client";

// Node fetch cannot read file: URLs. Supply the real installed WASM bytes at
// that I/O boundary; forbid network fallback, including a newer CDN manifest.
// Parsing and rendering still use Lumis's browser runtime.
const fileFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
  const url = new URL(input instanceof Request ? input.url : input);
  if (url.protocol === "file:") return new Response(await readFile(url));
  throw new Error(`Unexpected network fetch: ${url}`);
});
afterAll(() => fileFetch.mockRestore());

describe("Lumis browser bundle", () => {
  it("registers the requested bundles and extras without eagerly compiling every parser", async () => {
    const highlighter = await clientHighlighterPromise;
    expect(highlighter.registeredLanguages).toEqual(
      expect.arrayContaining([
        ...Object.keys(web),
        ...Object.keys(system),
        ...Object.keys(backend),
        "xml",
        "yaml",
        "markdown",
        "markdown_inline",
      ]),
    );
    expect(highlighter.languages).not.toContain("python");
  });

  it("ships compatible language exports for every lazy bundle entry", async () => {
    for (const [id, load] of Object.entries({ ...web, ...system, ...backend })) {
      const language = await load();
      expect(language, id).toBeDefined();
      expect(language.id, id).toBe(id);
    }
  });

  it.each([
    ["typescript", "const answer: number = 42;"],
    ["python", 'print("hello")'],
    ["cmake", "project(supagist)"],
    ["elixir", 'IO.puts("hello")'],
    ["xml", '<example title="hello" />'],
    ["yaml", "enabled: true"],
    ["markdown", "**bold**"],
    ["markdown_inline", "**bold**"],
  ])("highlights %s with the installed parser", async (language, code) => {
    const highlighter = await clientHighlighterPromise;
    await highlighter.loadLanguage(language);
    const html = highlighter.highlight(code, htmlInline({ language, theme: githubDark }));
    expect(html).toContain("<span");
    expect(html).toContain("color:");
  });
});
