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

// The web app's share image (the job serves it on :3000), decoded by resvg:
// how much of the card's place in the envelope is the theme's editor colour.
const WEB = "http://127.0.0.1:3000";
async function shareImage() {
  const page = await (await fetch(`${WEB}${new URL(url).pathname}`)).text();
  const src = /<meta property="og:image" content="([^"]+)"/.exec(page)?.[1];
  assert.ok(src, "the page links its share image");
  const res = await fetch(new URL(new URL(src).pathname + new URL(src).search, WEB));
  assert.equal(res.status, 200);
  const png = Buffer.from(await res.arrayBuffer());
  const { Resvg } = await import("@resvg/resvg-js");
  const href = `data:image/png;base64,${png.toString("base64")}`;
  const image = new Resvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><image href="${href}" width="1200" height="630"/></svg>`,
  ).render();
  // A getter that copies the buffer: read it once.
  const p = image.pixels;
  const share = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    let hits = 0;
    let total = 0;
    for (let y = 128; y < 412; y += 2) {
      for (let x = 555; x < 1145; x += 2) {
        const at = (y * image.width + x) * 4;
        total += 1;
        if (p[at] === r && p[at + 1] === g && p[at + 2] === b) hits += 1;
      }
    }
    return hits / total;
  };
  return { src, share };
}
const sharedBefore = await shareImage();

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

// The edit dropped the stored SVG; the share image still shows the card, in
// the edited theme, under a new URL.
const sharedAfter = await shareImage();
assert.notEqual(sharedAfter.src, sharedBefore.src, "the share image URL changes with the edit");
// Dracula's editor background; the envelope alone has none of it.
assert.ok(sharedAfter.share("#282a36") > 0.1, "the dracula card is in the envelope");

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

console.log(
  "PASS: update_snippet and delete_snippet ownership, redaction, share image and Storage removal",
);
