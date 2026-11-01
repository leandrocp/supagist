import { strict as assert } from "node:assert";
import { shortIdFromRef, updateInput } from "./manage.ts";

Deno.test("snippet links, paths and short ids resolve to the short id", () => {
  for (const ref of [
    "https://supagist.app/deploy-config-a1b2c3",
    "https://supagist.app/deploy-config-a1b2c3/",
    "https://supagist.app/deploy-config-a1b2c3?ref=x#line-2",
    "/deploy-config-a1b2c3",
    "deploy-config-a1b2c3",
    "a1b2c3",
  ])
    assert.equal(shortIdFromRef(ref), "a1b2c3", ref);
  for (const ref of ["https://supagist.app/", "deploy-config-a1b2", "deploy-A1B2C3", "a1b2c3d"])
    assert.equal(shortIdFromRef(ref), null, ref);
});

Deno.test("an update needs at least one change and cannot touch sealed fields", () => {
  const snippet = "https://supagist.app/x-a1b2c3";
  assert.equal(updateInput.safeParse({ snippet }).success, false);
  assert.equal(updateInput.safeParse({ snippet, title: "" }).success, true);
  assert.equal(updateInput.safeParse({ snippet, visibility: "public" }).success, true);
  assert.equal(updateInput.safeParse({ snippet, visibility: "private" }).success, false);
  // A published snippet is sealed: code, language and theme are refused.
  for (const sealed of [{ code: "x" }, { language: "rust" }, { theme: "dracula" }])
    assert.equal(
      updateInput.safeParse({ snippet, title: "t", ...sealed }).success,
      false,
      JSON.stringify(sealed),
    );
  assert.equal(updateInput.safeParse({ snippet, author_id: "x", title: "t" }).success, false);
});
