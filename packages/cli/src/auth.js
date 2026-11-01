// Sign-in for publishing. The CLI is its own OAuth 2.1 public client of
// Supabase Auth, discovered from the server's MCP endpoint like any MCP client:
// dynamic registration, PKCE (S256) and a loopback redirect. It never borrows
// the browser's session: with refresh-token rotation, two clients refreshing
// the same token would revoke it and sign the user out everywhere.
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";

const LOGIN_TIMEOUT_MS = 5 * 60_000;
// Refresh a little early so a token can't expire in flight.
const REFRESH_MARGIN_MS = 60_000;

export class AuthError extends Error {
  /** @param {string} message @param {string} [code] */
  constructor(message, code = "AUTH_REQUIRED") {
    super(message);
    this.code = code;
  }
}

/**
 * @typedef {{
 *   host: string,
 *   issuer: string,
 *   tokenEndpoint: string,
 *   clientId: string,
 *   accessToken: string,
 *   refreshToken: string,
 *   expiresAt: number,
 * }} Credentials
 * @typedef {{
 *   env: Record<string, string | undefined>,
 *   fetch: typeof fetch,
 *   stderr: { write(chunk: string): unknown },
 *   openUrl?: (url: string) => unknown,
 *   now?: () => number,
 * }} AuthIo
 */

/** ~/.config/supagist/<host>.json, one file per server. @param {string} host @param {AuthIo["env"]} env */
export function credentialsPath(host, env) {
  const base = env.XDG_CONFIG_HOME || join(env.HOME || homedir(), ".config");
  return join(base, "supagist", `${new URL(host).host.replace(":", "_")}.json`);
}

/** @param {string} host @param {AuthIo} io @returns {Promise<Credentials | null>} */
export async function loadCredentials(host, io) {
  try {
    return JSON.parse(await readFile(credentialsPath(host, io.env), "utf8"));
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === "ENOENT") return null;
    throw error;
  }
}

/** @param {Credentials} credentials @param {AuthIo} io */
async function saveCredentials(credentials, io) {
  const path = credentialsPath(credentials.host, io.env);
  await mkdir(join(path, ".."), { recursive: true, mode: 0o700 });
  // Mode applies on create; the rm keeps an older, looser file from surviving.
  await rm(path, { force: true });
  await writeFile(path, `${JSON.stringify(credentials, null, 2)}\n`, { mode: 0o600 });
}

/** @param {string} host @param {AuthIo} io */
export async function removeCredentials(host, io) {
  await rm(credentialsPath(host, io.env), { force: true });
}

/** Claims for display only; the server verifies tokens. @param {string} token */
export function tokenClaims(token) {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

/** @param {AuthIo} io @param {string} url @param {RequestInit} [init] */
async function getJson(io, url, init) {
  let response;
  try {
    response = await io.fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
  } catch (error) {
    throw new AuthError(
      `Could not reach ${new URL(url).origin}: ${error?.message ?? error}`,
      "NETWORK_ERROR",
    );
  }
  const body = await response.json().catch(() => null);
  return { response, body };
}

/**
 * Finds the authorization server the way MCP clients do: the unauthenticated
 * MCP endpoint answers 401 with its protected-resource metadata URL.
 * @param {string} host @param {AuthIo} io
 */
export async function discover(host, io) {
  const resource = `${host}/mcp`;
  const { response } = await getJson(io, resource);
  const challenge = response.headers.get("www-authenticate") ?? "";
  const marker = 'resource_metadata="';
  const start = challenge.indexOf(marker);
  if (response.status !== 401 || start === -1) {
    throw new AuthError(
      `${host} does not offer sign-in (no OAuth challenge at /mcp).`,
      "AUTH_UNAVAILABLE",
    );
  }
  const metadataUrl = challenge.slice(
    start + marker.length,
    challenge.indexOf('"', start + marker.length),
  );
  const { body: resourceMetadata } = await getJson(io, metadataUrl);
  const issuer = resourceMetadata?.authorization_servers?.[0];
  if (typeof issuer !== "string")
    throw new AuthError(`${host} lists no authorization server.`, "AUTH_UNAVAILABLE");
  // RFC 8414 inserts the well-known segment before the issuer's path; local
  // Supabase only serves it appended, so try that second.
  const issuerUrl = new URL(issuer);
  const path = issuerUrl.pathname.replace(/\/$/, "");
  let server;
  for (const url of [
    `${issuerUrl.origin}/.well-known/oauth-authorization-server${path}`,
    `${issuerUrl.origin}${path}/.well-known/oauth-authorization-server`,
  ]) {
    ({ body: server } = await getJson(io, url));
    if (server?.issuer) break;
  }
  for (const field of ["authorization_endpoint", "token_endpoint", "registration_endpoint"]) {
    if (typeof server?.[field] !== "string") {
      throw new AuthError(
        `The authorization server for ${host} has no ${field}.`,
        "AUTH_UNAVAILABLE",
      );
    }
  }
  return {
    issuer,
    authorizationEndpoint: /** @type {string} */ (server.authorization_endpoint),
    tokenEndpoint: /** @type {string} */ (server.token_endpoint),
    registrationEndpoint: /** @type {string} */ (server.registration_endpoint),
  };
}

/** @param {AuthIo} io @param {string} endpoint @param {Record<string, string>} form */
async function tokenRequest(io, endpoint, form) {
  const { response, body } = await getJson(io, endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form),
  });
  if (!response.ok || typeof body?.access_token !== "string") {
    const reason = body?.error_description ?? body?.error ?? `HTTP ${response.status}`;
    throw new AuthError(`Sign-in failed: ${reason}. Run supagist auth login.`);
  }
  return /** @type {{ access_token: string, refresh_token: string, expires_in?: number }} */ (body);
}

