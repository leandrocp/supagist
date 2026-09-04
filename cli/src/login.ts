import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { writeCredentials, type StoredCredentials } from "./credentials.js";

/**
 * Browser handshake for `supagist auth login`.
 *
 * A short-lived listener binds to 127.0.0.1 (never 0.0.0.0 — nothing off this
 * machine should be able to reach it), the browser opens the consent page with
 * the port and a random state, and the page POSTs the session back. Only a
 * callback echoing the state we generated is accepted, and the listener closes
 * as soon as one arrives.
 */

export const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

export type LoginCallback = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  username: string | null;
};

export function generateState(): string {
  return randomBytes(32).toString("base64url");
}

const SUCCESS_BODY = `<!doctype html><meta charset="utf-8"><title>Supagist CLI</title>
<body style="font:16px system-ui;padding:3rem">Signed in. You can close this tab and return to your terminal.</body>`;

function readBody(request: IncomingMessage, limitBytes = 64 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error("Callback body too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    request.on("error", reject);
  });
}

export type WaitForCallbackOptions = {
  /** Origin allowed to POST the session — the host the user is logging in to. */
  allowedOrigin: string;
  state: string;
  timeoutMs?: number;
  /** Called once the listener is bound, with the port it got. */
  onListening: (port: number) => void | Promise<void>;
  parsePayload: (raw: unknown, expectedState: string) => LoginCallback | null;
};

/**
 * Binds an ephemeral loopback listener and resolves with the first valid
 * callback. Rejects on timeout so a user who closes the tab gets a message
 * instead of a hung process.
 */
export function waitForCallback(options: WaitForCallbackOptions): Promise<LoginCallback> {
  const { allowedOrigin, state, onListening, parsePayload } = options;
  const timeoutMs = options.timeoutMs ?? LOGIN_TIMEOUT_MS;

  return new Promise<LoginCallback>((resolve, reject) => {
    let settled = false;

    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    };

    const server = createServer((request: IncomingMessage, response: ServerResponse) => {
      void handle(request, response);
    });

    function finish(error: Error | null, payload?: LoginCallback) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      server.close();
      if (error) reject(error);
      else resolve(payload!);
    }

    async function handle(request: IncomingMessage, response: ServerResponse) {
      if (request.method === "OPTIONS") {
        response.writeHead(204, corsHeaders);
        response.end();
        return;
      }
      if (request.method !== "POST" || !request.url?.startsWith("/callback")) {
        response.writeHead(404, corsHeaders);
        response.end();
        return;
      }

      // Reject cross-origin posts outright. The state check below is the real
      // guarantee, but refusing an unexpected Origin keeps a stray page from
      // even reaching the parser.
      const origin = request.headers.origin;
      if (origin && origin !== allowedOrigin) {
        response.writeHead(403, corsHeaders);
        response.end();
        return;
      }

      let parsed: LoginCallback | null = null;
      try {
        parsed = parsePayload(JSON.parse(await readBody(request)), state);
      } catch {
        parsed = null;
      }

      if (!parsed) {
        response.writeHead(400, { ...corsHeaders, "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "Invalid callback payload." }));
        return;
      }

      response.writeHead(200, { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" });
      response.end(SUCCESS_BODY);
      finish(null, parsed);
    }

    const timer = setTimeout(
      () =>
        finish(new Error("Timed out waiting for the browser. Try `supagist auth login` again.")),
      timeoutMs,
    );
    timer.unref?.();

    server.on("error", (error) => finish(error));
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        finish(new Error("Could not bind a local callback port."));
        return;
      }
      void Promise.resolve(onListening(address.port)).catch((error: Error) => finish(error));
    });
  });
}

/** Best-effort browser launch; the caller always prints the URL as a fallback. */
export function openBrowser(url: string, platform: string = process.platform): boolean {
  const command = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", url] : [url];

  try {
    const child = spawn(command, args, { stdio: "ignore", detached: true });
    child.on("error", () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}

export async function persistLogin(
  host: string,
  callback: LoginCallback,
  env: Record<string, string | undefined> = process.env,
): Promise<StoredCredentials> {
  const credentials: StoredCredentials = { host, ...callback };
  await writeCredentials(credentials, env);
  return credentials;
}
