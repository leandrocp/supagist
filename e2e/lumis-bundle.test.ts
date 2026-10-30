import { test, expect } from "@playwright/test";
import full from "@lumis-sh/wasm-bundle-full";

// Real syntax and a token owned by each grammar, not arbitrary text that could
// silently succeed through plain-text fallback. Optional injected grammars are
// separate entries; Markdown's required inline grammar is checked via bold.
// Each case gets a cold page.
const samples: Record<string, [code: string, token: string]> = {
  angular: ['<div title="hello">world</div>', "div"],
  arduino: ["int answer = 42;", "int"],
  asm: ["mov eax, 42", "42"],
  astro: ['<div title="hello">world</div>', "div"],
  bash: ['echo "hello"', '"hello"'],
  bicep: ["param answer int = 42", "param"],
  c: ["int answer = 42;", "int"],
  caddy: ['localhost {\n respond "hello"\n}', "localhost"],
  clojure: ["(def answer 42)", "42"],
  cmake: ["project(supagist)", "project"],
  comment: ["TODO: fix this", "TODO"],
  commonlisp: ["(defun answer () 42)", "42"],
  cpp: ["int answer = 42;", "int"],
  csharp: ["public class Example {}", "public"],
  css: [".example { color: red; }", "color"],
  csv: ["name,answer\nhello,42", "42"],
  d: ["int answer = 42;", "int"],
  dart: ["const answer = 42;", "const"],
  diff: ["diff --git a/example b/example\n--- a/example\n+++ b/example", "diff"],
  dockerfile: ["FROM alpine:latest", "FROM"],
  dot: ["digraph G { a -> b; }", "digraph"],
  editorconfig: ["root = true", "true"],
  eex: ["<%= 42 %>", "<%="],
  ejs: ["<%= 42 %>", "<%="],
  elixir: ["defmodule Example do\nend", "defmodule"],
  elm: ["answer = 42", "42"],
  erb: ["<%= 42 %>", "<%="],
  erlang: ["-module(example).", "-module"],
  fish: ['echo "hello"', '"hello"'],
  fortran: ["program hello\nend program hello", "program"],
  fsharp: ["let answer = 42", "let"],
  gitattributes: ["*.js text", "text"],
  gitignore: ["# ignored files\nnode_modules/", "# ignored files"],
  gleam: ["pub fn main() { 42 }", "pub"],
  glimmer: ['<div title="hello">world</div>', "div"],
  glsl: ["void main() {}", "void"],
  go: ["package main", "package"],
  graphql: ["query Example { user { id } }", "query"],
  groovy: ["def answer = 42", "def"],
  haskell: ["answer = 42", "42"],
  hcl: ["answer = true", "true"],
  heex: ['<div title="hello">world</div>', "div"],
  html: ['<div title="hello">world</div>', "div"],
  htmldjango: ["{% if answer %}yes{% endif %}", "if"],
  http: ["GET https://example.com\n", "GET"],
  hurl: ["GET https://example.com", "GET"],
  iex: ["iex> 42", "iex>"],
  ini: ["[settings]\nanswer=42", "settings"],
  java: ["public class Example {}", "public"],
  javadoc: ["/** @param name the name */", "@param"],
  javascript: ["const answer = 42;", "const"],
  jinja: ["{% if true %}hello{% endif %}", "if"],
  jinja_inline: ["# set answer = true\n", "true"],
  jq: [".answer | select(. > 42)", "42"],
  json: ['{"answer": 42}', "42"],
  json5: ["{answer: 42}", "42"],
  julia: ["function answer()\n 42\nend", "function"],
  just: ["hello:\n echo hello", "hello"],
  kdl: ["answer 42", "42"],
  kotlin: ["val answer = 42", "val"],
  latex: ["\\section{Hello}", "\\section"],
  liquid: ["{% if true %}hello{% endif %}", "if"],
  llvm: ["define i32 @answer() { ret i32 42 }", "define"],
  lua: ["local answer = 42", "local"],
  luadoc: ["@param name string", "@param"],
  make: ["all:\n\techo hello", "all"],
  matlab: ["function answer = hello()\n answer = 42;\nend", "function"],
  mdx: ["**bold**", "**bold**"],
  mermaid: ["flowchart LR\n A --> B", "flowchart"],
  nginx: ["server { listen 80; }", "80"],
  nim: ["let answer = 42", "let"],
  nix: ["let answer = 42; in answer", "let"],
  nushell: ["let answer = 42", "let"],
  objc: ["int answer = 42;", "int"],
  ocaml: ["let answer = 42", "let"],
  ocaml_interface: ["val answer : int", "val"],
  pascal: ["program Hello; begin end.", "program"],
  perl: ["my $answer = 42;", "my"],
  php: ["<?php echo 42;", "echo"],
  powershell: ["$answer = 42", "42"],
  prisma: ["model User {\n id Int @id\n}", "model"],
  protobuf: ['syntax = "proto3";', "syntax"],
  puppet: ["$answer = 42", "42"],
  python: ['def greet():\n    return "hello"', "def"],
  qmljs: ["import QtQuick 2.0\nItem {}", "import"],
  r: ["answer <- 42", "42"],
  racket: ["(define answer 42)", "42"],
  regex: ["[a-z]+", "+"],
  rst: [".. note:: Hello", "note"],
  ruby: ['def greet\n  "hello"\nend', "def"],
  rust: ["fn main() {}", "fn"],
  scala: ["val answer = 42", "val"],
  scheme: ["(define answer 42)", "42"],
  scss: [".example { color: red; }", "color"],
  slim: ["div.example hello", "div"],
  solidity: ["contract Example {}", "contract"],
  sql: ["SELECT id FROM users;", "SELECT"],
  surface: ['<div title="hello">world</div>', "div"],
  svelte: ['<div title="hello">world</div>', "div"],
  swift: ["let answer = 42", "let"],
  tcl: ['set answer "hello"', '"hello"'],
  terraform: ["answer = true", "true"],
  tlaplus: ["---- MODULE Example ----", "MODULE"],
  toml: ["answer = true", "true"],
  toon: ["answer: true", "true"],
  tsx: ["const view = <div />;", "const"],
  typescript: ["const answer: number = 42;", "const"],
  typst: ["#let answer = 42", "let"],
  vhdl: ["entity hello is\nend hello;", "entity"],
  vim: ["let answer = 42", "let"],
  vue: ['<template><div title="hello">world</div></template>', "div"],
  wat: ["(module (func (result i32) i32.const 42))", "module"],
  wgsl: ["fn main() {}", "fn"],
  zig: ["const answer: u32 = 42;", "const"],
  zsh: ['echo "hello"', '"hello"'],
  xml: ['<example title="hello" />', "example"],
  yaml: ["enabled: true", "true"],
  markdown: ["**bold**", "**bold**"],
  markdown_inline: ["**bold**", "**bold**"],
  plaintext: ["plain <text> & no syntax", ""],
};

