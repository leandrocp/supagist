import { describe, it, expect, afterEach, vi } from "vitest";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { signInWithPassword: vi.fn().mockResolvedValue({ error: null }) },
  })),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

import { POST } from "./route";

function buildRequest(secret?: string) {
  return new Request("http://localhost/api/test/sign-in", {
    method: "POST",
    headers: secret ? { "x-e2e-secret": secret, "content-type": "application/json" } : {},
    body: JSON.stringify({ email: "user@example.com", password: "pw" }),
  }) as unknown as Parameters<typeof POST>[0];
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/test/sign-in", () => {
  it("returns 404 in production even with the correct secret", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("E2E_TEST_SECRET", "right");
    const res = await POST(buildRequest("right"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when E2E_TEST_SECRET is unset", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("E2E_TEST_SECRET", "");
    const res = await POST(buildRequest("anything"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when the secret header is wrong", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("E2E_TEST_SECRET", "right");
    const res = await POST(buildRequest("wrong"));
    expect(res.status).toBe(404);
  });

  it("accepts the request when the secret matches outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("E2E_TEST_SECRET", "right");
    const res = await POST(buildRequest("right"));
    expect(res.status).toBe(200);
  });
});
