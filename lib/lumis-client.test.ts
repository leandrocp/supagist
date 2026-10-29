import { readFile } from "node:fs/promises";
import { afterAll, describe, expect, it, vi } from "vitest";
import full from "@lumis-sh/wasm-bundle-full";
import { htmlInline } from "@lumis-sh/lumis/formatters";
import githubDark from "@lumis-sh/themes/github_dark";
import { clientHighlighterPromise } from "./lumis-client";

// Node fetch cannot read file: URLs. Supply the real installed WASM bytes at
// that I/O boundary; parsing and rendering still use Lumis's browser runtime.
const fetch = globalThis.fetch;
const fileFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input);
  if (url.protocol === "file:") return new Response(await readFile(url));
  return fetch(input, init);
});
afterAll(() => fileFetch.mockRestore());

describe("Lumis browser bundle", () => {
  it("registers the full catalog without eagerly compiling every parser", async () => {
    const highlighter = await clientHighlighterPromise;
    expect(highlighter.registeredLanguages).toEqual(expect.arrayContaining(Object.keys(full)));
    expect(highlighter.languages).not.toContain("python");
  });

  it("ships compatible language exports for every lazy bundle entry", async () => {
    for (const [id, load] of Object.entries(full)) {
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
    ["markdown", "**bold**"],
  ])("highlights %s with the installed parser", async (language, code) => {
    const highlighter = await clientHighlighterPromise;
    await highlighter.loadLanguage(language);
    const html = highlighter.highlight(code, htmlInline({ language, theme: githubDark }));
    expect(html).toContain("<span");
    expect(html).toContain("color:");
  });
});
