import { strict as assert } from "node:assert";
import type { SupabaseClient } from "@supabase/supabase-js";
import { shortIdFromRef, updateInput, updateSnippet } from "./manage.ts";

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
  assert.equal(updateInput.safeParse({ snippet, visibility: "private" }).success, true);
  assert.equal(updateInput.safeParse({ snippet, visibility: "unlisted" }).success, false);
  // A published snippet is sealed: code, language and theme are refused.
  for (const sealed of [{ code: "x" }, { language: "rust" }, { theme: "dracula" }])
    assert.equal(
      updateInput.safeParse({ snippet, title: "t", ...sealed }).success,
      false,
      JSON.stringify(sealed),
    );
  assert.equal(updateInput.safeParse({ snippet, author_id: "x", title: "t" }).success, false);
});

Deno.test("making a snippet public has its share image stored, as the caller", async () => {
  const query = (result: unknown) => {
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "update"]) chain[method] = () => chain;
    chain.maybeSingle = async () => result;
    return chain;
  };
  const rows = [
    { data: { id: "s1", slug: "posts-ts", short_id: "ab12cd", visibility: "private" } },
    { data: { visibility: "public" } },
  ];
  const supabase = { from: () => query(rows.shift()) } as unknown as SupabaseClient;
  const calls: [string, RequestInit | undefined][] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push([url, init]);
    return new Response("{}");
  }) as typeof fetch;
  try {
    const result = await updateSnippet(
      { snippet: "https://supagist.app/posts-ts-ab12cd", visibility: "public" },
      "u1",
      supabase,
      "Bearer caller-token",
    );
    assert.equal(result.visibility, "public");
    assert.equal(calls.length, 1);
    assert.equal(calls[0]![0], "https://supagist.app/og/posts-ts-ab12cd.jpg");
    assert.equal(calls[0]![1]?.method, "POST");
    assert.deepEqual(calls[0]![1]?.headers, { Authorization: "Bearer caller-token" });
  } finally {
    globalThis.fetch = realFetch;
  }
});
