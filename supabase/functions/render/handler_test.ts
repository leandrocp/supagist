import { strict as assert } from "node:assert";
import { type Context, type Deps, handleRequest } from "./handler.ts";

const ownerId = "288417c7-4c03-4277-988f-24f3c2fc814b";
class InputError extends Error {}

// Fake only the I/O boundaries: the RPC (first-use windows, inclusive cap,
// like public.check_rate_limit), the renderer and the OIDC verifier.
function setup({ fail = false } = {}) {
  const buckets = new Map<string, number>();
  const charged: string[] = [];
  const rendered: unknown[] = [];
  const admin: Context["supabaseAdmin"] = {
    rpc: (_name, args) => {
      charged.push(args.p_key);
      if (fail) return Promise.resolve({ data: null, error: new Error("down") });
      const count = (buckets.get(args.p_key) ?? 0) + 1;
      buckets.set(args.p_key, count);
      return Promise.resolve({ data: count <= args.p_max, error: null });
    },
  };
  const deps: Deps = {
    verifyProxyToken: (token) => Promise.resolve(token === "valid-oidc"),
    render: (input) => {
      rendered.push(input);
      const code = (input as { code: string }).code;
      if (code === "unsupported") return Promise.reject(new InputError("Unsupported theme: nope"));
      if (code === "explode") return Promise.reject(new Error("parser CDN down"));
      return Promise.resolve({ svg: "<svg/>", width: 10, height: 20 });
    },
    options: () => Promise.resolve({ brands: [{ id: "supabase" }] }),
    isInputError: (error) => Promise.resolve(error instanceof InputError),
  };
  const call = (
    init: { method?: string; path?: string; body?: string; headers?: Record<string, string> } = {},
    ctx: Partial<Context> = {},
  ) =>
    handleRequest(
      new Request(`http://localhost/render${init.path ?? ""}`, {
        method: init.method ?? "POST",
        headers: { "cf-connecting-ip": "203.0.113.9", ...init.headers },
        body: init.body ?? (init.method === "GET" ? undefined : JSON.stringify({ code: "x" })),
      }),
      { jwtClaims: null, userClaims: null, supabaseAdmin: admin, ...ctx },
      deps,
    );
  return { call, charged, rendered, buckets };
}

async function error(response: Response, status: number, code: string) {
  assert.equal(response.status, status);
  const body = await response.json();
  assert.equal(body.error.code, code);
  return body.error;
}

