import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UsageError, parseArgs, parseLineRange, renderFields } from "./args.js";
import { DEFAULT_HOST, VERSION, run } from "./cli.js";

describe("parseArgs", () => {
  it("maps appearance flags, negations, none and numbers onto render fields", () => {
    const args = parseArgs([
      "src/app.ts",
      "--brand",
      "supabase",
      "--font-size=18",
      "--no-line-numbers",
      "--background",
      "none",
      "--footer",
      "--footer-align",
      "right",
      "--no-header-filename",
      "-o",
      "card.png",
    ]);
    expect(args).toMatchObject({ command: "render", file: "src/app.ts" });
    expect(args.flags.out).toBe("card.png");
    expect(renderFields(args.flags)).toEqual({
      brand: "supabase",
      fontSize: 18,
      lineNumbers: false,
      background: null,
      footer: { enabled: true, alignment: "right" },
      header: { showFilename: false },
    });
  });

  it("accepts stdin, an explicit render command and -- before odd file names", () => {
    expect(parseArgs(["-"]).file).toBe("-");
    expect(parseArgs(["render", "a.rs"]).file).toBe("a.rs");
    expect(parseArgs(["--", "--weird.js"]).file).toBe("--weird.js");
    expect(parseArgs(["options", "--json"])).toEqual({ command: "options", flags: { json: true } });
    expect(parseArgs(["--help"]).command).toBe("help");
    expect(parseArgs(["--version"]).command).toBe("version");
    expect(parseArgs(["auth", "status", "--json"])).toEqual({
      command: "auth",
      action: "status",
      flags: { json: true },
    });
    expect(parseArgs(["a.ts", "--publish", "--title", "Hi"]).flags).toEqual({
      publish: true,
      title: "Hi",
    });
  });

  it.each([
    [["a.ts", "--brnd", "x"], "Unknown option --brnd"],
    [["a.ts", "--constructor", "x"], "Unknown option --constructor"],
    [["a.ts", "--no-brand"], "Unknown option --no-brand"],
    [["a.ts", "--brand"], "--brand needs a value"],
    [["a.ts", "--brand", "--theme", "x"], "--brand needs a value"],
    [["a.ts", "--font-size", "big"], '--font-size must be a number, got "big"'],
    [["a.ts", "--json=yes"], "--json takes no value"],
    [["a.ts", "--brand", "a", "--brand", "b"], "--brand was given more than once"],
    [["options", "--brand", "x"], "Unknown option --brand"],
    [["options", "extra"], "takes no arguments"],
    [[], "Give a file to render"],
    [["a.ts", "b.ts"], "one file at a time"],
    [["auth"], "Use supagist auth login, logout or status"],
    [["auth", "signup"], "Use supagist auth login, logout or status"],
    [["auth", "login", "--brand", "x"], "Unknown option --brand"],
    [["a.ts", "--publish", "--out", "a.png"], "--out can't be used with --publish"],
    [["a.ts", "--publish", "--pixel-ratio", "2"], "--pixel-ratio can't be used with --publish"],
    [["a.ts", "--publish", "--author", "me"], "--author can't be used with --publish"],
    [["a.ts", "--title", "Hi"], "--title only applies with --publish"],
  ])("rejects %j as a usage error", (argv, message) => {
    expect(() => parseArgs(argv)).toThrow(UsageError);
    expect(() => parseArgs(argv)).toThrow(message);
  });
});

describe("parseLineRange", () => {
  it("reads inclusive ranges and single lines", () => {
    expect(parseLineRange("12-40")).toEqual([12, 40]);
    expect(parseLineRange("7")).toEqual([7, 7]);
  });

  it.each(["0-3", "3-1", "a-b", "1-2-3", "01-3", "-4", "2-", ""])("rejects %j", (spec) => {
    expect(() => parseLineRange(spec)).toThrow(UsageError);
  });
});

const NOW = 1_800_000_000_000;

