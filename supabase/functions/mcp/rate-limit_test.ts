import { strict as assert } from "node:assert";
import { enforceRateLimits } from "./rate-limit.ts";

const message = "Rate limit reached. Need more? Contact supagist@leandro.io";
const ownerId = "288417c7-4c03-4277-988f-24f3c2fc814b";

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
  ["mcp:user:alice:m", 5, 60, "list_options"],
  ["mcp:user:alice:d", 100, 86400, "list_options"],
  ["mcp:ip:192.0.2.1:m", 20, 60, "list_options"],
  ["mcp:ip:192.0.2.1:d", 300, 86400, "list_options"],
  ["mcp:render:alice:m", 3, 60, "render_snippet"],
  ["mcp:render:alice:d", 20, 86400, "render_snippet"],
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
  db.seed("mcp:user:alice:m", 5);
  await limited(
    await enforceRateLimits(
      request("list_options", { "x-forwarded-for": "192.0.2.2" }),
      "alice",
      db,
    ),
    60,
  );
  assert.equal(await enforceRateLimits(request(), "bob", db), null);
  db.seed("mcp:ip:192.0.2.1:m", 20);
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
  for (let i = 0; i < 3; i++)
    assert.equal(await enforceRateLimits(request("render_snippet"), "alice", db), null);
  await limited(await enforceRateLimits(request("render_snippet"), "alice", db), 60);
  // The denied render still used a fourth of five user tool calls.
  assert.equal(await enforceRateLimits(request(), "alice", db), null);
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
    db.seed(`mcp:ip:${Object.keys(headers).length ? "192.0.2.1" : "unknown"}:m`, 20);
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

const setupBodies = [
  JSON.stringify({ jsonrpc: "2.0", id: 5, method: "initialize" }),
  JSON.stringify({ jsonrpc: "2.0", id: 5, method: "tools/list" }),
  JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
  "not JSON",
  undefined,
];
const setupRequest = (body: string | undefined) =>
  new Request("http://localhost/mcp", {
    headers: { "x-forwarded-for": "192.0.2.1" },
    ...(body ? { method: "POST", body } : {}),
  });

Deno.test("initialize, list, notifications, malformed bodies, and GET consume IP quota only", async () => {
  for (const body of setupBodies) {
    const db = fakeRpc();
    db.seed("mcp:user:alice:m", 5);
    db.seed("mcp:user:alice:d", 100);
    assert.equal(await enforceRateLimits(setupRequest(body), "alice", db), null);
    db.seed("mcp:ip:192.0.2.1:m", 20);
    const response = await enforceRateLimits(setupRequest(body), "alice", db);
    assert.equal(response?.status, 429);
    assert.equal((await response!.json()).error.message, message);
  }
});

Deno.test("many fresh connections on one account do not limit the first tool call", async () => {
  const db = fakeRpc();
  // Five clients connect from different egress IPs, each sending every setup message.
  for (let client = 0; client < 5; client++)
    for (const body of setupBodies)
      assert.equal(
        await enforceRateLimits(
          new Request(setupRequest(body), { headers: { "x-forwarded-for": `192.0.2.${client}` } }),
          "alice",
          db,
        ),
        null,
      );
  // 25 setup requests exceed the 5/minute user cap if setup were charged to it.
  for (let i = 0; i < 5; i++) assert.equal(await enforceRateLimits(request(), "alice", db), null);
  await limited(await enforceRateLimits(request(), "alice", db), 60);
});

Deno.test("daily denial wins Retry-After when multiple windows are exhausted", async () => {
  const db = fakeRpc();
  db.seed("mcp:user:alice:m", 5);
  db.seed("mcp:ip:192.0.2.1:d", 300);
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

Deno.test("owner bypasses exhausted user, render, and IP quotas without charging other users", async () => {
  const db = fakeRpc();
  for (const key of [`mcp:user:${ownerId}`, `mcp:render:${ownerId}`, "mcp:ip:192.0.2.1"])
    for (const window of ["m", "d"]) db.seed(`${key}:${window}`, 1000);
  for (const tool of ["list_options", "render_snippet"]) {
    const req = request(tool);
    assert.equal(await enforceRateLimits(req, ownerId, db), null);
    assert.equal((await req.json()).params.name, tool);
  }
  await limited(await enforceRateLimits(request(), "alice", db), 86400);

  const sharedIp = fakeRpc();
  sharedIp.seed("mcp:ip:192.0.2.1:m", 19);
  assert.equal(await enforceRateLimits(request(), ownerId, sharedIp), null);
  assert.equal(await enforceRateLimits(request(), "alice", sharedIp), null);
  await limited(await enforceRateLimits(request(), "bob", sharedIp), 60);
});

Deno.test("owner connection setup cannot limit its first tool call; fresh non-owner works under quota", async () => {
  const db = fakeRpc();
  // Several clients initialize under the same account before their first tool call.
  for (let i = 0; i < 6; i++) {
    for (const method of ["initialize", "notifications/initialized", "tools/list"]) {
      const req = new Request("http://localhost/mcp", {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", method }),
      });
      assert.equal(await enforceRateLimits(req, ownerId, db), null);
    }
  }
  assert.equal(await enforceRateLimits(request(), ownerId, db), null);
  assert.equal(await enforceRateLimits(request(), "alice", db), null);
});

Deno.test("legacy batches cannot bypass per-render quotas", async () => {
  const req = new Request("http://localhost/mcp", {
    method: "POST",
    body: JSON.stringify(
      Array.from({ length: 6 }, (_, id) => ({
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
  const ownerResponse = await enforceRateLimits(req, ownerId, fakeRpc());
  assert.equal(ownerResponse?.status, 400);
  assert.equal((await ownerResponse!.json()).error.code, -32600);
});
