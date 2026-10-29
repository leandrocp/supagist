import { strict as assert } from "node:assert";
import { enforceRateLimits } from "./rate-limit.ts";

const message = "Rate limit reached. Need more? Contact supagist@leandro.io";

// Fake only the I/O boundary; model the existing RPC's first-use windows and
// inclusive cap. No network, database, or renderer is needed for these tests.
function fakeRpc() {
  let now = 0;
  const buckets = new Map<string, { start: number; count: number }>();
  return {
    advance: (seconds: number) => (now += seconds),
    seed: (key: string, count: number) => buckets.set(key, { start: now, count }),
    rpc: (_name: string, args: { p_key: string; p_max: number; p_window: string }) => {
      const window = Number(args.p_window.split(" ")[0]);
      let bucket = buckets.get(args.p_key);
      if (!bucket || bucket.start + window < now) {
        bucket = { start: now, count: 0 };
        buckets.set(args.p_key, bucket);
      }
      return Promise.resolve({ data: ++bucket.count <= args.p_max, error: null });
    },
  };
}

function request(tool = "list_options", headers = { "x-forwarded-for": "192.0.2.1" }) {
  return new Request("http://localhost/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "request-7",
      method: "tools/call",
      params: { name: tool },
    }),
  });
}

async function limited(response: Response | null, retry: number) {
  assert.ok(response);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), String(retry));
  assert.deepEqual(await response.json(), {
    jsonrpc: "2.0",
    id: "request-7",
    result: { isError: true, content: [{ type: "text", text: message }] },
  });
}

for (const [key, cap, retry, tool] of [
  ["mcp:user:alice:m", 30, 60, "list_options"],
  ["mcp:user:alice:d", 1000, 86400, "list_options"],
  ["mcp:ip:192.0.2.1:m", 60, 60, "list_options"],
  ["mcp:ip:192.0.2.1:d", 2000, 86400, "list_options"],
  ["mcp:render:alice:m", 10, 60, "render_snippet"],
  ["mcp:render:alice:d", 100, 86400, "render_snippet"],
] as const) {
  Deno.test(`${key}: under/at cap allowed, next denied with HTTP and MCP error`, async () => {
    const db = fakeRpc();
    db.seed(key, cap - 2);
    assert.equal(await enforceRateLimits(request(tool), "alice", db), null);
    assert.equal(await enforceRateLimits(request(tool), "alice", db), null);
    await limited(await enforceRateLimits(request(tool), "alice", db), retry);
    // A new window really permits another request.
    db.advance(retry + 1);
    assert.equal(await enforceRateLimits(request(tool), "alice", db), null);
  });
}

Deno.test("user quotas follow users across IPs; IP quotas aggregate different users", async () => {
  const db = fakeRpc();
  db.seed("mcp:user:alice:m", 30);
  await limited(
    await enforceRateLimits(
      request("list_options", { "x-forwarded-for": "192.0.2.2" }),
      "alice",
      db,
    ),
    60,
  );
  assert.equal(await enforceRateLimits(request(), "bob", db), null);
  db.seed("mcp:ip:192.0.2.1:m", 60);
  await limited(await enforceRateLimits(request(), "charlie", db), 60);
  assert.equal(
    await enforceRateLimits(
      request("list_options", { "x-forwarded-for": "192.0.2.3" }),
      "charlie",
      db,
    ),
    null,
  );
});

Deno.test("render quota is tighter, does not block other tools, and still consumes global quotas", async () => {
  const db = fakeRpc();
  for (let i = 0; i < 10; i++)
    assert.equal(await enforceRateLimits(request("render_snippet"), "alice", db), null);
  await limited(await enforceRateLimits(request("render_snippet"), "alice", db), 60);
  for (let i = 0; i < 19; i++) assert.equal(await enforceRateLimits(request(), "alice", db), null);
  await limited(await enforceRateLimits(request(), "alice", db), 60);
});

Deno.test("first forwarded hop takes precedence, then Cloudflare, then real-IP, then shared unknown", async () => {
  for (const headers of [
    {
      "x-forwarded-for": " 192.0.2.1 , 192.0.2.9",
      "cf-connecting-ip": "192.0.2.8",
      "x-real-ip": "192.0.2.7",
    },
    { "cf-connecting-ip": "192.0.2.1", "x-real-ip": "192.0.2.7" },
    { "x-real-ip": "192.0.2.1" },
    {},
  ]) {
    const db = fakeRpc();
    db.seed(`mcp:ip:${Object.keys(headers).length ? "192.0.2.1" : "unknown"}:m`, 60);
    await limited(
      await enforceRateLimits(
        new Request(request(), { headers: headers as HeadersInit }),
        "alice",
        db,
      ),
      60,
    );
  }
});

Deno.test("initialize, list, notifications, malformed bodies, and GET all consume global quota", async () => {
  for (const body of [
    JSON.stringify({ jsonrpc: "2.0", id: 5, method: "initialize" }),
    JSON.stringify({ jsonrpc: "2.0", id: 5, method: "tools/list" }),
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    "not JSON",
    undefined,
  ]) {
    const db = fakeRpc();
    db.seed("mcp:user:alice:m", 30);
    const response = await enforceRateLimits(
      new Request("http://localhost/mcp", body ? { method: "POST", body } : {}),
      "alice",
      db,
    );
    assert.equal(response?.status, 429);
    assert.equal((await response!.json()).error.message, message);
  }
});

Deno.test("daily denial wins Retry-After when multiple windows are exhausted", async () => {
  const db = fakeRpc();
  db.seed("mcp:user:alice:m", 30);
  db.seed("mcp:ip:192.0.2.1:d", 2000);
  await limited(await enforceRateLimits(request(), "alice", db), 86400);
});

Deno.test("RPC errors, exceptions, and unexpected data fail closed without leaking details", async () => {
  for (const rpc of [
    () => Promise.resolve({ data: null, error: { message: "secret details" } }),
    () => Promise.reject(new Error("secret details")),
    () => Promise.resolve({ data: null, error: null }),
  ]) {
    const response = await enforceRateLimits(request(), "alice", { rpc });
    assert.equal(response?.status, 503);
    assert.deepEqual(await response!.json(), { error: "Rate limit service unavailable." });
  }
});

Deno.test("allowed request body is preserved for MCP dispatch", async () => {
  const req = request("render_snippet");
  assert.equal(await enforceRateLimits(req, "alice", fakeRpc()), null);
  assert.equal((await req.json()).params.name, "render_snippet");
});

Deno.test("legacy batches cannot bypass per-render quotas", async () => {
  const req = new Request("http://localhost/mcp", {
    method: "POST",
    body: JSON.stringify(
      Array.from({ length: 11 }, (_, id) => ({
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: { name: "render_snippet" },
      })),
    ),
  });
  const response = await enforceRateLimits(req, "alice", fakeRpc());
  assert.equal(response?.status, 400);
  assert.equal((await response!.json()).error.code, -32600);
});
