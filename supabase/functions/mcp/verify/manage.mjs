// update_snippet and delete_snippet end to end against the disposable local
// stack: owner-only edits with redaction, refusal for another account, and
// deletion of the row, its annotations and its stored files.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { localSession, rpc } from "./local.mjs";

const owner = await localSession();
const other = await localSession();
const { config } = owner;
const endpoint = `${config.API_URL}/functions/v1/mcp`;
const call = (name, args, token = owner.token) =>
  rpc(endpoint, token, "tools/call", { name, arguments: args });
const result = (response) => {
  assert.equal(response.response.status, 200);
  return response.data.result;
};

const published = result(
  await call("publish_snippet", { code: "one\ntwo\nthree", filename: "a.ts", title: "Manage me" }),
);
const { url, image_url } = JSON.parse(published.content[0].text);
const imagePath = new URL(image_url).pathname;
assert.equal((await fetch(`${config.API_URL}${imagePath}`)).status, 200);

// Another account cannot touch it.
for (const [name, args] of [
  ["update_snippet", { snippet: url, title: "Hijacked" }],
  ["delete_snippet", { snippet: url }],
]) {
  const denied = result(await call(name, args, other.token));
  assert.equal(denied.isError, true, name);
  assert.match(denied.content[0].text, /No snippet of yours/);
}

// Owner edit: redacted code, new title and visibility; same link.
const githubToken = "ghp_" + "x8Kq2Lm9Pz4Rt7Vw1Yb3Nc6Hd5Jf0Gs2Ae8U";
const updated = result(
  await call("update_snippet", {
    snippet: url,
    code: `const token = "${githubToken}";`,
    title: "Edited",
    visibility: "public",
    theme: "dracula",
  }),
);
assert.ok(!updated.isError, JSON.stringify(updated));
assert.deepEqual(JSON.parse(updated.content[0].text), {
  url,
  visibility: "public",
  redactions: { redacted: 1, kinds: { github_token: 1 } },
});
const shortId = url.slice(-6);
const { data: row } = await owner.client
  .from("snippets")
  .select("id, code, title, visibility, theme, line_count, svg_path")
  .eq("short_id", shortId)
  .single();
assert.equal(row.title, "Edited");
assert.equal(row.visibility, "public");
assert.equal(row.theme, "dracula");
assert.equal(row.line_count, 1);
assert.equal(row.svg_path, null);
assert.ok(row.code.includes("[REDACTED:github_token]") && !row.code.includes(githubToken));

const unknown = result(await call("update_snippet", { snippet: url, theme: "no-such-theme" }));
assert.equal(unknown.isError, true);

// Owner delete: the row is gone and the link no longer resolves. (That is the
// fifth owner tool call: the per-account 5/minute quota allows no more.)
const published2 = result(await call("publish_snippet", { code: "bye", filename: "b.ts" }));
const second = JSON.parse(published2.content[0].text);
const deleted = result(await call("delete_snippet", { snippet: second.url }));
assert.ok(!deleted.isError, JSON.stringify(deleted));
assert.deepEqual(JSON.parse(deleted.content[0].text), { deleted: second.url });
const anon = createClient(config.API_URL, config.PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});
const { data: gone } = await anon.rpc("get_snippet_by_link", {
  p_slug: new URL(second.url).pathname.slice(1, -7),
  p_short_id: second.url.slice(-6),
});
assert.deepEqual(gone, []);
const image = await fetch(`${config.API_URL}${new URL(second.image_url).pathname}`);
assert.equal(image.status, 400, "the stored image is removed with the snippet");

console.log("PASS: update_snippet and delete_snippet ownership, redaction and Storage removal");
