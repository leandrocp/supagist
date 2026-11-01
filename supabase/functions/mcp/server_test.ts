import { strict as assert } from "node:assert";
import { createMcpHandler } from "@modelcontextprotocol/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { type Caller, createServer, SERVER_INSTRUCTIONS } from "./server.ts";

// Exercise the same handler index.ts serves, through JSON-RPC over HTTP.
async function rpc(method: string, params: Record<string, unknown> = {}, caller?: Caller) {
  const response = await createMcpHandler(() => createServer(caller)).fetch(
    new Request("http://localhost/mcp", {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        "mcp-protocol-version": "2025-11-25",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
  );
  assert.equal(response.status, 200);
  const text = await response.text();
  // The SDK may answer as JSON or as a single SSE event.
  const json = text.startsWith("{")
    ? text
    : text
        .split("\n")
        .find((l) => l.startsWith("data:"))!
        .slice(5);
  return JSON.parse(json).result;
}

Deno.test("initialize advertises the supagist name, version and instructions", async () => {
  const result = await rpc("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "test", version: "0" },
  });
  assert.deepEqual(result.serverInfo, { name: "supagist", version: "1.0.0" });
  assert.equal(result.instructions, SERVER_INSTRUCTIONS);
});

Deno.test("tool descriptions never name other tools or local-only workflows", async () => {
  const { tools } = await rpc("tools/list");
  const names = tools.map((tool: { name: string }) => tool.name).sort();
  assert.deepEqual(names, [
    "delete_snippet",
    "list_options",
    "publish_snippet",
    "render_snippet",
    "search_themes",
    "update_snippet",
  ]);
  for (const text of [
    SERVER_INSTRUCTIONS,
    ...tools.map((t: { description: string }) => t.description),
  ]) {
    for (const name of names) assert.ok(!text.includes(name), `${name} named in: ${text}`);
    for (const banned of ["locally", "benchmark", "fixture", "converter"])
      assert.ok(!text.includes(banned), `${banned} in: ${text}`);
  }
});

Deno.test("publish_snippet writes, never destroys, and takes appearance but not annotations", async () => {
  const { tools } = await rpc("tools/list");
  const byName = Object.fromEntries(tools.map((t: { name: string }) => [t.name, t]));
  const publish = byName.publish_snippet;
  assert.equal(publish.annotations.readOnlyHint, false);
  assert.equal(publish.annotations.destructiveHint, false);
  // It creates a link that anyone holding it can open.
  assert.equal(publish.annotations.openWorldHint, true);
  assert.ok(publish.description.includes("confirm with the user"));
  for (const name of ["render_snippet", "list_options", "search_themes"])
    assert.equal(byName[name].annotations.readOnlyHint, true);
  const fields = Object.keys(publish.inputSchema.properties);
  assert.ok(fields.includes("title") && fields.includes("brand") && fields.includes("code"));
  for (const renderOnly of ["reactions", "comments", "author", "fixture", "pixelRatio"])
    assert.ok(!fields.includes(renderOnly), renderOnly);
  for (const promise of ["unlisted", "redacted", "noindex"])
    assert.ok(publish.description.includes(promise), promise);
});

Deno.test("search_themes returns a JSON page of matching themes", async () => {
  const result = await rpc("tools/call", {
    name: "search_themes",
    arguments: { query: "catppuccin", appearance: "dark", limit: 2 },
  });
  assert.ok(!result.isError);
  assert.deepEqual(JSON.parse(result.content[0].text), {
    themes: [
      { id: "catppuccin_frappe", appearance: "dark", family: "catppuccin/nvim", kind: "lumis" },
      { id: "catppuccin_macchiato", appearance: "dark", family: "catppuccin/nvim", kind: "lumis" },
    ],
    total: 3,
    offset: 0,
    nextOffset: 2,
  });
});

Deno.test("list_options advertises both output formats", async () => {
  const result = await rpc("tools/call", { name: "list_options", arguments: {} });
  const options = JSON.parse(result.content[0].text);
  assert.deepEqual(options.formats, ["svg", "png"]);
  assert.deepEqual(options.pixelRatios, { svg: [1, 2], png: [1, 2] });
  assert.ok(!options.notes.includes("local"));
});

Deno.test("PNG renders through the render API with the caller's own token", async () => {
  const caller: Caller = {
    userId: "user-1",
    supabase: {} as SupabaseClient,
    authorization: "Bearer caller-token",
  };
  const sent: { url: string; init: RequestInit }[] = [];
  const realFetch = globalThis.fetch;
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
  globalThis.fetch = (url, init) => {
    sent.push({ url: String(url), init: init! });
    const body = JSON.parse(String(init!.body));
    if (body.code === "bad")
      return Promise.resolve(
        Response.json(
          { error: { code: "INVALID_INPUT", message: "Unsupported theme: drakula" } },
          { status: 400 },
        ),
      );
    if (body.code === "down") return Promise.resolve(new Response("bad gateway", { status: 502 }));
    return Promise.resolve(
      new Response(png, {
        headers: {
          "content-type": "image/png",
          "x-supagist-width": "984",
          "x-supagist-height": "400",
        },
      }),
    );
  };
  try {
    const call = (args: Record<string, unknown>, who: Caller | null = caller) =>
      rpc("tools/call", { name: "render_snippet", arguments: args }, who ?? undefined);

    const result = await call({ code: "const a = 1;", format: "png", fixture: "plain" });
    assert.ok(!result.isError, JSON.stringify(result));
    assert.deepEqual(result.content[0], {
      type: "image",
      data: btoa(String.fromCharCode(...png)),
      mimeType: "image/png",
    });
    assert.deepEqual(JSON.parse(result.content[1].text), {
      format: "png",
      width: 984,
      height: 400,
    });
    assert.equal(sent[0].url, "https://supagist.app/api/render");
    assert.equal(new Headers(sent[0].init.headers).get("authorization"), "Bearer caller-token");
    assert.equal(sent[0].init.redirect, "error");
    const body = JSON.parse(String(sent[0].init.body));
    // Defaults to 2x; the legacy field never leaves the function.
    assert.equal(body.format, "png");
    assert.equal(body.pixelRatio, 2);
    assert.equal(body.code, "const a = 1;");
    assert.ok(!("fixture" in body));

    await call({ code: "x", format: "png", pixelRatio: 1 });
    assert.equal(JSON.parse(String(sent[1].init.body)).pixelRatio, 1);

    const invalid = await call({ code: "bad", format: "png" });
    assert.ok(invalid.isError);
    assert.equal(invalid.content[0].text, "Unsupported theme: drakula");

    const down = await call({ code: "down", format: "png" });
    assert.ok(down.isError);
    assert.ok(down.content[0].text.includes("temporarily unavailable"));
    assert.ok(!down.content[0].text.includes("bad gateway"));

    const before = sent.length;
    const anonymous = await call({ code: "x", format: "png" }, null);
    assert.ok(anonymous.isError);
    assert.equal(sent.length, before);
  } finally {
    globalThis.fetch = realFetch;
  }
});

Deno.test("update_snippet and delete_snippet are owner-only, destructive and take a link", async () => {
  const { tools } = await rpc("tools/list");
  const byName = Object.fromEntries(tools.map((t: { name: string }) => [t.name, t]));
  for (const name of ["update_snippet", "delete_snippet"]) {
    const tool = byName[name];
    assert.equal(tool.annotations.readOnlyHint, false, name);
    assert.equal(tool.annotations.destructiveHint, true, name);
    assert.ok(tool.inputSchema.required.includes("snippet"), name);
    assert.ok(tool.description.includes("owns"), name);
  }
  // Published snippets are sealed: only the title and visibility can change.
  assert.deepEqual(Object.keys(byName.update_snippet.inputSchema.properties).sort(), [
    "snippet",
    "title",
    "visibility",
  ]);
  assert.ok(byName.update_snippet.description.includes("redacted"));
  assert.deepEqual(Object.keys(byName.delete_snippet.inputSchema.properties), ["snippet"]);
});

Deno.test("signed-out callers cannot update or delete", async () => {
  for (const [name, args] of [
    ["update_snippet", { snippet: "https://supagist.app/a-abc123", title: "x" }],
    ["delete_snippet", { snippet: "https://supagist.app/a-abc123" }],
  ] as const) {
    const result = await rpc("tools/call", { name, arguments: args });
    assert.equal(result.isError, true, name);
    assert.match(result.content[0].text, /Sign in/);
  }
});
