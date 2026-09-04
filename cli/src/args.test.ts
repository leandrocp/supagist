import { describe, it, expect } from "vitest";
import { parseArgs, helpText, ArgError, DEFAULT_HOST } from "./args";

function publishOptions(argv: string[], env: Record<string, string | undefined> = {}) {
  const parsed = parseArgs(argv, env);
  if (parsed.command !== "publish") throw new Error(`expected publish, got ${parsed.command}`);
  return parsed.options;
}

describe("parseArgs — top-level dispatch", () => {
  it("shows help with no arguments", () => {
    expect(parseArgs([])).toEqual({ command: "help" });
  });

  it.each(["--help", "-h", "help"])("treats %s as help", (flag) => {
    expect(parseArgs([flag])).toEqual({ command: "help" });
  });

  it.each(["--version", "-v", "version"])("treats %s as version", (flag) => {
    expect(parseArgs([flag])).toEqual({ command: "version" });
  });

  it("rejects an unknown leading option", () => {
    expect(() => parseArgs(["--nope"])).toThrow(ArgError);
  });

  it("treats a bare filename as a publish", () => {
    expect(publishOptions(["app.ts"]).source).toBe("app.ts");
  });

  it("treats `-` as a stdin publish rather than an option", () => {
    expect(publishOptions(["-", "--filename", "x.ts"]).source).toBe("-");
  });
});

describe("parseArgs — auth", () => {
  it("defaults to status when no action is given", () => {
    expect(parseArgs(["auth"])).toEqual({
      command: "auth",
      action: "status",
      host: DEFAULT_HOST,
      json: false,
    });
  });

  it.each(["login", "logout", "status"])("accepts the %s action", (action) => {
    expect(parseArgs(["auth", action])).toMatchObject({ command: "auth", action });
  });

  it("rejects an unknown auth action", () => {
    expect(() => parseArgs(["auth", "refresh"])).toThrow(/Unknown auth command/);
  });

  it("rejects an unknown auth option", () => {
    expect(() => parseArgs(["auth", "login", "--force"])).toThrow(/Unknown option/);
  });

  it("accepts --host and --json", () => {
    expect(parseArgs(["auth", "login", "--host", "example.com", "--json"])).toEqual({
      command: "auth",
      action: "login",
      host: "https://example.com",
      json: true,
    });
  });
});

describe("parseArgs — host resolution", () => {
  it("defaults to the production host", () => {
    expect(publishOptions(["a.ts"]).host).toBe(DEFAULT_HOST);
  });

  it("reads SUPAGIST_HOST from the environment", () => {
    expect(publishOptions(["a.ts"], { SUPAGIST_HOST: "http://localhost:3000" }).host).toBe(
      "http://localhost:3000",
    );
  });

  it("lets --host override the environment", () => {
    expect(
      publishOptions(["a.ts", "--host", "https://preview.example.com"], {
        SUPAGIST_HOST: "http://localhost:3000",
      }).host,
    ).toBe("https://preview.example.com");
  });

  it("adds https:// to a bare hostname", () => {
    expect(publishOptions(["a.ts", "--host", "supagist.app"]).host).toBe("https://supagist.app");
  });

  it("reduces a host with a path to its origin", () => {
    expect(publishOptions(["a.ts", "--host", "https://example.com/deep/path"]).host).toBe(
      "https://example.com",
    );
  });

  it("rejects a non-http protocol", () => {
    expect(() => parseArgs(["a.ts", "--host", "ftp://example.com"])).toThrow(/must be http/);
  });

  it("rejects an unparseable host", () => {
    expect(() => parseArgs(["a.ts", "--host", "http://"])).toThrow(ArgError);
  });
});