test("parser fixtures cover the full bundle and plaintext", () => {
  expect(Object.keys(samples).sort()).toEqual([...Object.keys(full), "plaintext"].sort());
});

for (const [language, [code, token]] of Object.entries(samples)) {
  test(`${language} highlights without CDN parsers or manifests`, async ({ page }) => {
    const cdnRequests: string[] = [];
    const wasmResponses: string[] = [];
    // CSP can reject a fetch before Playwright sees a network request. Record
    // those attempts too, so tightening CSP cannot mask a CDN fallback.
    await page.addInitScript(() => {
      const state = window as Window & { cdnViolations: string[] };
      state.cdnViolations = [];
      document.addEventListener("securitypolicyviolation", (event) => {
        if (
          URL.canParse(event.blockedURI) &&
          new URL(event.blockedURI).hostname === "cdn.jsdelivr.net"
        ) {
          state.cdnViolations.push(event.blockedURI);
        }
      });
    });
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
      const response = await page.goto("/");
      const csp = response?.headers()["content-security-policy"];
      expect(csp).toBeDefined();
      expect(csp).not.toContain("cdn.jsdelivr.net");
      await page.getByRole("button", { name: "Advanced settings", exact: true }).click();
      await page.getByRole("combobox", { name: "Language", exact: true }).click();
      await page.getByRole("option", { name: language, exact: true }).click();
      await page.getByLabel("Code", { exact: true }).fill(code);

      const source = page.getByTestId("highlight-layer");
      for (const [index, line] of code.split("\n").entries()) {
        await expect(page.getByTestId(`source-line-${index + 1}`)).toHaveText(line);
      }
      if (language === "markdown" || language === "markdown_inline" || language === "mdx") {
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
      expect(
        await page.evaluate(() => (window as Window & { cdnViolations: string[] }).cdnViolations),
        "CSP must not mask an attempted jsDelivr fetch",
      ).toEqual([]);
    }
  });
}

test("an unavailable parser does not disable other languages", async ({ page }) => {
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