Deno.test("renders SVG for an anonymous caller, charging only per-IP buckets", async () => {
  const { call, charged, rendered } = setup();
  const response = await call({ body: JSON.stringify({ code: "const a = 1;", brand: "vercel" }) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/svg+xml; charset=utf-8");
  assert.equal(response.headers.get("x-supagist-width"), "10");
  assert.equal(await response.text(), "<svg/>");
  assert.deepEqual(rendered, [{ code: "const a = 1;", brand: "vercel" }]);
  assert.deepEqual(charged.sort(), [
    "api:ip:203.0.113.9:d",
    "api:ip:203.0.113.9:m",
    "api:render:ip:203.0.113.9:d",
    "api:render:ip:203.0.113.9:m",
  ]);
});

Deno.test("the fourth render in a minute from one IP gets 429, even with a new X-Forwarded-For", async () => {
  const { call, rendered } = setup();
  for (let i = 0; i < 3; i++) assert.equal((await call()).status, 200);
  const denied = await call({ headers: { "x-forwarded-for": "198.51.100.1" } });
  assert.equal(denied.headers.get("retry-after"), "60");
  const body = await error(denied, 429, "RATE_LIMITED");
  assert.equal(body.retryAfter, 60);
  assert.match(body.message, /^Rate limit reached\. Try again in up to 1 minute\./);
  assert.equal(rendered.length, 3);
});

Deno.test("a daily quota denial reports the 24 hour window", async () => {
  const { call, buckets } = setup();
  buckets.set("api:render:ip:203.0.113.9:d", 20);
  const denied = await call();
  assert.equal(denied.headers.get("retry-after"), "86400");
  assert.match((await error(denied, 429, "RATE_LIMITED")).message, /24 hours/);
});

Deno.test("trusts the proxy's client IP only with a verified OIDC token", async () => {
  const { call, charged } = setup();
  await call({
    headers: { "x-supagist-client-ip": "192.0.2.50", "x-supagist-proxy-token": "forged" },
  });
  await call({
    headers: { "x-supagist-client-ip": "192.0.2.50", "x-supagist-proxy-token": "valid-oidc" },
  });
  assert.ok(charged.slice(0, 4).every((key) => key.includes("203.0.113.9")));
  assert.ok(charged.slice(4).every((key) => key.includes("192.0.2.50")));
});

Deno.test("verified users get per-user buckets plus the per-user IP backstop", async () => {
  const { call, charged } = setup();
  assert.equal((await call({}, { userClaims: { id: "alice" } })).status, 200);
  assert.deepEqual(charged.sort(), [
    "api:ip:203.0.113.9:user:alice:d",
    "api:ip:203.0.113.9:user:alice:m",
    "api:render:user:alice:d",
    "api:render:user:alice:m",
    "api:user:alice:d",
    "api:user:alice:m",
  ]);
  for (let i = 0; i < 2; i++) await call({}, { userClaims: { id: "alice" } });
  await error(await call({}, { userClaims: { id: "alice" } }), 429, "RATE_LIMITED");
  // Another account on the same IP keeps its own quota.
  assert.equal((await call({}, { userClaims: { id: "bob" } })).status, 200);
});

Deno.test("the owner account bypasses quotas but not validation", async () => {
  const { call, charged } = setup();
  for (let i = 0; i < 5; i++)
    assert.equal((await call({}, { userClaims: { id: ownerId } })).status, 200);
  assert.deepEqual(charged, []);
  await error(await call({ body: "{}" }, { userClaims: { id: ownerId } }), 400, "INVALID_INPUT");
});

Deno.test("anonymous Auth sessions are refused before any quota or render", async () => {
  const { call, charged } = setup();
  await error(await call({}, { jwtClaims: { is_anonymous: true } }), 403, "FORBIDDEN");
  assert.deepEqual(charged, []);
});

Deno.test("validation errors are 400s and still consume the render quota", async () => {
  const { call, charged, rendered } = setup();
  await error(await call({ body: "not json" }), 400, "INVALID_JSON");
  const tooLong = await error(
    await call({ body: JSON.stringify({ code: Array(31).fill("x").join("\n") }) }),
    400,
    "INVALID_INPUT",
  );
  assert.match(tooLong.message, /^code: Choose an excerpt of at most 30 source lines/);
  assert.deepEqual(tooLong.issues, [
    { path: "code", message: "Choose an excerpt of at most 30 source lines" },
  ]);
  const unknown = await error(
    await call({ body: JSON.stringify({ code: "x", colour: "red" }) }),
    400,
    "INVALID_INPUT",
  );
  assert.match(unknown.message, /colour/);
  // Three invalid attempts used the minute's render quota.
  await error(await call(), 429, "RATE_LIMITED");
  assert.equal(rendered.length, 0);
  assert.equal(charged.filter((key) => key === "api:render:ip:203.0.113.9:m").length, 4);
});

Deno.test("PNG is not an Edge format", async () => {
  const { call } = setup();
  await error(
    await call({ body: JSON.stringify({ code: "x", format: "png" }) }),
    400,
    "INVALID_INPUT",
  );
});

Deno.test("renderer input errors are 400; internal failures are 500", async () => {
  const { call } = setup();
  const unsupported = await error(
    await call({ body: JSON.stringify({ code: "unsupported" }) }),
    400,
    "INVALID_INPUT",
  );
  assert.equal(unsupported.message, "Unsupported theme: nope");
  const failed = await error(
    await call({ body: JSON.stringify({ code: "explode" }) }),
    500,
    "RENDER_FAILED",
  );
  assert.doesNotMatch(failed.message, /CDN/);
});

Deno.test("oversized bodies are rejected before charging or parsing", async () => {
  const { call, charged } = setup();
  await error(
    await call({ body: JSON.stringify({ code: "x".repeat(300 * 1024) }) }),
    413,
    "PAYLOAD_TOO_LARGE",
  );
  assert.deepEqual(charged, []);
});

Deno.test("options are a GET charged to the IP backstop only", async () => {
  const { call, charged } = setup();
  const response = await call({ method: "GET", path: "/options" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { brands: [{ id: "supabase" }] });
  assert.deepEqual(charged.sort(), ["api:ip:203.0.113.9:d", "api:ip:203.0.113.9:m"]);
  const wrong = await call({ method: "POST", path: "/options" });
  assert.equal(wrong.headers.get("allow"), "GET");
  await error(wrong, 405, "METHOD_NOT_ALLOWED");
  await error(await call({ method: "GET" }), 405, "METHOD_NOT_ALLOWED");
  await error(await call({ path: "/publish" }), 404, "NOT_FOUND");
});

Deno.test("an unavailable limiter fails closed with 503", async () => {
  const { call } = setup({ fail: true });
  await error(await call(), 503, "RATE_LIMIT_UNAVAILABLE");
});
