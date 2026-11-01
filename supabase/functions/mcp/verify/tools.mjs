// search_themes, PNG output and legacy-input compatibility end to end against
// the disposable local stack. PNG needs the web app's /api/render running on
// the host; point the function at it with SUPAGIST_RENDER_API_URL.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { localSession, rpc } from "./local.mjs";

const { config, token } = await localSession();
const endpoint = `${config.API_URL}/functions/v1/mcp`;
const directory = process.argv[2];
if (directory) await mkdir(directory, { recursive: true });
// Render quotas are per user; a fresh disposable user per render avoids waits.
const call = async (name, args, bearer) =>
  rpc(endpoint, bearer ?? (await localSession()).token, "tools/call", { name, arguments: args });

const tools = (await rpc(endpoint, token, "tools/list")).data.result.tools;
assert.deepEqual(tools.map((tool) => tool.name).sort(), [
  "delete_snippet",
  "list_options",
  "publish_snippet",
  "render_snippet",
  "search_themes",
  "update_snippet",
]);
const render = tools.find((tool) => tool.name === "render_snippet").inputSchema;
assert.deepEqual(render.properties.format.enum, ["svg", "png"]);
assert.ok(!("fixture" in render.properties));
assert.equal(render.additionalProperties, false);

// search_themes: filters, ranking and paging, without touching a render quota.
const search = async (args) => {
  const result = await call("search_themes", args, token);
  assert.equal(result.response.status, 200);
  assert.ok(!result.data.result.isError, JSON.stringify(result.data));
  return JSON.parse(result.data.result.content[0].text);
};
const light = await search({ family: "nightfox", appearance: "light" });
assert.deepEqual(
  light.themes.map((theme) => theme.id),
  ["dawnfox", "dayfox"],
);
assert.equal(light.nextOffset, null);
const first = await search({ query: "github", limit: 3 });
const second = await search({ query: "github", limit: 3, offset: first.nextOffset });
assert.equal(first.themes[0].id.startsWith("github"), true);
assert.equal(second.offset, 3);
assert.ok(first.total > 6);
assert.equal(
  new Set([...first.themes, ...second.themes].map((theme) => theme.id)).size,
  6,
  "pages must not overlap",
);
const invalid = await call("search_themes", { limit: 500 }, token);
assert.ok(invalid.data.error || invalid.data.result.isError);

// An old client's fixture is ignored; an unknown theme names close matches.
const legacy = await call("render_snippet", { code: "const a = 1;", fixture: "vercel" });
assert.ok(!legacy.data.result.isError, JSON.stringify(legacy.data));
assert.match(legacy.data.result.content[0].text, /^<svg /);
assert.ok(!legacy.data.result.content[0].text.includes("brand-card-shadow"));
const typo = await call("render_snippet", { code: "x", theme: "drakula" });
assert.ok(typo.data.result.isError);
assert.match(typo.data.result.content[0].text, /Close matches: dracula/);

// PNG: rasterized by the web app's render API with this caller's token.
for (const [pixelRatio, scale] of [
  [undefined, 2],
  [1, 1],
]) {
  const svg = await call("render_snippet", { code: "const answer = 42;", brand: "supabase" });
  const width = Number(/width="(\d+)"/.exec(svg.data.result.content[0].text)[1]);
  const png = await call("render_snippet", {
    code: "const answer = 42;",
    brand: "supabase",
    format: "png",
    ...(pixelRatio ? { pixelRatio } : {}),
  });
  assert.equal(png.response.status, 200);
  assert.ok(!png.data.result.isError, JSON.stringify(png.data));
  const [image, meta] = png.data.result.content;
  assert.equal(image.type, "image");
  assert.equal(image.mimeType, "image/png");
  const bytes = Buffer.from(image.data, "base64");
  assert.equal(bytes.subarray(1, 4).toString(), "PNG");
  // The IHDR width is the SVG's width times the requested scale.
  assert.equal(bytes.readUInt32BE(16), width * scale);
  assert.deepEqual(JSON.parse(meta.text), {
    format: "png",
    width: width * scale,
    height: bytes.readUInt32BE(20),
  });
  if (directory) await writeFile(`${directory}/supabase-${scale}x.png`, bytes);
}
const badPng = await call("render_snippet", { code: "x", theme: "drakula", format: "png" });
assert.ok(badPng.data.result.isError);
assert.match(badPng.data.result.content[0].text, /Unsupported theme: drakula/);

console.log("PASS: search_themes, PNG at 1x/2x, legacy fixture ignored, close-match errors");
