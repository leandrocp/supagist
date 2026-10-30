// Local-only end-to-end OAuth and MCP check. Requires Next on port 3000,
// `supabase start`, and `supabase functions serve mcp`. Never touches hosted data.
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { localSession, rpc } from "./local.mjs";

const endpoint = "http://127.0.0.1:3000/mcp";
const { client } = await localSession();
let result = await rpc(endpoint, null, "tools/list");
assert.equal(result.response.status, 401);
assert.equal(
  result.response.headers.get("www-authenticate"),
  `Bearer resource_metadata="${endpoint}/oauth-protected-resource"`,
);
const resource = await (await fetch(`${endpoint}/oauth-protected-resource`)).json();
assert.equal(resource.resource, endpoint);
// Token refresh without a 401 in hand discovers through RFC 9728 well-known URLs.
for (const path of [
  "/.well-known/oauth-protected-resource/mcp",
  "/.well-known/oauth-protected-resource",
]) {
  assert.deepEqual(await (await fetch(new URL(path, endpoint))).json(), resource);
}
assert.equal(resource.authorization_servers[0], "http://127.0.0.1:54321/auth/v1");
const discovery = await (
  await fetch(`${resource.authorization_servers[0]}/.well-known/oauth-authorization-server`)
).json();
assert.equal(discovery.issuer, resource.authorization_servers[0]);
for (const key of ["registration_endpoint", "authorization_endpoint", "token_endpoint"]) {
  assert.equal(new URL(discovery[key]).origin, "http://127.0.0.1:54321");
}

const callback = "http://127.0.0.1:3333/callback";
const registration = await fetch(discovery.registration_endpoint, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    client_name: "Local branded MCP verification",
    redirect_uris: [callback],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  }),
});
assert.equal(registration.status, 201);
const registered = await registration.json();
const verifier = randomBytes(32).toString("base64url");
const authorization = new URL(discovery.authorization_endpoint);
authorization.search = new URLSearchParams({
  client_id: registered.client_id,
  redirect_uri: callback,
  response_type: "code",
  code_challenge: createHash("sha256").update(verifier).digest("base64url"),
  code_challenge_method: "S256",
  scope: "openid email profile",
  state: "local-proxy-test",
  resource: endpoint,
}).toString();
const authorize = await fetch(authorization, { redirect: "manual" });
assert.equal(authorize.status, 302);
const consent = new URL(authorize.headers.get("location"));
assert.equal(consent.pathname, "/oauth/consent");
const authorizationId = consent.searchParams.get("authorization_id");
assert.ok(authorizationId);
const details = await client.auth.oauth.getAuthorizationDetails(authorizationId);
assert.equal(details.error, null);
const approval = await client.auth.oauth.approveAuthorization(authorizationId, {
  skipBrowserRedirect: true,
});
assert.equal(approval.error, null);
const redirect = new URL(approval.data.redirect_url);
assert.equal(redirect.searchParams.get("state"), "local-proxy-test");
const exchange = await fetch(discovery.token_endpoint, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "authorization_code",
    code: redirect.searchParams.get("code"),
    client_id: registered.client_id,
    redirect_uri: callback,
    code_verifier: verifier,
    resource: endpoint,
  }),
});
assert.equal(exchange.status, 200);
const granted = await exchange.json();
assert.ok(granted.access_token);

// Refresh as a client with no 401 in hand: discovery starts at the well-known URL.
const refreshDiscovery = await (
  await fetch(new URL("/.well-known/oauth-protected-resource/mcp", endpoint))
).json();
const refreshIssuer = await (
  await fetch(`${refreshDiscovery.authorization_servers[0]}/.well-known/oauth-authorization-server`)
).json();
const refresh = await fetch(refreshIssuer.token_endpoint, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: granted.refresh_token,
    client_id: registered.client_id,
    resource: endpoint,
  }),
});
assert.equal(refresh.status, 200);
const { access_token: token } = await refresh.json();
assert.ok(token);

result = await rpc(endpoint, token, "initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "local-proxy-test", version: "1" },
});
assert.equal(result.response.status, 200);
assert.ok(result.data.result.serverInfo);
result = await rpc(endpoint, token, "tools/list");
assert.equal(result.response.status, 200);
assert.deepEqual(result.data.result.tools.map((tool) => tool.name).sort(), [
  "list_options",
  "render_snippet",
]);
result = await rpc(endpoint, token, "tools/call", {
  name: "render_snippet",
  arguments: {
    code: "const answer = 42;",
    language: "javascript",
    brand: "supabase",
    format: "svg",
    pixelRatio: 1,
  },
});
assert.equal(result.response.status, 200);
assert.ok(!result.data.result.isError);
assert.ok(result.data.result.content[0].text.includes("<svg"));
console.log(
  "PASS: branded discovery → registration → PKCE/consent → OAuth token → well-known refresh → tools → SVG",
);

result = await rpc(endpoint, "invalid", "tools/list");
assert.equal(result.response.status, 401);
assert.ok(result.response.headers.get("www-authenticate").includes(endpoint));
const anonymous = await client.auth.signInAnonymously();
assert.equal(anonymous.error, null);
result = await rpc(endpoint, anonymous.data.session.access_token, "tools/list");
assert.equal(result.response.status, 403);
// Only tool calls are charged to the user quota; connection setup is not.
for (let i = 0; i < 13; i++) {
  result = await rpc(endpoint, token, "tools/call", { name: "list_options", arguments: {} });
}
assert.equal(result.response.status, 429);
assert.ok(Number(result.response.headers.get("retry-after")) > 0);
console.log("PASS: invalid bearer 401, anonymous 403, rate limit 429 + Retry-After through proxy");
