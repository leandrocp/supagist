import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cn, buildAppUrl, getMetadataBase, getRequestOrigin } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
  });

  it("filters falsy values", () => {
    expect(cn("foo", false, undefined, null, "baz")).toBe("foo baz");
  });

  it("handles conditional objects", () => {
    expect(cn({ "text-red-500": true, "text-blue-500": false })).toBe("text-red-500");
  });

  it("returns empty string when no classes provided", () => {
    expect(cn()).toBe("");
  });
});

describe("hasEnvVars", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const originalVercelUrl = process.env.VERCEL_URL;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    process.env.VERCEL_URL = originalVercelUrl;
  });

  it("is truthy when both env vars are set", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";
    const { hasEnvVars } = await import("./utils");
    expect(hasEnvVars).toBeTruthy();
  });

  it("is falsy when URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";
    const { hasEnvVars } = await import("./utils");
    expect(hasEnvVars).toBeFalsy();
  });

  it("is falsy when key is missing", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const { hasEnvVars } = await import("./utils");
    expect(hasEnvVars).toBeFalsy();
  });

  it("is falsy when URL is the starter placeholder", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "your-project-url";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";
    const { hasEnvVars } = await import("./utils");
    expect(hasEnvVars).toBeFalsy();
  });

  it("is falsy when URL is not HTTP or HTTPS", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "ftp://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";
    const { hasEnvVars } = await import("./utils");
    expect(hasEnvVars).toBeFalsy();
  });

  it("is falsy when key is the starter placeholder", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "your-publishable-or-anon-key";
    const { hasEnvVars } = await import("./utils");
    expect(hasEnvVars).toBeFalsy();
  });
});

describe("getMetadataBase", () => {
  it("falls back safely when the configured site URL is invalid", () => {
    const original = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "not a valid URL";
    try {
      expect(getMetadataBase().toString()).toBe("http://localhost:3000/");
    } finally {
      process.env.NEXT_PUBLIC_SITE_URL = original;
    }
  });
});

describe("getRequestOrigin", () => {
  it("prefers forwarded host and proto when present", () => {
    const headers = new Headers({
      "x-forwarded-host": "supagist.app",
      "x-forwarded-proto": "https",
    });

    expect(getRequestOrigin(headers)).toBe("https://supagist.app");
  });

  it("falls back to http for localhost hosts", () => {
    const headers = new Headers({ host: "localhost:3000" });

    expect(getRequestOrigin(headers)).toBe("http://localhost:3000");
  });

  it("falls back to configured app url when host headers are missing", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://supagist.app";

    expect(getRequestOrigin(new Headers())).toBe("https://supagist.app");
  });
});

describe("buildAppUrl", () => {
  it("builds absolute urls from relative paths", () => {
    expect(buildAppUrl("/hello-ts-abc123", "https://supagist.app")).toBe(
      "https://supagist.app/hello-ts-abc123",
    );
  });

  it("normalizes paths without a leading slash", () => {
    expect(buildAppUrl("hello-ts-abc123", "https://supagist.app")).toBe(
      "https://supagist.app/hello-ts-abc123",
    );
  });
});
