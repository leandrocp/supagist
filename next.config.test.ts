import { describe, expect, it } from "vitest";
import nextConfig, { buildContentSecurityPolicy, securityHeaders } from "./next.config";

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

  it("lets the snippet page load Lumis's native addon and installed parsers", () => {
    // Bundling the Node entry fails the build, and file tracing cannot see the
    // parsers Lumis resolves from the project directory at runtime.
    expect(nextConfig.serverExternalPackages).toContain("@lumis-sh/lumis");
    expect(nextConfig.outputFileTracingIncludes?.["/\\[snippet\\]"]).toEqual([
      "./node_modules/@lumis-sh/wasm-*/**/*",
    ]);
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
