// Renders a sample card for a brand preset with the MCP renderer, the same
// code path the CLI, MCP render_snippet and the public API use. Needs only
// Deno 2.9 (no Supabase, Docker or network sign-in). Run from the repo root:
//
//   deno run --config supabase/functions/mcp/deno.json --allow-read --allow-net \
//     --allow-env --allow-write skills/supagist-add-brand/scripts/render-sample.mjs \
//     <brand-id> <code-file> <out.svg> [16:9]
//
// Then convert to PNG with the usage skill's converter:
//   node skills/supagist/scripts/convert-png.mjs <out.svg> <out.png> 2
import { renderSnippet } from "../../../supabase/functions/mcp/render.ts";

const [brand, codeFile, output, aspectRatio] = Deno.args;
if (!brand || !codeFile || !output) {
  console.error("Usage: render-sample.mjs <brand-id> <code-file> <out.svg> [16:9]");
  Deno.exit(2);
}
const code = await Deno.readTextFile(codeFile);
const filename = codeFile.split("/").pop();
const result = await renderSnippet({
  code,
  brand,
  filename,
  // null detects the language from the filename (the MCP default is javascript).
  language: null,
  ...(aspectRatio ? { aspectRatio } : {}),
});
await Deno.writeTextFile(output, result.svg);
console.log(`Saved SVG: ${output} (${result.width}×${result.height})`);
