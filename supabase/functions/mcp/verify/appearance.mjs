// End-to-end documentation examples against disposable local Supabase only.
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { localSession, rpc } from "./local.mjs";

const { config, token } = await localSession();
const endpoint = `${config.API_URL}/functions/v1/mcp`;
const directory = process.argv[2];
if (directory) await mkdir(directory, { recursive: true });
const initialized = await rpc(endpoint, token, "initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "supagist-appearance-check", version: "1" },
});
assert.equal(initialized.response.status, 200);
assert.ok(initialized.data.result.serverInfo);
const listed = await rpc(endpoint, token, "tools/list");
assert.equal(listed.response.status, 200);
const schema = listed.data.result.tools.find((tool) => tool.name === "render_snippet").inputSchema;
assert.equal(schema.additionalProperties, false);
for (const key of [
  "brand",
  "fontSize",
  "header",
  "footer",
  "comments",
  "reactions",
  "aspectRatio",
  "ligatures",
])
  assert.ok(schema.properties[key]);
const options = await rpc(endpoint, token, "tools/call", { name: "list_options", arguments: {} });
assert.equal(options.response.status, 200);
const catalog = JSON.parse(options.data.result.content[0].text);
assert.equal(catalog.brands.find((brand) => brand.id === "supabase").fontId, "geist");
assert.ok(catalog.fontSizes.includes(18));
assert.ok(catalog.backgrounds.includes("Supabase"));

const skill = new URL("../../../../.agents/skills/supagist/", import.meta.url);
const examples = [];
for (const file of ["SKILL.md", "reference/features.md"]) {
  const markdown = await readFile(new URL(file, skill), "utf8");
  for (const [, json] of markdown.matchAll(/```json\n([\s\S]*?)\n```/g))
    examples.push(JSON.parse(json));
}
assert.equal(examples.length, 3);
examples.push(
  { code: "const answer = 42;", brand: "tailwind", filename: "answer.js" },
  {
    code: "source\n|> Enum.map(&(&1 * 2))",
    language: "elixir",
    filename: "demo.ex",
    brand: "supabase",
    aspectRatio: "16:9",
    ligatures: false,
  },
);
const names = [
  "supabase-default",
  "supabase-18px",
  "advanced-annotations",
  "tailwind-pattern",
  "supabase-16x9-ligatures-off",
];
for (const [i, input] of examples.entries()) {
  // Render quotas are per user; a fresh disposable local user per render keeps
  // this check fast instead of waiting out the minute window.
  const { token: renderToken } = await localSession();
  const result = await rpc(endpoint, renderToken, "tools/call", {
    name: "render_snippet",
    arguments: input,
  });
  assert.equal(result.response.status, 200);
  assert.ok(!result.data.error && !result.data.result?.isError, JSON.stringify(result.data));
  const svg = result.data.result.content[0].text;
  assert.match(svg, /<svg /);
  assert.match(svg, /brand-card-shadow/);
  assert.match(svg, /data:font\/ttf;base64,/);
  if (input.brand === "supabase") {
    assert.match(svg, /#3ECF8E/);
    assert.match(svg, /font-family:'Geist Mono'/);
    assert.doesNotMatch(svg, /#ff5f57/);
  }
  if (input.fontSize === 18) assert.match(svg, /font-size="18"/);
  if (input.comments) {
    assert.match(svg, /Inspect the accumulated total/);
    assert.match(svg, /Demo author/);
    assert.match(svg, />\+1</);
  }
  if (input.brand === "tailwind") assert.match(svg, /data:image\/png;base64,/);
  if (input.aspectRatio === "16:9") assert.match(svg, /^<svg[^>]* width="1600" height="900" /);
  if (input.ligatures === false) {
    assert.match(svg, />\|<\/tspan><tspan[^>]* x="[\d.]+">&gt;/);
  }
  if (directory) await writeFile(`${directory}/${names[i]}.svg`, svg);
  const [, width, height] = /<svg[^>]* width="([\d.]+)" height="([\d.]+)"/.exec(svg);
  console.log(
    `PASS ${names[i]}: ${width}×${height}, ${Buffer.byteLength(svg)} bytes, ${result.wallMs.toFixed(1)} ms wall`,
  );
}
const unknown = await rpc(endpoint, token, "tools/call", {
  name: "render_snippet",
  arguments: { code: "x", branding: "supabase" },
});
assert.equal(unknown.response.status, 200);
assert.ok(
  unknown.data.error || unknown.data.result?.isError,
  "Unknown controls must not disappear silently",
);
console.log(
  "PASS: initialize, tool schema, catalog, all skill examples, bundled pattern, unknown-field rejection",
);
