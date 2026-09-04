// Uses web + system + backend language bundles + a few extras.
// 26MB vs 109MB for wasm-bundle-full.
import { createHighlighter, withWasmBundle } from "@lumis-sh/lumis/client";
import { bundledLanguages as webLangs } from "@lumis-sh/lumis/bundles/web";
import { bundledLanguages as systemLangs } from "@lumis-sh/lumis/bundles/system";
import { bundledLanguages as backendLangs } from "@lumis-sh/lumis/bundles/backend";

// ── web ──────────────────────────────────────────────────────────────────────
import wasmCss from "@lumis-sh/wasm-css";
import wasmHtml from "@lumis-sh/wasm-html";
import wasmJavascript from "@lumis-sh/wasm-javascript";
import wasmJson from "@lumis-sh/wasm-json";
import wasmTsx from "@lumis-sh/wasm-tsx";
import wasmTypescript from "@lumis-sh/wasm-typescript";

// ── system ───────────────────────────────────────────────────────────────────
import wasmAsm from "@lumis-sh/wasm-asm";
import wasmBash from "@lumis-sh/wasm-bash";
import wasmC from "@lumis-sh/wasm-c";
import wasmCmake from "@lumis-sh/wasm-cmake";
import wasmCpp from "@lumis-sh/wasm-cpp";
import wasmGo from "@lumis-sh/wasm-go";
import wasmLlvm from "@lumis-sh/wasm-llvm";
import wasmMake from "@lumis-sh/wasm-make";
import wasmRust from "@lumis-sh/wasm-rust";
import wasmWat from "@lumis-sh/wasm-wat";

// ── backend ──────────────────────────────────────────────────────────────────
import wasmCsharp from "@lumis-sh/wasm-csharp";
import wasmElixir from "@lumis-sh/wasm-elixir";
import wasmErlang from "@lumis-sh/wasm-erlang";
import wasmJava from "@lumis-sh/wasm-java";
import wasmJavadoc from "@lumis-sh/wasm-javadoc";
import wasmKotlin from "@lumis-sh/wasm-kotlin";
import wasmPhp from "@lumis-sh/wasm-php";
import wasmProtobuf from "@lumis-sh/wasm-protobuf";

// ── extras ───────────────────────────────────────────────────────────────────
import wasmXml from "@lumis-sh/wasm-xml";
import wasmYaml from "@lumis-sh/wasm-yaml";
import wasmMarkdown from "@lumis-sh/wasm-markdown";

const languages = { ...webLangs, ...systemLangs, ...backendLangs };

const wasms = {
  // web
  css: wasmCss,
  html: wasmHtml,
  javascript: wasmJavascript,
  json: wasmJson,
  tsx: wasmTsx,
  typescript: wasmTypescript,
  // system
  asm: wasmAsm,
  bash: wasmBash,
  c: wasmC,
  cmake: wasmCmake,
  cpp: wasmCpp,
  go: wasmGo,
  llvm: wasmLlvm,
  make: wasmMake,
  rust: wasmRust,
  wat: wasmWat,
  // backend
  csharp: wasmCsharp,
  elixir: wasmElixir,
  erlang: wasmErlang,
  java: wasmJava,
  javadoc: wasmJavadoc,
  kotlin: wasmKotlin,
  php: wasmPhp,
  protobuf: wasmProtobuf,
  // extras
  xml: wasmXml,
  yaml: wasmYaml,
  markdown: wasmMarkdown,
};

export const clientHighlighterPromise = createHighlighter({
  languages: [withWasmBundle(languages, wasms)],
});
