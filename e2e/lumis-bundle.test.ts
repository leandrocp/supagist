import { test, expect } from "@playwright/test";
import web from "@lumis-sh/wasm-bundle-web";
import system from "@lumis-sh/wasm-bundle-system";
import backend from "@lumis-sh/wasm-bundle-backend";

// Real syntax and a recognizable token, not arbitrary text that could silently
// succeed through the editor's plain-text fallback. Each case gets a cold page.
const samples: Record<string, [code: string, token: string]> = {
  asm: ["mov eax, 42", "42"],
  bash: ['echo "hello"', '"hello"'],
  c: ["int answer = 42;", "int"],
  cmake: ["project(supagist)", "project"],
  cpp: ["int answer = 42;", "int"],
  csharp: ["public class Example {}", "public"],
  css: [".example { color: red; }", "color"],
  elixir: ["defmodule Example do\nend", "defmodule"],
  erlang: ["-module(example).", "-module"],
  go: ["package main", "package"],
  html: ['<div title="hello">world</div>', "div"],
  java: ["public class Example {}", "public"],
  javadoc: ["/** @param name the name */", "@param"],
  javascript: ["const answer = 42;", "const"],
  json: ['{"answer": 42}', "42"],
  kotlin: ["val answer = 42", "val"],
  llvm: ["define i32 @answer() { ret i32 42 }", "define"],
  make: ["all:\n\techo hello", "all"],
  php: ["<?php echo 42;", "echo"],
  protobuf: ['syntax = "proto3";', "syntax"],
  python: ['def greet():\n    return "hello"', "def"],
  ruby: ['def greet\n  "hello"\nend', "def"],
  rust: ["fn main() {}", "fn"],
  scala: ["val answer = 42", "val"],
  sql: ["SELECT id FROM users;", "SELECT"],
  tsx: ["const view = <div />;", "const"],
  typescript: ["const answer: number = 42;", "const"],
  wat: ["(module (func (result i32) i32.const 42))", "module"],
  zig: ["const answer: u32 = 42;", "const"],
  zsh: ['echo "hello"', '"hello"'],
  xml: ['<example title="hello" />', "example"],
  yaml: ["enabled: true", "true"],
  markdown: ["**bold**", "**bold**"],
  markdown_inline: ["**bold**", "**bold**"],
  plaintext: ["plain <text> & no syntax", ""],
};

test("parser fixtures cover every bundle member and extra", () => {
  expect(Object.keys(samples).sort()).toEqual(
    [
      ...new Set([
        ...Object.keys(web),
        ...Object.keys(system),
        ...Object.keys(backend),
        "xml",
        "yaml",
        "markdown",
        "markdown_inline",
        "plaintext",
      ]),
    ].sort(),
  );
});

for (const [language, [code, token]] of Object.entries(samples)) {
  test(`${language} highlights without CDN parsers or manifests`, async ({ page }) => {
    const cdnRequests: string[] = [];
    const wasmResponses: string[] = [];
    // Abort as well as record: a live CDN (or a newer published patch) must not
    // be able to rescue a missing local parser. Block all jsDelivr traffic,
    // including both parser WASM and lumis.json requests.
    page.on("request", (request) => {
      if (new URL(request.url()).hostname === "cdn.jsdelivr.net") cdnRequests.push(request.url());
    });
    await page.route(
      (url) => url.hostname === "cdn.jsdelivr.net",
      (route) => route.abort(),
    );
    page.on("response", (response) => {
      if (response.ok() && new URL(response.url()).pathname.endsWith(".wasm")) {
        wasmResponses.push(response.url());
      }
    });

    try {
      await page.goto("/");
      await page.getByRole("button", { name: "Advanced settings", exact: true }).click();
      await page.getByRole("combobox", { name: "Language", exact: true }).click();
      await page.getByRole("option", { name: language, exact: true }).click();
      await page.getByLabel("Code", { exact: true }).fill(code);

      const source = page.getByTestId("highlight-layer");
      for (const [index, line] of code.split("\n").entries()) {
        await expect(page.getByTestId(`source-line-${index + 1}`)).toHaveText(line);
      }
      if (language === "markdown" || language === "markdown_inline") {
        // Block markdown alone is insufficient: **bold** needs markdown_inline.
        await expect(source.getByText(token, { exact: true })).toHaveCSS("font-weight", "700");
      } else if (language !== "plaintext") {
        const highlighted = source.getByText(token, { exact: true }).first();
        await expect(highlighted).toHaveAttribute("style", /color:/);
        await expect(highlighted).not.toHaveCSS("color", "rgb(31, 35, 40)");
      } else {
        await expect(source.locator("span[style*='color:']")).toHaveCount(0);
      }
      await expect(page.getByText(/Could not load/)).toHaveCount(0);
      if (language !== "plaintext") {
        expect(wasmResponses.length).toBeGreaterThan(0);
        expect(
          wasmResponses.every((url) => new URL(url).origin === new URL(page.url()).origin),
        ).toBe(true);
      }
    } finally {
      expect(cdnRequests, "No parser or lumis.json may be requested from jsDelivr").toEqual([]);
    }
  });
}

test("an unavailable extra parser does not disable other languages", async ({ page }) => {
  await page.route(
    (url) => url.pathname.includes("tree-sitter-xml") && url.pathname.endsWith(".wasm"),
    (route) => route.abort(),
  );
  await page.goto("/");
  await page.getByLabel("Filename", { exact: true }).fill("example.ts");
  await page.getByLabel("Code", { exact: true }).fill("const answer = 42;");
  const keyword = page.getByTestId("highlight-layer").getByText("const", { exact: true });
  await expect(keyword).toHaveCSS("color", "rgb(207, 34, 46)");

  await page.getByLabel("Filename", { exact: true }).fill("example.xml");
  await page.getByLabel("Code", { exact: true }).fill("<example />");
  await expect(page.getByText("Could not load XML highlighting.")).toBeVisible();

  await page.getByLabel("Filename", { exact: true }).fill("example.ts");
  await page.getByLabel("Code", { exact: true }).fill("const answer = 42;");
  await expect(keyword).toHaveCSS("color", "rgb(207, 34, 46)");
  await expect(page.getByText(/Could not load/)).toHaveCount(0);
});
