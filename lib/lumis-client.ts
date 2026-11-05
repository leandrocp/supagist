import { createHighlighter } from "@lumis-sh/lumis/client";
import languages from "@lumis-sh/wasm-bundle-full";
import { extraLanguages } from "@/lib/lumis-extra-languages";

// The bundle registers lazy loaders; only a requested language's parser is fetched.
export const clientHighlighterPromise = createHighlighter({
  languages: [languages, ...extraLanguages],
});
