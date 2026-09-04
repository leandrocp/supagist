import { describe, it, expect, vi, beforeEach } from "vitest";

const { hasEnvVarsRef } = vi.hoisted(() => ({ hasEnvVarsRef: { value: true } }));

vi.mock("@/lib/utils", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...original,
    get hasEnvVars() {
      return hasEnvVarsRef.value;
    },
  };
});

import { GET } from "./route";

function request(headers: Record<string, string> = {}) {
  return new Request("https://supagist.app/api/cli/config", {
    headers: { host: "supagist.app", "x-forwarded-proto": "https", ...headers },
  });
}

beforeEach(() => {
  hasEnvVarsRef.value = true;
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
});

describe("GET /api/cli/config", () => {
  it("returns the Supabase project the CLI should refresh tokens against", async () => {
    const body = await (await GET(request())).json();
    expect(body).toMatchObject({
      supabaseUrl: "https://project.supabase.co",
      supabasePublishableKey: "publishable-key",
    });
  });

  it("reports the origin the request arrived on so --host round-trips", async () => {
    const body = await (
      await GET(request({ host: "localhost:3000", "x-forwarded-proto": "http" }))
    ).json();
    expect(body.appUrl).toBe("http://localhost:3000");
  });

  it("advertises the option vocabulary so the CLI never goes stale", async () => {
    const { options } = await (await GET(request())).json();
    expect(options.brands).toContain("supabase");
    expect(options.backgrounds).toContain("Candy");
    expect(options.fonts).toContain("jetbrains");
    expect(options.windows).toContain("macos");
  });

  it("is never cached — the key can be rotated", async () => {
    const response = await GET(request());
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("exposes only the publishable key, never a secret one", async () => {
    const raw = JSON.stringify(await (await GET(request())).json());
    expect(raw).not.toContain("service_role");
    expect(raw).not.toContain("SUPABASE_SERVICE");
  });

  it("returns 503 when the deployment is not configured", async () => {
    hasEnvVarsRef.value = false;
    const response = await GET(request());
    expect(response.status).toBe(503);
  });
});
