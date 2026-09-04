import { describe, expect, it } from "vitest";
import nextConfig, {
  buildContentSecurityPolicy,
  buildCliAuthContentSecurityPolicy,
  buildSecurityHeaderRules,
  securityHeaders,
  securityHeadersFor,
} from "./next.config";

describe("Next.js production security configuration", () => {
  it("disables the framework disclosure header", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("ships a restrictive baseline Content Security Policy", () => {
    const csp = securityHeaders.find((header) => header.key === "Content-Security-Policy")?.value;

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("https://*.supabase.co");
    expect(csp).toContain("wss://*.supabase.co");
    expect(csp).toContain("https://cdn.jsdelivr.net");
    expect(csp).toContain("'wasm-unsafe-eval'");
  });

  it("allows development tooling without weakening production", () => {
    const development = buildContentSecurityPolicy("development");
    const production = buildContentSecurityPolicy("production");

    expect(development).toContain("'unsafe-eval'");
    expect(development).toContain("http://localhost:*");
    expect(development).not.toContain("upgrade-insecure-requests");

    expect(production).not.toContain("'unsafe-eval'");
    expect(production).not.toContain("localhost");
    expect(production).toContain("upgrade-insecure-requests");
    expect(production).toContain("https://cdn.jsdelivr.net");
  });

  it("keeps loopback out of the production baseline", () => {
    // Only /auth/cli may talk to processes on the visitor's machine.
    expect(buildContentSecurityPolicy("production")).not.toContain("127.0.0.1");
  });

  it("keeps the existing defense-in-depth headers", () => {
    expect(securityHeaders).toEqual(
      expect.arrayContaining([
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ]),
    );
  });
});

describe("CLI login Content Security Policy", () => {
  const cliCsp = buildCliAuthContentSecurityPolicy("production");

  it("lets /auth/cli reach the loopback listener the CLI opened", () => {
    expect(cliCsp).toContain("http://127.0.0.1:*");
  });

  it("widens only connect-src, leaving every other directive untouched", () => {
    const baseline = buildContentSecurityPolicy("production");
    const directives = (policy: string) =>
      Object.fromEntries(
        policy.split("; ").map((directive) => {
          const [name, ...values] = directive.split(" ");
          return [name, values.join(" ")];
        }),
      );

    const base = directives(baseline);
    const cli = directives(cliCsp);

    expect(Object.keys(cli)).toEqual(Object.keys(base));
    for (const name of Object.keys(base)) {
      if (name === "connect-src") continue;
      expect(cli[name]).toBe(base[name]);
    }
  });

  it("keeps the Supabase connect sources it started with", () => {
    expect(cliCsp).toContain("https://*.supabase.co");
    expect(cliCsp).toContain("wss://*.supabase.co");
  });

  it("still forbids framing and inline objects on the consent page", () => {
    expect(cliCsp).toContain("frame-ancestors 'none'");
    expect(cliCsp).toContain("object-src 'none'");
  });
});

describe("output file tracing", () => {
  it("bundles the fonts and brand art the CLI renderer reads at request time", () => {
    // resvg needs the woff2 files on disk; the tracer cannot infer the path
    // because it is built at runtime from the EXPORT_FONTS registry.
    expect(nextConfig.outputFileTracingIncludes?.["/api/cli/publish"]).toEqual(
      expect.arrayContaining(["./public/fonts/**", "./public/brands/**"]),
    );
  });
});

describe("header rule ordering", () => {
  /**
   * Mimics how Next resolves `headers()`: every matching entry is applied in
   * order and the last value for a key wins.
   *
   * Built for "production" explicitly — under vitest `NODE_ENV` is "test",
   * whose baseline policy already allows loopback, so an environment-dependent
   * version of this test would pass no matter how the rules are ordered.
   */
  function effectiveHeaders(pathname: string) {
    const resolved = new Map<string, string>();
    for (const rule of buildSecurityHeaderRules("production")) {
      if (rule.source !== "/:path*" && rule.source !== pathname) continue;
      for (const header of rule.headers) resolved.set(header.key, header.value);
    }
    return resolved;
  }

  it("gives /auth/cli the loopback-capable policy", () => {
    // Regression: with the path-scoped entry listed first, the catch-all
    // overwrote it and `supagist auth login` was blocked by CSP in production.
    expect(effectiveHeaders("/auth/cli").get("Content-Security-Policy")).toContain(
      "http://127.0.0.1:*",
    );
  });

  it("leaves every other route on the baseline policy", () => {
    expect(effectiveHeaders("/").get("Content-Security-Policy")).toBe(
      buildContentSecurityPolicy("production"),
    );
  });

  it("keeps the other security headers on /auth/cli", () => {
    const resolved = effectiveHeaders("/auth/cli");
    for (const header of securityHeadersFor("production")) {
      if (header.key === "Content-Security-Policy") continue;
      expect(resolved.get(header.key)).toBe(header.value);
    }
  });
});
