// Real HTTP/Auth/RPC/render E2E. Hosted mode ONLY uses an existing test account.
// No admin API, signup, direct database writes, or limiter resets in hosted mode.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { localSession } from "./local.mjs";

const hosted = process.argv.includes("--production");
const directory = `.amp/in/artifacts/mcp-rate-limit/${hosted ? "production" : "local"}`;
await mkdir(directory, { recursive: true });
const transcript = [];
const output = [];
function log(text) {
  output.push(text);
  console.log(text);
}

let endpoint;
let token;
if (hosted) {
  endpoint = "https://zivpihasridowvzrgiix.supabase.co/functions/v1/mcp";
  token = process.env.MCP_TEST_ACCESS_TOKEN;
  if (!token) {
    const {
      MCP_TEST_EMAIL: email,
      MCP_TEST_PASSWORD: password,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
    } = process.env;
    if (!email || !password || !key) {
      log(
        "BLOCKED: no existing hosted test bearer token or test-account email/password + publishable key. No sign-in or tool calls attempted; no hosted users created.",
      );
      await writeFile(`${directory}/output.txt`, output.join("\n") + "\n");
      process.exit(2);
    }
    const client = createClient("https://zivpihasridowvzrgiix.supabase.co", key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    assert.ok(
      !error && data.session,
      "Existing hosted test-account sign-in failed (credentials not logged)",
    );
    token = data.session.access_token;
  }
} else {
  const session = await localSession();
  endpoint = `${session.config.API_URL}/functions/v1/mcp`;
  token = session.token;
}

let id = 0;
async function call(method, params = {}, bearer = token) {
  const body = { jsonrpc: "2.0", id: ++id, method, params };
  const headers = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    "mcp-protocol-version": "2025-06-18",
    ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
  };
  const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await response.text();
  const event = text.split("\n").find((line) => line.startsWith("data: "));
  const data = JSON.parse(event ? event.slice(6) : text);
  transcript.push({
    time: new Date().toISOString(),
    request: {
      url: endpoint,
      method: "POST",
      headers: { ...headers, authorization: bearer ? "Bearer [REDACTED]" : "[absent]" },
      body,
    },
    response: {
      status: response.status,
      headers: Object.fromEntries(
        [
          "content-type",
          "retry-after",
          "www-authenticate",
          "sb-request-id",
          "x-deno-execution-id",
        ].map((name) => [name, response.headers.get(name)]),
      ),
      body: data,
    },
  });
  log(
    `${method}${params.name ? ` ${params.name} ${params.arguments?.format ?? ""}` : ""}: HTTP ${response.status}${response.headers.has("retry-after") ? ` Retry-After=${response.headers.get("retry-after")}` : ""}`,
  );
  return { response, data };
}

function success(result) {
  assert.equal(result.response.status, 200, JSON.stringify(result.data));
  assert.ok(!result.data.error && !result.data.result?.isError, JSON.stringify(result.data));
}

try {
  assert.equal((await call("tools/list", {}, null)).response.status, 401);
  success(
    await call("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "supagist-rate-limit-proof", version: "1" },
    }),
  );
  const tools = await call("tools/list");
  success(tools);
  assert.ok(tools.data.result.tools.some((tool) => tool.name === "render_snippet"));
  for (let i = 0; i < 5; i++) {
    const format = i === 1 ? "png" : "svg";
    const result = await call("tools/call", {
      name: "render_snippet",
      arguments: {
        code: "const answer = 42;",
        language: "javascript",
        theme: "github_dark",
        format,
        pixelRatio: 1,
      },
    });
    success(result);
    const item = result.data.result.content[0];
    if (format === "svg") assert.ok(item.text.includes("<svg") && item.text.includes("answer"));
    else assert.equal(Buffer.from(item.data, "base64").subarray(1, 4).toString(), "PNG");
    if (i < 2)
      await writeFile(
        `${directory}/small.${format}`,
        format === "png" ? Buffer.from(item.data, "base64") : item.text,
      );
  }
  // Invalid code here also proves rate limiting precedes SDK validation/tool work.
  const denied = await call("tools/call", {
    name: "render_snippet",
    arguments: { code: "", format: "svg", pixelRatio: 1 },
  });
  assert.equal(denied.response.status, 429);
  assert.equal(denied.response.headers.get("retry-after"), "60");
  assert.deepEqual(denied.data.result, {
    isError: true,
    content: [{ type: "text", text: "Rate limit reached. Need more? Contact supagist@leandro.io" }],
  });
  success(await call("tools/list"));
  success(await call("tools/call", { name: "list_options", arguments: {} }));
  log(
    "PASS: real signed-in initialize/list, small SVG + PNG at 1x, first 5 renders allowed, render 6 denied before validation, other tools still available.",
  );
} finally {
  await writeFile(`${directory}/transcript.json`, JSON.stringify(transcript, null, 2) + "\n");
  await writeFile(`${directory}/output.txt`, output.join("\n") + "\n");
}
