import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
    [["auth", "login"], "not available yet"],
    [["a.ts", "--publish"], "not available yet"],
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

describe("run", () => {
  let dir: string;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  let stdout: string[];
  let stderr: string[];
  let stdin: string[];
  let env: Record<string, string | undefined>;
  let tty: boolean;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "supagist-cli-"));
    await writeFile(join(dir, "auth.ts"), "line 1\nline 2\nline 3\nline 4\n");
    fetchMock = vi.fn<typeof fetch>();
    stdout = [];
    stderr = [];
    stdin = [];
    env = {};
    tty = false;
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
});
