import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, stat, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  credentialsDir,
  credentialsFileFor,
  readCredentials,
  writeCredentials,
  clearCredentials,
  needsRefresh,
  type StoredCredentials,
} from "./credentials";

let dir: string;
let env: Record<string, string | undefined>;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "supagist-cli-test-"));
  env = { SUPAGIST_CONFIG_DIR: dir };
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const session: StoredCredentials = {
  host: "https://supagist.app",
  accessToken: "access",
  refreshToken: "refresh",
  expiresAt: 1_700_000_000,
  username: "leandrocp",
};

describe("credentialsDir", () => {
  it("prefers an explicit SUPAGIST_CONFIG_DIR", () => {
    expect(credentialsDir({ SUPAGIST_CONFIG_DIR: "/custom" })).toBe("/custom");
  });

  it("falls back to XDG_CONFIG_HOME", () => {
    expect(credentialsDir({ XDG_CONFIG_HOME: "/xdg" })).toBe("/xdg/supagist");
  });
});

describe("credentialsFileFor", () => {
  it("gives each host its own file so --host does not clobber production", () => {
    const prod = credentialsFileFor("https://supagist.app", env);
    const local = credentialsFileFor("http://localhost:3000", env);
    expect(prod).not.toBe(local);
  });

  it("does not collide two origins that differ only in scheme or port", () => {
    const names = new Set([
      credentialsFileFor("https://example.com", env),
      credentialsFileFor("http://example.com", env),
      credentialsFileFor("http://example.com:3000", env),
      credentialsFileFor("http://example.com:3001", env),
    ]);
    expect(names.size).toBe(4);
  });

  it("produces a name with no path separators", () => {
    const file = credentialsFileFor("http://localhost:3000", env);
    expect(file.slice(dir.length + 1)).not.toContain("/");
  });
});

describe("writeCredentials / readCredentials", () => {
  it("round-trips a session", async () => {
    await writeCredentials(session, env);
    expect(await readCredentials(session.host, env)).toEqual(session);
  });

  it("stores the refresh token owner-readable only", async () => {
    const file = await writeCredentials(session, env);
    const stats = await stat(file);
    expect(stats.mode & 0o077).toBe(0);
  });

  it("returns null when nothing is stored for the host", async () => {
    expect(await readCredentials("https://never-logged-in.example", env)).toBeNull();
  });

  it("returns null for a corrupt credentials file instead of throwing", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(credentialsFileFor(session.host, env), "{ not json");
    expect(await readCredentials(session.host, env)).toBeNull();
  });

  it("returns null when the stored file is missing its tokens", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(credentialsFileFor(session.host, env), JSON.stringify({ username: "x" }));
    expect(await readCredentials(session.host, env)).toBeNull();
  });

  it("coerces untrusted optional fields to null", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(
      credentialsFileFor(session.host, env),
      JSON.stringify({ accessToken: "a", refreshToken: "r", expiresAt: "nope", username: 3 }),
    );
    expect(await readCredentials(session.host, env)).toMatchObject({
      expiresAt: null,
      username: null,
    });
  });
});

describe("clearCredentials", () => {
  it("removes a stored session and reports it", async () => {
    await writeCredentials(session, env);
    expect(await clearCredentials(session.host, env)).toBe(true);
    expect(await readCredentials(session.host, env)).toBeNull();
  });

  it("reports false when there was nothing to remove", async () => {
    expect(await clearCredentials("https://nothing.example", env)).toBe(false);
  });

  it("leaves other hosts signed in", async () => {
    await writeCredentials(session, env);
    await writeCredentials({ ...session, host: "http://localhost:3000" }, env);
    await clearCredentials("http://localhost:3000", env);
    expect(await readCredentials(session.host, env)).not.toBeNull();
  });
});

describe("needsRefresh", () => {
  const nowSeconds = 1_700_000_000;
  const nowMs = nowSeconds * 1000;

  it("is false for a token with comfortable headroom", () => {
    expect(needsRefresh({ ...session, expiresAt: nowSeconds + 3600 }, nowMs)).toBe(false);
  });

  it("is true once the token has expired", () => {
    expect(needsRefresh({ ...session, expiresAt: nowSeconds - 1 }, nowMs)).toBe(true);
  });

  it("is true inside the skew window so a publish cannot outlive the token", () => {
    expect(needsRefresh({ ...session, expiresAt: nowSeconds + 30 }, nowMs)).toBe(true);
  });

  it("is true at exactly the skew boundary", () => {
    expect(needsRefresh({ ...session, expiresAt: nowSeconds + 60 }, nowMs)).toBe(true);
  });

  it("is true when the expiry is unknown", () => {
    expect(needsRefresh({ ...session, expiresAt: null }, nowMs)).toBe(true);
  });
});
