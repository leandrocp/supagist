import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ApiError,
  fetchHostConfig,
  publishSnippet,
  refreshSession,
  resolveAccessToken,
} from "./api";
import { readCredentials, writeCredentials, type StoredCredentials } from "./credentials";

const HOST = "https://supagist.app";

const CONFIG = {
  appUrl: HOST,
  supabaseUrl: "https://project.supabase.co",
  supabasePublishableKey: "publishable-key",
  options: { brands: [], backgrounds: [], fonts: [], windows: [] },
};

let dir: string;
let env: Record<string, string | undefined>;
let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "supagist-api-test-"));
  env = { SUPAGIST_CONFIG_DIR: dir };
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await rm(dir, { recursive: true, force: true });
});

describe("fetchHostConfig", () => {
  it("reads the discovery endpoint", async () => {
    fetchMock.mockResolvedValue(jsonResponse(CONFIG));
    expect(await fetchHostConfig(HOST)).toEqual(CONFIG);
    expect(fetchMock).toHaveBeenCalledWith(`${HOST}/api/cli/config`);
  });

  it("surfaces the server's error message", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Supagist is not configured." }, 503));
    await expect(fetchHostConfig(HOST)).rejects.toThrow("Supagist is not configured.");
  });

  it("falls back to a status message when the body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>502</html>", { status: 502 }));
    await expect(fetchHostConfig(HOST)).rejects.toThrow(/returned 502/);
  });

  it("reports an unreachable host rather than throwing a raw network error", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(fetchHostConfig(HOST)).rejects.toThrow(/Could not reach https:\/\/supagist.app/);
  });
});

describe("refreshSession", () => {
  it("exchanges the refresh token against Supabase directly", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ access_token: "new-access", refresh_token: "new-refresh", expires_at: 999 }),
    );

    expect(await refreshSession(CONFIG, "old-refresh")).toEqual({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresAt: 999,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://project.supabase.co/auth/v1/token?grant_type=refresh_token");
    expect(init.headers.apikey).toBe("publishable-key");
    expect(JSON.parse(init.body)).toEqual({ refresh_token: "old-refresh" });
  });

  it("tells the user to log in again when the refresh token is rejected", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "invalid_grant" }, 400));
    await expect(refreshSession(CONFIG, "stale")).rejects.toThrow(/auth login/);
  });

  it("rejects a 200 response that is missing tokens", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ access_token: "only-one" }));
    await expect(refreshSession(CONFIG, "stale")).rejects.toThrow(/auth login/);
  });
});

describe("resolveAccessToken", () => {
  const future = Math.floor(Date.now() / 1000) + 3600;
  const past = Math.floor(Date.now() / 1000) - 10;

  const stored = (expiresAt: number | null): StoredCredentials => ({
    host: HOST,
    accessToken: "stored-access",
    refreshToken: "stored-refresh",
    expiresAt,
    username: "leandrocp",
  });

  it("errors when nothing is stored for the host", async () => {
    await expect(resolveAccessToken(HOST, env)).rejects.toThrow(/Not signed in/);
  });

  it("reuses a token that is still comfortably valid", async () => {
    await writeCredentials(stored(future), env);
    const { accessToken } = await resolveAccessToken(HOST, env);
    expect(accessToken).toBe("stored-access");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes an expired token and persists the new session", async () => {
    await writeCredentials(stored(past), env);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(CONFIG))
      .mockResolvedValueOnce(
        jsonResponse({ access_token: "fresh", refresh_token: "rotated", expires_at: future }),
      );

    const { accessToken } = await resolveAccessToken(HOST, env);

    expect(accessToken).toBe("fresh");
    // The rotated refresh token must be written back, or the next run fails.
    expect(await readCredentials(HOST, env)).toMatchObject({
      accessToken: "fresh",
      refreshToken: "rotated",
      username: "leandrocp",
    });
  });

  it("propagates a refresh failure so the user is told to log in again", async () => {
    await writeCredentials(stored(past), env);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(CONFIG))
      .mockResolvedValueOnce(jsonResponse({ error: "invalid_grant" }, 400));

    await expect(resolveAccessToken(HOST, env)).rejects.toThrow(/auth login/);
  });
});

describe("publishSnippet", () => {
  const payload = { code: "x", filename: "a.ts", appearance: {} };

  it("posts the snippet with a bearer token and returns the URL", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ url: `${HOST}/a-ts-abc123`, path: "/a-ts-abc123" }));

    const result = await publishSnippet(HOST, "token", payload);

    expect(result).toEqual({ url: `${HOST}/a-ts-abc123`, path: "/a-ts-abc123" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${HOST}/api/cli/publish`);
    expect(init.headers.Authorization).toBe("Bearer token");
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it("surfaces the server's message on a rejection", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "Daily snippet limit reached. Come back tomorrow." }, 429),
    );

    await expect(publishSnippet(HOST, "token", payload)).rejects.toThrow(/Daily snippet limit/);
  });

  it("carries the HTTP status on the error", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "nope" }, 429));
    await expect(publishSnippet(HOST, "token", payload)).rejects.toMatchObject({ status: 429 });
  });

  it("reports an unreachable host clearly", async () => {
    fetchMock.mockRejectedValue(new Error("ENOTFOUND"));
    await expect(publishSnippet(HOST, "token", payload)).rejects.toThrow(/Could not reach/);
  });

  it("throws ApiError, which the CLI maps to exit code 1", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "nope" }, 500));
    await expect(publishSnippet(HOST, "token", payload)).rejects.toBeInstanceOf(ApiError);
  });
});
