// publish_snippet end to end against the disposable local stack: auth, the
// unlisted + redacted contract, RLS visibility and USER_RATE_LIMITED.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { localSession, rpc } from "./local.mjs";

const { config, client, token } = await localSession();
const endpoint = `${config.API_URL}/functions/v1/mcp`;
const call = (args, bearer = token) =>
  rpc(endpoint, bearer, "tools/call", { name: "publish_snippet", arguments: args });

// Fake credentials, assembled at runtime so none is committed verbatim.
const awsKey = "AKIA" + "QX7RZ2WB5NL3KD6M";
const githubToken = "ghp_" + "x8Kq2Lm9Pz4Rt7Vw1Yb3Nc6Hd5Jf0Gs2Ae8U";
const code = [
  "export const config = {",
  `  awsAccessKeyId: "${awsKey}",`,
  `  githubToken: "${githubToken}",`,
  '  region: "us-east-1",',
  "};",
].join("\n");

// No bearer: the existing OAuth challenge, before any tool runs.
const denied = await call({ code }, null);
assert.equal(denied.response.status, 401);
assert.ok(denied.response.headers.get("www-authenticate")?.includes("oauth-protected-resource"));

const tools = (await rpc(endpoint, token, "tools/list")).data.result.tools;
const tool = tools.find((t) => t.name === "publish_snippet");
assert.deepEqual(tool.annotations, {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
});

const published = await call({
  code,
  language: "typescript",
  filename: "config.ts",
  title: "Deploy config",
  brand: "supabase",
});
assert.equal(published.response.status, 200);
assert.ok(!published.data.result.isError, JSON.stringify(published.data));
const result = JSON.parse(published.data.result.content[0].text);
assert.match(result.url, /^https:\/\/supagist\.app\/deploy-config-[a-z0-9]{6}$/);
assert.equal(result.visibility, "unlisted");
assert.deepEqual(result.redactions, { redacted: 2, kinds: { aws_access_key: 1, github_token: 1 } });
assert.ok(
  !JSON.stringify(result).includes(awsKey) && !JSON.stringify(result).includes(githubToken),
);

// Stored row: owned by the caller, unlisted, redacted, line structure kept.
const shortId = result.url.slice(-6);
const { data: own } = await client
  .from("snippets")
  .select("visibility, title, code, line_count, theme, font_id, author_id, appearance")
  .eq("short_id", shortId)
  .single();
const { data: user } = await client.auth.getUser();
assert.equal(own.author_id, user.user.id);
assert.equal(own.visibility, "unlisted");
assert.equal(own.title, "Deploy config");
assert.equal(own.line_count, 5);
assert.equal(own.font_id, "geist");
// The saved view draws the brand canvas and frame from the stored appearance.
assert.equal(own.appearance.background, "Supabase");
assert.equal(own.appearance.windowDecoration, "none");
assert.ok(own.code.includes('awsAccessKeyId: "[REDACTED:aws_access_key]"'));
assert.ok(own.code.includes('githubToken: "[REDACTED:github_token]"'));
assert.ok(!own.code.includes(awsKey) && !own.code.includes(githubToken));

// Locally the function sees Storage through the internal kong host.
const imagePath = new URL(result.image_url).pathname;
assert.ok(imagePath.startsWith(`/storage/v1/object/public/snippet-images/${user.user.id}/`));
const image = await fetch(`${config.API_URL}${imagePath}`);
assert.equal(image.status, 200);
const svg = await image.text();
assert.ok(svg.includes("<svg") && !svg.includes(awsKey) && !svg.includes(githubToken));

// Never listed for anyone else, but reachable by its exact link.
const anon = createClient(config.API_URL, config.PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});
const { data: listed } = await anon.from("snippets").select("id").eq("short_id", shortId);
assert.deepEqual(listed, []);
const slug = new URL(result.url).pathname.slice(1, -7);
const { data: linked } = await anon
  .rpc("get_snippet_by_link", { p_slug: slug, p_short_id: shortId })
  .select("visibility")
  .single();
assert.equal(linked.visibility, "unlisted");

// Two more fill the 3/minute publish quota; the next is USER_RATE_LIMITED.
for (const i of [1, 2])
  assert.equal((await call({ code: `const n = ${i};` })).response.status, 200);
const limited = await call({ code: "const n = 3;" });
assert.equal(limited.response.status, 429);
assert.equal(limited.data.error.code, -32300);

console.log("PASS: publish_snippet auth, unlisted, redaction, visibility and USER_RATE_LIMITED");
