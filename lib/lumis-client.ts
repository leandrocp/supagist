import { createHighlighter } from "@lumis-sh/lumis/client";
import web from "@lumis-sh/wasm-bundle-web";
import system from "@lumis-sh/wasm-bundle-system";
import backend from "@lumis-sh/wasm-bundle-backend";
import xml from "@lumis-sh/wasm-xml";
import yaml from "@lumis-sh/wasm-yaml";
import markdown from "@lumis-sh/wasm-markdown";
import markdownInline from "@lumis-sh/wasm-markdown_inline";

// Keep extras lazy too: a failed XML asset must not reject the shared
// highlighter used by unrelated languages and exports.
const extras = Object.fromEntries(
  [xml, yaml, markdown, markdownInline].map((language) => [
    language.id,
    Object.assign(async () => language, { id: language.id, aliases: language.aliases }),
  ]),
);

// Bundles register lazy loaders. Extras carry their language handles, WASM URLs,
// and matching package metadata together; no CDN manifest is needed. Plaintext
// is built into Lumis and needs no parser.
export const clientHighlighterPromise = createHighlighter({
  languages: [web, system, backend, extras],
});
