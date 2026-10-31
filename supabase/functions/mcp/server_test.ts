import { strict as assert } from "node:assert";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { createServer, SERVER_INSTRUCTIONS } from "./server.ts";

// Exercise the same handler index.ts serves, through JSON-RPC over HTTP.
async function rpc(method: string, params: Record<string, unknown> = {}) {
  const response = await createMcpHandler(createServer).fetch(
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
  assert.deepEqual(names, ["list_options", "render_snippet"]);
  for (const text of [
    SERVER_INSTRUCTIONS,
    ...tools.map((t: { description: string }) => t.description),
  ]) {
    for (const name of names) assert.ok(!text.includes(name), `${name} named in: ${text}`);
    for (const banned of ["PNG", "locally", "benchmark", "fixture"])
      assert.ok(!text.includes(banned), `${banned} in: ${text}`);
  }
});
