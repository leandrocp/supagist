// Local-only bearer-auth + MCP transport checks. No hosted URL is accepted.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

export function localConfig() {
  const config = JSON.parse(
    execFileSync("mise", ["exec", "supabase", "--", "supabase", "status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
  assert.equal(
    new URL(config.API_URL).hostname,
    "127.0.0.1",
    "Only the disposable local stack is allowed",
  );
  return config;
}

export async function localSession() {
  const config = localConfig();
  const client = createClient(config.API_URL, config.PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signUp({
    email: `m0-${randomUUID()}@supagist.test`,
    password: randomUUID(),
  });
  if (error) throw error;
  assert.ok(data.session);
  const token = data.session.access_token;
  assert.equal(JSON.parse(Buffer.from(token.split(".")[0], "base64url")).alg, "ES256");
  return { config, client, token };
}

let nextId = 0;
export async function rpc(endpoint, token, method, params = {}, headers = {}) {
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(endpoint).hostname), "Local calls only");
  const start = performance.now();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2025-06-18",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++nextId, method, params }),
  });
  const body = await response.text();
  const wallMs = performance.now() - start;
  const data =
    body.startsWith("event:") || body.startsWith("data:")
      ? JSON.parse(
          body
            .split("\n")
            .find((line) => line.startsWith("data: "))
            .slice(6),
        )
      : JSON.parse(body);
  return { response, data, wallMs };
}

export const fixtures = [
  { fixture: "plain", code: 'const greeting = "Hello, Supagist!";\nconsole.log(greeting);' },
  {
    fixture: "vercel",
    code: 'export async function GET() {\n  return Response.json({ framework: "Next.js" });\n}',
  },
  {
    fixture: "avatars",
    code: Array.from(
      { length: 30 },
      (_, i) =>
        `const result${String(i + 1).padStart(2, "0")} = await renderSnippet({ theme: "vercel", pixelRatio: 2 });`,
    ).join("\n"),
  },
];

async function main() {
  const { config, client, token } = await localSession();
  const endpoint = `${config.API_URL}/functions/v1/mcp`;
  const denied = await rpc(endpoint, null, "tools/list");
  assert.equal(denied.response.status, 401);
  assert.ok(
    denied.response.headers
      .get("www-authenticate")
      ?.includes(`${endpoint}/oauth-protected-resource`),
  );
  assert.equal((await rpc(endpoint, "invalid", "tools/list")).response.status, 401);
  const metadata = await (await fetch(`${endpoint}/oauth-protected-resource`)).json();
  assert.equal(metadata.resource, endpoint);
  assert.deepEqual(metadata.authorization_servers, [`${config.API_URL}/auth/v1`]);
  const anonymous = await client.auth.signInAnonymously();
  if (anonymous.error) throw anonymous.error;
  assert.equal(
    (await rpc(endpoint, anonymous.data.session.access_token, "tools/list")).response.status,
    403,
  );
  const tools = await rpc(endpoint, token, "tools/list");
  assert.equal(tools.response.status, 200);
  assert.deepEqual(tools.data.result.tools.map((tool) => tool.name).sort(), [
    "list_options",
    "render_snippet",
  ]);
  assert.ok(tools.data.result.tools.every((tool) => tool.annotations.readOnlyHint));
  const options = await rpc(endpoint, token, "tools/call", { name: "list_options", arguments: {} });
  assert.ok(JSON.parse(options.data.result.content[0].text).languages.includes("javascript"));
  for (const input of [
    { code: "" },
    { code: "x", format: "png" },
    { code: "x", pixelRatio: 3 },
    { code: "x", theme: "missing" },
    { code: "x", language: "missing" },
  ]) {
    const result = await rpc(endpoint, token, "tools/call", {
      name: "render_snippet",
      arguments: input,
    });
    assert.equal(result.response.status, 200, "Validation must not be masked by a rate limit");
    assert.ok(result.data.error || result.data.result?.isError, "Invalid input must fail");
  }
  console.log(
    "PASS: discovery, missing/invalid/anonymous auth, signed-in tools, and input validation",
  );
  const directory = process.argv[2] ?? ".amp/in/artifacts/mcp-svg";
  await mkdir(directory, { recursive: true });
  let renderCount = 5;
  for (const fixture of fixtures) {
    for (const pixelRatio of [1, 2]) {
      for (const format of ["svg"]) {
        if (renderCount === 5) {
          console.log("Waiting for the render minute window...");
          await new Promise((resolve) => setTimeout(resolve, 61_000));
          renderCount = 0;
        }
        renderCount++;
        const result = await rpc(endpoint, token, "tools/call", {
          name: "render_snippet",
          arguments: {
            ...fixture,
            language: "javascript",
            theme: "github_dark",
            pixelRatio,
            format,
          },
        });
        assert.equal(result.response.status, 200);
        assert.ok(!result.data.error && !result.data.result.isError, JSON.stringify(result.data));
        const item = result.data.result.content[0];
        const bytes = Buffer.from(item.text);
        assert.equal(item.type, "text");
        assert.ok(
          item.text.includes("<svg") &&
            (item.text.includes("const") || item.text.includes("export")),
        );
        await writeFile(`${directory}/${fixture.fixture}-${pixelRatio}x.${format}`, bytes);
        console.log(
          `${fixture.fixture} ${pixelRatio}x ${format}: ${bytes.length} bytes, ${result.wallMs.toFixed(1)} ms wall`,
        );
      }
    }
  }
  console.log(
    "PASS: discovery, missing/invalid/anonymous auth, signed-in tools, PNG rejection, and all 6 SVG exports",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
