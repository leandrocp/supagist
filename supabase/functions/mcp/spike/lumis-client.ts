import { createHighlighter } from "./generated/vendor/lumis.js";
import packages from "./generated/parser-packages.json" with { type: "json" };

export type ParserEvent = {
  sequence: number;
  event: "parser-fetch-requested";
  language: string;
  url: string;
  version: string;
  sha256: string;
  atWallMs: number;
};
const events: ParserEvent[] = [];
let sequence = 0;
export const parserEventCursor = () => sequence;
export const parserEventsSince = (cursor: number) =>
  events.filter((event) => event.sequence > cursor);

// Resolver events mean Lumis is about to fetch, NOT that a download succeeded.
// preload completion in render.ts means fetch + digest verification + compile succeeded.
export const clientHighlighterPromise = createHighlighter({
  languagePackageResolver(packageName: string) {
    const metadata = (packages as Record<string, unknown>)[packageName];
    if (!metadata) throw new Error(`Parser package absent from M0 lock: ${packageName}`);
    return `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}`;
  },
  wasmResolver(
    language: string,
    wasm: { packageName: string; name: string; version: string; sha256: string },
  ) {
    const metadata = (
      packages as Record<string, { version: string; parser: { sha256: string; name: string } }>
    )[wasm.packageName];
    if (
      !metadata ||
      metadata.version !== wasm.version ||
      metadata.parser.sha256 !== wasm.sha256 ||
      metadata.parser.name !== wasm.name
    ) {
      throw new Error(`Parser reference differs from M0 lock: ${language}`);
    }
    const url = `https://cdn.jsdelivr.net/npm/${wasm.packageName}@${wasm.version}/${wasm.name}.wasm`;
    const event: ParserEvent = {
      sequence: ++sequence,
      event: "parser-fetch-requested",
      language,
      url,
      version: wasm.version,
      sha256: wasm.sha256,
      atWallMs: performance.now(),
    };
    events.push(event);
    if (events.length > 256) events.shift();
    console.log(JSON.stringify(event));
    return url;
  },
});
