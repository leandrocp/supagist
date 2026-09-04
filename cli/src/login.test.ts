import { describe, it, expect } from "vitest";
import { generateState, waitForCallback, openBrowser } from "./login";
import { parseCliSessionPayload } from "./protocol";

const ORIGIN = "https://supagist.app";

function sessionBody(state: string) {
  return {
    state,
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: 1_700_000_000,
    username: "leandrocp",
  };
}

/**
 * Runs the listener and hands the bound port to `drive`, which performs the
 * HTTP calls a browser would.
 *
 * The listener resolves the moment it accepts a callback — before the client's
 * own `fetch` has returned — so both promises are awaited and the driver's
 * result is returned alongside the session.
 */
async function withListener<T>(
  state: string,
  drive: (port: number) => Promise<T>,
  timeoutMs = 5000,
): Promise<{ session: Awaited<ReturnType<typeof waitForCallback>>; driven: T }> {
  let driven!: Promise<T>;

  const session = await waitForCallback({
    allowedOrigin: ORIGIN,
    state,
    timeoutMs,
    parsePayload: parseCliSessionPayload,
    onListening: (port) => {
      driven = drive(port);
      driven.catch(() => {});
    },
  });

  return { session, driven: await driven };
}

function post(port: number, body: unknown, headers: Record<string, string> = {}) {
  return fetch(`http://127.0.0.1:${port}/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("generateState", () => {
  it("returns a long base64url value", () => {
    expect(generateState()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("does not repeat across invocations", () => {
    const values = new Set(Array.from({ length: 50 }, () => generateState()));
    expect(values.size).toBe(50);
  });
});

describe("waitForCallback", () => {
  it("resolves with the session posted by the consent page", async () => {
    const state = generateState();
    const { session } = await withListener(state, (port) =>
      post(port, sessionBody(state), { Origin: ORIGIN }),
    );

    expect(session).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: 1_700_000_000,
      username: "leandrocp",
      state,
    });
  });

  it("rejects a callback carrying a different state and keeps waiting", async () => {
    // Without this check any page the user happens to have open could post a
    // session into the listener while it is bound.
    const state = generateState();
    const { session, driven } = await withListener(state, async (port) => {
      const wrong = await post(port, sessionBody(generateState()), { Origin: ORIGIN });
      const right = await post(port, sessionBody(state), { Origin: ORIGIN });
      return [wrong.status, right.status];
    });

    expect(driven).toEqual([400, 200]);
    expect(session.accessToken).toBe("access-token");
  });

  it("refuses a POST from an origin other than the host being logged into", async () => {
    const state = generateState();
    const { session, driven } = await withListener(state, async (port) => {
      const evil = await post(port, sessionBody(state), { Origin: "https://evil.example" });
      const ours = await post(port, sessionBody(state), { Origin: ORIGIN });
      return [evil.status, ours.status];
    });

    expect(driven).toEqual([403, 200]);
    expect(session.accessToken).toBe("access-token");
  });

  it("answers the CORS preflight for the allowed origin", async () => {
    const state = generateState();
    const { driven } = await withListener(state, async (port) => {
      const preflight = await fetch(`http://127.0.0.1:${port}/callback`, {
        method: "OPTIONS",
        headers: { Origin: ORIGIN, "Access-Control-Request-Method": "POST" },
      });
      await post(port, sessionBody(state), { Origin: ORIGIN });
      return {
        status: preflight.status,
        allowOrigin: preflight.headers.get("access-control-allow-origin"),
      };
    });

    expect(driven).toEqual({ status: 204, allowOrigin: ORIGIN });
  });

  it("404s paths other than /callback", async () => {
    const state = generateState();
    const { driven } = await withListener(state, async (port) => {
      const other = await fetch(`http://127.0.0.1:${port}/`, { method: "POST", body: "{}" });
      await post(port, sessionBody(state), { Origin: ORIGIN });
      return other.status;
    });

    expect(driven).toBe(404);
  });

  it("rejects a malformed JSON body without crashing the listener", async () => {
    const state = generateState();
    const { session, driven } = await withListener(state, async (port) => {
      const bad = await fetch(`http://127.0.0.1:${port}/callback`, {
        method: "POST",
        headers: { Origin: ORIGIN, "Content-Type": "application/json" },
        body: "{not json",
      });
      await post(port, sessionBody(state), { Origin: ORIGIN });
      return bad.status;
    });

    expect(driven).toBe(400);
    expect(session.accessToken).toBe("access-token");
  });

  it("times out instead of hanging when the browser never calls back", async () => {
    await expect(
      waitForCallback({
        allowedOrigin: ORIGIN,
        state: generateState(),
        timeoutMs: 50,
        parsePayload: parseCliSessionPayload,
        onListening: () => {},
      }),
    ).rejects.toThrow(/Timed out/);
  });

  it("stops listening once a valid callback lands", async () => {
    const state = generateState();
    const { driven: port } = await withListener(state, async (boundPort) => {
      await post(boundPort, sessionBody(state), { Origin: ORIGIN });
      return boundPort;
    });

    // A second POST to the same port must not be answered by a live listener.
    await expect(post(port, sessionBody(state), { Origin: ORIGIN })).rejects.toThrow();
  });
});

describe("openBrowser", () => {
  it("does not throw when the platform launcher is unavailable", () => {
    expect(() => openBrowser("https://supagist.app", "sunos")).not.toThrow();
  });
});