describe("parseArgs — appearance flags", () => {
  it("forwards string options untouched so the server owns the vocabulary", () => {
    // A brand the CLI has never heard of must still reach the server, which is
    // the only place the real list lives.
    expect(publishOptions(["a.ts", "--brand", "brand-shipped-yesterday"]).appearance).toEqual({
      brand: "brand-shipped-yesterday",
    });
  });

  it("maps every string flag to its payload key", () => {
    expect(
      publishOptions([
        "a.ts",
        "--brand",
        "supabase",
        "--theme",
        "tokyo_night",
        "--background",
        "Candy",
        "--font",
        "jetbrains",
        "--window",
        "windows",
      ]).appearance,
    ).toEqual({
      brand: "supabase",
      theme: "tokyo_night",
      background: "Candy",
      font: "jetbrains",
      window: "windows",
    });
  });

  it("maps every numeric flag to a number", () => {
    expect(
      publishOptions([
        "a.ts",
        "--font-size",
        "16",
        "--padding",
        "32",
        "--inner-padding",
        "24",
        "--corner-radius",
        "8",
        "--pixel-ratio",
        "6",
      ]).appearance,
    ).toEqual({
      fontSize: 16,
      outerPadding: 32,
      innerPadding: 24,
      cornerRadius: 8,
      pixelRatio: 6,
    });
  });

  it("rejects a non-numeric value for a numeric flag", () => {
    expect(() => parseArgs(["a.ts", "--font-size", "big"])).toThrow(/must be a number/);
  });

  it("rejects a flag whose value is missing", () => {
    expect(() => parseArgs(["a.ts", "--theme"])).toThrow(/requires a value/);
  });

  it("does not swallow the next flag as a value", () => {
    expect(() => parseArgs(["a.ts", "--theme", "--json"])).toThrow(/requires a value/);
  });

  it("distinguishes --line-numbers from --no-line-numbers", () => {
    expect(publishOptions(["a.ts", "--line-numbers"]).appearance).toEqual({ lineNumbers: true });
    expect(publishOptions(["a.ts", "--no-line-numbers"]).appearance).toEqual({
      lineNumbers: false,
    });
  });

  it("omits unset booleans so brand presets keep their own values", () => {
    // Sending `lineNumbers: false` by default would silently override every
    // brand that turns the gutter on.
    expect(publishOptions(["a.ts", "--brand", "vercel"]).appearance).not.toHaveProperty(
      "lineNumbers",
    );
  });

  it("sends an explicit null for --no-background", () => {
    const appearance = publishOptions(["a.ts", "--no-background"]).appearance;
    expect(appearance).toHaveProperty("background", null);
  });

  it("nests header and footer toggles", () => {
    expect(publishOptions(["a.ts", "--no-header", "--footer"]).appearance).toEqual({
      header: { enabled: false },
      footer: { enabled: true },
    });
  });

  it("omits header and footer keys entirely when neither is passed", () => {
    const appearance = publishOptions(["a.ts", "--theme", "dracula"]).appearance;
    expect(appearance).not.toHaveProperty("header");
    expect(appearance).not.toHaveProperty("footer");
  });

  it("lets a later flag win over an earlier one", () => {
    expect(publishOptions(["a.ts", "--theme", "dracula", "--theme", "nord"]).appearance).toEqual({
      theme: "nord",
    });
  });

  it("rejects an unknown publish option", () => {
    expect(() => parseArgs(["a.ts", "--sparkle"])).toThrow(/Unknown option/);
  });
});

describe("parseArgs — general options", () => {
  it("parses --filename, --language, --open and --json", () => {
    const options = publishOptions([
      "a.ts",
      "--filename",
      "renamed.ts",
      "--language",
      "typescript",
      "--open",
      "--json",
    ]);
    expect(options).toMatchObject({
      filename: "renamed.ts",
      language: "typescript",
      open: true,
      json: true,
    });
  });

  it("defaults --open and --json to false", () => {
    expect(publishOptions(["a.ts"])).toMatchObject({ open: false, json: false });
  });
});

describe("helpText", () => {
  it("documents every command the parser accepts", () => {
    const text = helpText();
    expect(text).toContain("auth login");
    expect(text).toContain("--brand");
    expect(text).toContain("--no-background");
  });

  it("explains that rendering happens server-side", () => {
    expect(helpText()).toMatch(/on the server/);
  });
});