describe("run", () => {
  let dir: string;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  let stdout: string[];
  let stderr: string[];
  let stdin: string[];
  let env: Record<string, string | undefined>;
  let tty: boolean;
  let openUrl: ((url: string) => unknown) | undefined;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "supagist-cli-"));
    await writeFile(join(dir, "auth.ts"), "line 1\nline 2\nline 3\nline 4\n");
    fetchMock = vi.fn<typeof fetch>();
    stdout = [];
    stderr = [];
    stdin = [];
    env = { XDG_CONFIG_HOME: dir };
    tty = false;
    openUrl = undefined;
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  const cli = (...argv: string[]) =>
    run(argv, {
      stdin: (async function* () {
        yield* stdin;
      })(),
      stdout: {
        write: (chunk: string | Uint8Array) => stdout.push(Buffer.from(chunk).toString()),
        get isTTY() {
          return tty;
        },
      },
      stderr: { write: (chunk: string) => stderr.push(chunk) },
      env,
      fetch: fetchMock,
      openUrl,
      now: () => NOW,
    });
  const svgResponse = () =>
    new Response("<svg>card</svg>", {
      headers: { "x-supagist-width": "300", "x-supagist-height": "120" },
    });
  const sent = (index = 0) => {
    const [url, init] = fetchMock.mock.calls[index];
    return { url: String(url), init: init!, body: JSON.parse(String(init!.body ?? "null")) };
  };
  const json = () => JSON.parse(stdout.join(""));

  it("renders a line range of a file to an SVG file", async () => {
    fetchMock.mockResolvedValue(svgResponse());
    const out = join(dir, "auth.svg");
    const code = await cli(
      join(dir, "auth.ts"),
      "--lines",
      "2-3",
      "--brand",
      "supabase",
      "-o",
      out,
    );

    expect(code).toBe(0);
    expect(await readFile(out, "utf8")).toBe("<svg>card</svg>");
    expect(stderr.join("")).toBe(`Saved ${out} (300×120)\n`);
    const request = sent();
    expect(request.url).toBe(`${DEFAULT_HOST}/api/render`);
    expect(request.init.method).toBe("POST");
    expect(new Headers(request.init.headers).get("user-agent")).toBe(`supagist-cli/${VERSION}`);
    expect(request.body).toEqual({
      code: "line 2\nline 3",
      language: null,
      filename: "auth.ts",
      brand: "supabase",
    });
  });

  it("clamps a range that runs past the end of the file", async () => {
    fetchMock.mockResolvedValue(svgResponse());
    await cli(join(dir, "auth.ts"), "--lines", "3-40");
    expect(sent().body.code).toBe("line 3\nline 4");
  });

  it("reports the written file as JSON", async () => {
    fetchMock.mockResolvedValue(svgResponse());
    const out = join(dir, "auth.svg");
    expect(await cli(join(dir, "auth.ts"), "--out", out, "--json")).toBe(0);
    expect(json()).toEqual({
      ok: true,
      path: out,
      format: "svg",
      width: 300,
      height: 120,
      bytes: 15,
    });
    expect(stderr).toEqual([]);
  });

  it("reads stdin, drops the final newline and lets --filename drive detection", async () => {
    fetchMock.mockResolvedValue(svgResponse());
    stdin = ["fn main() {}\n"];
    expect(await cli("-", "--filename", "main.rs", "--theme", "dracula")).toBe(0);
    expect(sent().body).toEqual({
      code: "fn main() {}",
      language: null,
      filename: "main.rs",
      theme: "dracula",
    });
    expect(stdout.join("")).toBe("<svg>card</svg>");
  });

  it("asks for PNG when --out ends in .png and writes the bytes", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    fetchMock.mockResolvedValue(new Response(png, { headers: { "content-type": "image/png" } }));
    const out = join(dir, "card.png");
    expect(await cli(join(dir, "auth.ts"), "--out", out, "--pixel-ratio", "4")).toBe(0);
    expect(sent().body).toMatchObject({ format: "png", pixelRatio: 4 });
    expect(new Uint8Array(await readFile(out))).toEqual(png);
  });

  it("puts the SVG in the JSON when there is no --out", async () => {
    fetchMock.mockResolvedValue(svgResponse());
    expect(await cli(join(dir, "auth.ts"), "--json")).toBe(0);
    expect(json()).toEqual({
      ok: true,
      format: "svg",
      width: 300,
      height: 120,
      svg: "<svg>card</svg>",
    });
  });

  it("exits 2 with the server's message when it rejects the input", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { code: "INVALID_INPUT", message: "brand: Invalid option" } },
        { status: 400 },
      ),
    );
    expect(await cli(join(dir, "auth.ts"), "--brand", "nope", "--json")).toBe(2);
    expect(json()).toEqual({
      ok: false,
      error: { code: "INVALID_INPUT", message: "brand: Invalid option", status: 400 },
    });
  });

  it("exits 1 on rate limits, keeping Retry-After", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { code: "RATE_LIMITED", message: "Rate limit reached." } },
        { status: 429, headers: { "retry-after": "60" } },
      ),
    );
    expect(await cli(join(dir, "auth.ts"), "--json")).toBe(1);
    expect(json().error).toEqual({
      code: "RATE_LIMITED",
      message: "Rate limit reached.",
      status: 429,
      retryAfter: 60,
    });
  });

  it("exits 1 with a readable error when the server is unreachable", async () => {
    fetchMock.mockRejectedValue(
      new TypeError("fetch failed", { cause: new Error("ECONNREFUSED") }),
    );
    expect(await cli(join(dir, "auth.ts"), "--host", "http://localhost:3999")).toBe(1);
    expect(stderr.join("")).toBe("supagist: Could not reach http://localhost:3999: ECONNREFUSED\n");
  });

  it("exits 1 for a missing file and 2 for usage errors, in either output mode", async () => {
    expect(await cli(join(dir, "missing.ts"))).toBe(1);
    expect(stderr.join("")).toMatch(/Can't read .*missing\.ts: no such file/);
    expect(await cli("a.ts", "--lines", "x", "--json")).toBe(2);
    expect(json()).toEqual({
      ok: false,
      error: { code: "USAGE", message: '--lines must look like 12-40, got "x".' },
    });
    expect(await cli(join(dir, "auth.ts"), "--lines", "9-12")).toBe(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [["--out", "card.jpg"], "Can't tell the format"],
    [["--out", "card.svg", "--format", "png"], "does not match"],
    [["--format", "gif"], "--format must be svg or png"],
  ])("rejects output %j", async (flags, message) => {
    expect(await cli(join(dir, "auth.ts"), ...flags)).toBe(2);
    expect(stderr.join("")).toContain(message);
  });

  it("refuses to print PNG bytes to a terminal", async () => {
    tty = true;
    expect(await cli(join(dir, "auth.ts"), "--format", "png")).toBe(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses SUPAGIST_HOST unless --host is given, and validates both", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(svgResponse()));
    env.SUPAGIST_HOST = "http://localhost:3000/";
    await cli(join(dir, "auth.ts"));
    await cli(join(dir, "auth.ts"), "--host", "https://preview.vercel.app");
    expect(sent(0).url).toBe("http://localhost:3000/api/render");
    expect(sent(1).url).toBe("https://preview.vercel.app/api/render");
    expect(await cli(join(dir, "auth.ts"), "--host", "ftp://x")).toBe(2);
    expect(await cli(join(dir, "auth.ts"), "--host", "not a url")).toBe(2);
  });

  it("prints the server's option catalog", async () => {
    const catalog = {
      brands: [{ id: "supabase", theme: "x" }],
      themes: ["dracula"],
      formats: ["svg"],
    };
    fetchMock.mockImplementation(() => Promise.resolve(Response.json(catalog)));
    expect(await cli("options", "--json")).toBe(0);
    expect(sent().url).toBe(`${DEFAULT_HOST}/api/options`);
    expect(json()).toEqual(catalog);
    stdout = [];
    expect(await cli("options")).toBe(0);
    expect(stdout.join("")).toContain(
      "Brands (--brand)\n  supabase\n\nThemes (--theme)\n  dracula\n",
    );
  });

  it("prints help and version without a network call", async () => {
    expect(await cli("--version")).toBe(0);
    expect(stdout.join("")).toBe(`${VERSION}\n`);
    expect(await cli("help")).toBe(0);
    expect(stdout.join("")).toContain("Exit codes: 0 ok, 1 failure, 2 usage.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe("auth and publish", () => {
    const issuer = "https://auth.example/auth/v1";
    const tokenEndpoint = `${issuer}/oauth/token`;
    const credentialsFile = () => join(dir, "supagist", "supagist.app.json");
    // An unsigned JWT is enough: the CLI only reads claims for display.
    const jwt = (claims: object) =>
      `e30.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;
    const saveCredentials = async (expiresAt: number) => {
      await mkdir(join(dir, "supagist"), { recursive: true });
      await writeFile(
        credentialsFile(),
        JSON.stringify({
          host: DEFAULT_HOST,
          issuer,
          tokenEndpoint,
          clientId: "client-1",
          accessToken: jwt({ email: "old@example.com" }),
          refreshToken: "refresh-1",
          expiresAt,
        }),
      );
    };
    const published = {
      url: "https://supagist.app/deploy-config-abc123",
      image_url: "https://storage.example/canonical.svg",
      visibility: "unlisted",
      redactions: { redacted: 1, kinds: { aws_access_key: 1 } },
    };
    const sse = (message: object) =>
      new Response(`event: message\ndata: ${JSON.stringify(message)}\n\n`, {
        headers: { "content-type": "text/event-stream" },
      });

    it("logs in with dynamic registration, PKCE and a loopback redirect", async () => {
      let authorizeUrl: URL | undefined;
      fetchMock.mockImplementation(async (input, init) => {
        const url = String(input);
        if (url === `${DEFAULT_HOST}/mcp`) {
          return new Response(null, {
            status: 401,
            headers: {
              "www-authenticate": `Bearer resource_metadata="${DEFAULT_HOST}/mcp/oauth-protected-resource"`,
            },
          });
        }
        if (url === `${DEFAULT_HOST}/mcp/oauth-protected-resource`) {
          return Response.json({ authorization_servers: [issuer] });
        }
        // RFC 8414 path-inserted metadata is missing here, like local Supabase.
        if (url === "https://auth.example/.well-known/oauth-authorization-server/auth/v1") {
          return new Response("not found", { status: 404 });
        }
        if (url === `${issuer}/.well-known/oauth-authorization-server`) {
          return Response.json({
            issuer,
            authorization_endpoint: `${issuer}/oauth/authorize`,
            token_endpoint: tokenEndpoint,
            registration_endpoint: `${issuer}/oauth/clients/register`,
          });
        }
        if (url === `${issuer}/oauth/clients/register`) {
          return Response.json({ client_id: "client-1" }, { status: 201 });
        }
        if (url === tokenEndpoint) {
          return Response.json({
            access_token: jwt({ email: "dev@example.com" }),
            refresh_token: "refresh-1",
            expires_in: 3600,
          });
        }
        throw new Error(`unexpected ${url} ${init?.method}`);
      });
      // Stands in for the browser: the user approves and the server redirects.
      openUrl = (url) => {
        authorizeUrl = new URL(url);
        const redirect = new URL(authorizeUrl.searchParams.get("redirect_uri")!);
        redirect.searchParams.set("code", "code-1");
        redirect.searchParams.set("state", authorizeUrl.searchParams.get("state")!);
        return globalThis.fetch(redirect);
      };

      expect(await cli("auth", "login", "--json")).toBe(0);
      expect(json()).toEqual({
        ok: true,
        host: DEFAULT_HOST,
        signedIn: true,
        email: "dev@example.com",
      });

      const registration = fetchMock.mock.calls.find(([u]) => String(u).endsWith("/register"));
      const client = JSON.parse(String(registration![1]!.body));
      expect(client).toMatchObject({ token_endpoint_auth_method: "none" });
      expect(client.redirect_uris[0]).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/callback$/);
      expect(authorizeUrl!.searchParams.get("redirect_uri")).toBe(client.redirect_uris[0]);
      expect(authorizeUrl!.searchParams.get("code_challenge_method")).toBe("S256");

      const exchange = fetchMock.mock.calls.find(([u]) => String(u) === tokenEndpoint);
      const form = new URLSearchParams(String(exchange![1]!.body));
      expect(form.get("grant_type")).toBe("authorization_code");
      expect(form.get("code")).toBe("code-1");
      // The challenge the browser saw must be the hash of the verifier sent here.
      expect(createHash("sha256").update(form.get("code_verifier")!).digest("base64url")).toBe(
        authorizeUrl!.searchParams.get("code_challenge"),
      );

      expect((await stat(credentialsFile())).mode & 0o777).toBe(0o600);
      expect(JSON.parse(await readFile(credentialsFile(), "utf8"))).toMatchObject({
        clientId: "client-1",
        refreshToken: "refresh-1",
        tokenEndpoint,
        expiresAt: NOW + 3_600_000,
      });
    });

    it("publishes through publish_snippet, refreshing an expired session first", async () => {
      await saveCredentials(NOW - 1);
      fetchMock.mockImplementation(async (input) => {
        if (String(input) === tokenEndpoint) {
          return Response.json({
            access_token: "fresh",
            refresh_token: "refresh-2",
            expires_in: 60,
          });
        }
        return sse({
          jsonrpc: "2.0",
          id: 1,
          result: { content: [{ type: "text", text: JSON.stringify(published) }] },
        });
      });

      expect(
        await cli(
          join(dir, "auth.ts"),
          "--publish",
          "--title",
          "Deploy config",
          "--brand",
          "supabase",
        ),
      ).toBe(0);
      expect(stdout.join("")).toBe(`${published.url}\n`);
      expect(stderr.join("")).toContain("Published as unlisted");
      expect(stderr.join("")).toContain(
        "Replaced 1 secret with [REDACTED:kind] (1 aws_access_key)",
      );

      const refresh = new URLSearchParams(String(fetchMock.mock.calls[0][1]!.body));
      expect(Object.fromEntries(refresh)).toEqual({
        grant_type: "refresh_token",
        refresh_token: "refresh-1",
        client_id: "client-1",
      });
      const call = sent(1);
      expect(call.url).toBe(`${DEFAULT_HOST}/mcp`);
      expect(new Headers(call.init.headers).get("authorization")).toBe("Bearer fresh");
      expect(call.body).toMatchObject({
        method: "tools/call",
        params: { name: "publish_snippet" },
      });
      expect(call.body.params.arguments).toEqual({
        code: "line 1\nline 2\nline 3\nline 4",
        language: null,
        filename: "auth.ts",
        brand: "supabase",
        title: "Deploy config",
      });
      // The rotated refresh token replaces the used one.
      expect(JSON.parse(await readFile(credentialsFile(), "utf8"))).toMatchObject({
        accessToken: "fresh",
        refreshToken: "refresh-2",
        expiresAt: NOW + 60_000,
      });
    });

    it("reports a publish as JSON and tool errors as failures", async () => {
      await saveCredentials(NOW + 3_600_000);
      fetchMock.mockResolvedValueOnce(
        Response.json({
          jsonrpc: "2.0",
          id: 1,
          result: { content: [{ type: "text", text: JSON.stringify(published) }] },
        }),
      );
      expect(await cli(join(dir, "auth.ts"), "--publish", "--json")).toBe(0);
      expect(json()).toEqual({
        ok: true,
        url: published.url,
        image: published.image_url,
        visibility: "unlisted",
        redactions: published.redactions,
      });

      stdout = [];
      fetchMock.mockResolvedValueOnce(
        Response.json({
          jsonrpc: "2.0",
          id: 1,
          result: { isError: true, content: [{ type: "text", text: "Publish limit reached." }] },
        }),
      );
      expect(await cli(join(dir, "auth.ts"), "--publish", "--json")).toBe(1);
      expect(json().error).toEqual({ code: "PUBLISH_FAILED", message: "Publish limit reached." });
    });

    it("asks to log in when there is no session or the server ends it", async () => {
      expect(await cli(join(dir, "auth.ts"), "--publish")).toBe(1);
      expect(stderr.join("")).toBe(
        `supagist: Not signed in to ${DEFAULT_HOST}. Run supagist auth login.\n`,
      );
      expect(fetchMock).not.toHaveBeenCalled();
      expect(await cli("auth", "status")).toBe(1);

      await saveCredentials(NOW + 3_600_000);
      fetchMock.mockResolvedValueOnce(Response.json({ error: "invalid token" }, { status: 401 }));
      stdout = [];
      expect(await cli(join(dir, "auth.ts"), "--publish", "--json")).toBe(1);
      expect(json().error.code).toBe("AUTH_REQUIRED");
    });

    it("shows status and logs out, revoking the CLI's own session", async () => {
      await saveCredentials(NOW + 3_600_000);
      expect(await cli("auth", "status")).toBe(0);
      expect(stdout.join("")).toBe(`Signed in to ${DEFAULT_HOST} as old@example.com.\n`);

      fetchMock.mockImplementation(async (input) =>
        String(input) === `${DEFAULT_HOST}/api/options`
          ? Response.json({ supabase: { publishableKey: "sb_publishable_test" } })
          : new Response(null, { status: 204 }),
      );
      stdout = [];
      expect(await cli("auth", "logout", "--json")).toBe(0);
      expect(json()).toEqual({ ok: true, host: DEFAULT_HOST, signedIn: false, revoked: true });
      // Hosted Supabase Auth rejects logout without the project's apikey.
      const revoke = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith("/logout?scope=local"),
      );
      expect(String(revoke![0])).toBe(`${issuer}/logout?scope=local`);
      expect(new Headers(revoke![1]!.headers).get("apikey")).toBe("sb_publishable_test");
      await expect(stat(credentialsFile())).rejects.toThrow();
    });
  });
});
