/**
 * The `npx supagist auth login` handshake, shared by both halves.
 *
 * 1. The CLI generates a random `state`, binds a loopback listener, and opens
 *    `/auth/cli?port=<port>&state=<state>` in the browser.
 * 2. The page signs the user in if needed, then asks for explicit consent.
 * 3. On approval the page POSTs the Supabase session to
 *    `http://127.0.0.1:<port>/callback`, echoing `state` back.
 * 4. The CLI accepts the first callback whose `state` matches, then closes.
 *
 * The session travels in a request body rather than a redirect query string so
 * the refresh token never lands in browser history, and the `state` echo is
 * what stops an unrelated page from posting a session into a listener it did
 * not open.
 */

export const CLI_CALLBACK_PATH = "/callback";

/** Loopback listeners must be unprivileged; 0 would mean "any free port". */
export const CLI_MIN_PORT = 1024;
export const CLI_MAX_PORT = 65535;

export const CLI_STATE_BYTES = 32;
const STATE_MIN_LENGTH = 16;
const STATE_MAX_LENGTH = 128;

export type CliSessionPayload = {
  state: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  username: string | null;
};

/** Narrow the untrusted `port` query param to a usable loopback port. */
export function parseCliPort(value: string | null | undefined): number | null {
  if (typeof value !== "string" || !/^\d{1,5}$/.test(value)) return null;
  const port = Number.parseInt(value, 10);
  return port >= CLI_MIN_PORT && port <= CLI_MAX_PORT ? port : null;
}

/**
 * Narrow the untrusted `state` query param. Restricting to base64url keeps it
 * safe to echo into markup and into the callback URL without escaping games.
 */
export function parseCliState(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  if (value.length < STATE_MIN_LENGTH || value.length > STATE_MAX_LENGTH) return null;
  return /^[A-Za-z0-9_-]+$/.test(value) ? value : null;
}

export function cliCallbackUrl(port: number): string {
  return `http://127.0.0.1:${port}${CLI_CALLBACK_PATH}`;
}

/** The in-app path the CLI opens, used by the CLI and by the login round-trip. */
export function cliAuthorizePath(port: number, state: string): string {
  return `/auth/cli?port=${port}&state=${encodeURIComponent(state)}`;
}

/** Validates a callback body received by the CLI's loopback listener. */
export function parseCliSessionPayload(
  raw: unknown,
  expectedState: string,
): CliSessionPayload | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const body = raw as Record<string, unknown>;

  const state = typeof body.state === "string" ? body.state : null;
  // Length-independent equality is not meaningful here — `state` is a
  // single-use, in-memory value on a loopback socket — but the match itself is
  // what binds the callback to this CLI invocation.
  if (!state || state !== expectedState) return null;

  const accessToken = typeof body.accessToken === "string" ? body.accessToken : "";
  const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : "";
  if (!accessToken || !refreshToken) return null;

  return {
    state,
    accessToken,
    refreshToken,
    expiresAt: typeof body.expiresAt === "number" ? body.expiresAt : null,
    username: typeof body.username === "string" ? body.username : null,
  };
}