/**
 * Waits on a loopback port for the authorization server's redirect.
 * @returns {Promise<{ redirectUri: string, code: Promise<string>, close(): void }>}
 */
async function listenForCode(/** @type {string} */ state) {
  /** @type {(code: string) => void} */ let resolve = () => {};
  /** @type {(error: Error) => void} */ let reject = () => {};
  const code = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname !== "/callback") {
      res.writeHead(404).end();
      return;
    }
    const error = url.searchParams.get("error");
    const ok = !error && url.searchParams.get("state") === state && url.searchParams.get("code");
    res
      .writeHead(ok ? 200 : 400, { "content-type": "text/html; charset=utf-8" })
      .end(
        ok
          ? "<!doctype html><title>Supagist</title><p>Signed in to the Supagist CLI. You can close this tab.</p>"
          : "<!doctype html><title>Supagist</title><p>Sign-in did not complete. Return to the terminal.</p>",
      );
    if (ok) resolve(/** @type {string} */ (url.searchParams.get("code")));
    else if (error)
      reject(
        new AuthError(
          `Sign-in was not approved: ${url.searchParams.get("error_description") ?? error}.`,
          "AUTH_DENIED",
        ),
      );
    else
      reject(
        new AuthError(
          "Sign-in returned an unexpected state. Run supagist auth login again.",
          "AUTH_DENIED",
        ),
      );
  });
  await new Promise((res) => server.listen(0, "127.0.0.1", () => res(undefined)));
  const timer = setTimeout(
    () => reject(new AuthError("Sign-in timed out after 5 minutes.", "AUTH_TIMEOUT")),
    LOGIN_TIMEOUT_MS,
  );
  const address = /** @type {import("node:net").AddressInfo} */ (server.address());
  return {
    redirectUri: `http://127.0.0.1:${address.port}/callback`,
    code,
    close() {
      clearTimeout(timer);
      server.close();
      server.closeAllConnections();
    },
  };
}

/** @param {string} host @param {AuthIo} io @returns {Promise<Credentials>} */
export async function login(host, io) {
  const server = await discover(host, io);
  const state = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const callback = await listenForCode(state);
  try {
    const { response, body: client } = await getJson(io, server.registrationEndpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_name: "Supagist CLI",
        redirect_uris: [callback.redirectUri],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      }),
    });
    if (!response.ok || typeof client?.client_id !== "string") {
      throw new AuthError(
        `Could not register the CLI with ${host} (HTTP ${response.status}).`,
        "AUTH_UNAVAILABLE",
      );
    }
    const authorize = new URL(server.authorizationEndpoint);
    authorize.search = new URLSearchParams({
      response_type: "code",
      client_id: client.client_id,
      redirect_uri: callback.redirectUri,
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    }).toString();
    io.stderr.write(
      `A browser tab is waiting for you to sign in and approve the Supagist CLI.\nIf it didn't open, visit:\n\n  ${authorize.href}\n\n`,
    );
    await Promise.resolve(io.openUrl?.(authorize.href)).catch(() => {});
    const code = await callback.code;
    const tokens = await tokenRequest(io, server.tokenEndpoint, {
      grant_type: "authorization_code",
      code,
      client_id: client.client_id,
      redirect_uri: callback.redirectUri,
      code_verifier: verifier,
    });
    const credentials = {
      host,
      issuer: server.issuer,
      tokenEndpoint: server.tokenEndpoint,
      clientId: client.client_id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: (io.now ?? Date.now)() + (tokens.expires_in ?? 3600) * 1000,
    };
    await saveCredentials(credentials, io);
    return credentials;
  } finally {
    callback.close();
  }
}

/**
 * A valid access token for host, refreshed (and the rotated pair saved) when
 * it is about to expire.
 * @param {string} host @param {AuthIo} io
 */
export async function accessToken(host, io) {
  const credentials = await loadCredentials(host, io);
  if (!credentials) throw new AuthError(`Not signed in to ${host}. Run supagist auth login.`);
  const now = (io.now ?? Date.now)();
  if (credentials.expiresAt - REFRESH_MARGIN_MS > now) return credentials.accessToken;
  const tokens = await tokenRequest(io, credentials.tokenEndpoint, {
    grant_type: "refresh_token",
    refresh_token: credentials.refreshToken,
    client_id: credentials.clientId,
  });
  const refreshed = {
    ...credentials,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? credentials.refreshToken,
    expiresAt: now + (tokens.expires_in ?? 3600) * 1000,
  };
  await saveCredentials(refreshed, io);
  return refreshed.accessToken;
}

/**
 * Ends the CLI's own session on the server (best effort) and forgets it.
 * @param {string} host @param {AuthIo} io
 * @returns {Promise<{ signedOut: boolean, revoked: boolean }>}
 */
export async function logout(host, io) {
  const credentials = await loadCredentials(host, io);
  if (!credentials) return { signedOut: false, revoked: false };
  let revoked = false;
  try {
    const token = await accessToken(host, io);
    // Hosted Supabase Auth also wants the project's public apikey.
    const { body: options } = await getJson(io, `${host}/api/options`);
    const apikey = options?.supabase?.publishableKey;
    const response = await io.fetch(`${credentials.issuer.replace(/\/$/, "")}/logout?scope=local`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        ...(typeof apikey === "string" ? { apikey } : {}),
      },
      signal: AbortSignal.timeout(30_000),
    });
    revoked = response.ok;
  } catch {
    // An expired or already revoked session still gets forgotten locally.
  }
  await removeCredentials(host, io);
  return { signedOut: true, revoked };
}
