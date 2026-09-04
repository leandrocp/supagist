import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run, VERSION } from "./index";
import { writeCredentials, readCredentials, type StoredCredentials } from "./credentials";

const HOST = "https://supagist.app";
const FUTURE = Math.floor(Date.now() / 1000) + 3600;

let dir: string;
let out: string[];
let err: string[];
let stdin: string;
let io: Parameters<typeof run>[1];
let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const credentials: StoredCredentials = {
  host: HOST,
  accessToken: "access",
  refreshToken: "refresh",
  expiresAt: FUTURE,
  username: "leandrocp",
};

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "supagist-cli-run-"));
  out = [];
  err = [];
  stdin = "";
  io = {
    out: (line) => out.push(line),
    err: (line) => err.push(line),
    readStdin: async () => stdin,
    env: { SUPAGIST_CONFIG_DIR: dir },
  };
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await rm(dir, { recursive: true, force: true });
});

describe("run — help and version", () => {
  it("prints help and exits 0 with no arguments", async () => {
    expect(await run([], io)).toBe(0);
    expect(out.join("\n")).toContain("npx supagist <file>");
  });

  it("prints the version", async () => {
    expect(await run(["--version"], io)).toBe(0);
    expect(out).toEqual([VERSION]);
  });

  it("exits 2 with the parse error on an unknown flag", async () => {
    expect(await run(["a.ts", "--nope"], io)).toBe(2);
    expect(err.join("\n")).toMatch(/Unknown option "--nope"/);
    expect(out).toEqual([]);
  });
});

describe("run — auth status and logout", () => {
  it("reports not-signed-in with exit code 1", async () => {
    expect(await run(["auth", "status"], io)).toBe(1);
    expect(err.join("\n")).toMatch(/Not signed in/);
  });

  it("reports the signed-in handle", async () => {
    await writeCredentials(credentials, io.env);
    expect(await run(["auth", "status"], io)).toBe(0);
    expect(out.join("\n")).toContain("leandrocp");
  });

  it("emits machine-readable status with --json", async () => {
    await writeCredentials(credentials, io.env);
    await run(["auth", "status", "--json"], io);
    expect(JSON.parse(out[0])).toEqual({ host: HOST, signedIn: true, username: "leandrocp" });
  });

  it("reports signedIn false in JSON when logged out", async () => {
    expect(await run(["auth", "status", "--json"], io)).toBe(1);
    expect(JSON.parse(out[0])).toMatchObject({ signedIn: false, username: null });
  });

  it("removes stored credentials on logout", async () => {
    await writeCredentials(credentials, io.env);
    expect(await run(["auth", "logout"], io)).toBe(0);
    expect(await readCredentials(HOST, io.env)).toBeNull();
  });

  it("logging out when not signed in is not an error", async () => {
    expect(await run(["auth", "logout"], io)).toBe(0);
    expect(out.join("\n")).toMatch(/Was not signed in/);
  });

  it("scopes status to the host, so --host does not read production's session", async () => {
    await writeCredentials(credentials, io.env);
    expect(await run(["auth", "status", "--host", "http://localhost:3000"], io)).toBe(1);
  });
});

describe("run — publish", () => {
  async function fixture(contents = "const x = 1;\n", name = "app.ts") {
    const path = join(dir, name);
    await writeFile(path, contents);
    return path;
  }

  beforeEach(async () => {
    await writeCredentials(credentials, io.env);
    fetchMock.mockResolvedValue(
      jsonResponse({ url: `${HOST}/app-ts-abc123`, path: "/app-ts-abc123" }),
    );
  });

  it("prints only the URL on success", async () => {
    expect(await run([await fixture()], io)).toBe(0);
    expect(out).toEqual([`${HOST}/app-ts-abc123`]);
  });

  it("prints JSON with --json", async () => {
    await run([await fixture(), "--json"], io);
    expect(JSON.parse(out[0])).toEqual({ url: `${HOST}/app-ts-abc123`, path: "/app-ts-abc123" });
  });

  it("defaults the filename to the file's basename", async () => {
    await run([await fixture("x", "handler.rs")], io);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).filename).toBe("handler.rs");
  });

  it("uses --filename over the basename", async () => {
    await run([await fixture(), "--filename", "renamed.ts"], io);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).filename).toBe("renamed.ts");
  });

  it("forwards appearance options to the server", async () => {
    await run([await fixture(), "--brand", "supabase", "--pixel-ratio", "6"], io);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).appearance).toEqual({
      brand: "supabase",
      pixelRatio: 6,
    });
  });

  it("sends the file's contents verbatim", async () => {
    const contents = "line 1\nline 2\n  indented\n";
    await run([await fixture(contents)], io);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).code).toBe(contents);
  });

  it("reads from stdin when the source is -", async () => {
    stdin = "print('hi')\n";
    expect(await run(["-", "--filename", "hi.py"], io)).toBe(0);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ code: "print('hi')\n", filename: "hi.py" });
  });

  it("requires --filename when reading stdin, since the slug comes from it", async () => {
    stdin = "print('hi')";
    expect(await run(["-"], io)).toBe(2);
    expect(err.join("\n")).toMatch(/requires --filename/);
  });

  it("exits 2 when the file does not exist", async () => {
    expect(await run([join(dir, "missing.ts")], io)).toBe(2);
    expect(err.join("\n")).toMatch(/Could not read/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses to publish an empty file without calling the server", async () => {
    expect(await run([await fixture("   \n\n")], io)).toBe(1);
    expect(err.join("\n")).toMatch(/empty/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("exits 1 with the server's message when publishing is rejected", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "Daily snippet limit reached. Come back tomorrow." }, 429),
    );
    expect(await run([await fixture()], io)).toBe(1);
    expect(err.join("\n")).toContain("Daily snippet limit reached.");
    expect(out).toEqual([]);
  });

  it("asks the user to log in when no session is stored, before any network call", async () => {
    const path = await fixture();
    io.env = { SUPAGIST_CONFIG_DIR: join(dir, "empty") };
    expect(await run([path], io)).toBe(1);
    expect(err.join("\n")).toMatch(/Not signed in/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
