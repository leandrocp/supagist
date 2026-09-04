import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreateSupabaseClient, mockRender, mockPublish } = vi.hoisted(() => ({
  mockCreateSupabaseClient: vi.fn(),
  mockRender: vi.fn(),
  mockPublish: vi.fn(),
}));

// `hasEnvVars` is evaluated once when `lib/utils` is first imported, which
// happens during the hoisted import below — long before any `beforeEach` could
// stub the environment. Override just that constant and keep the real helpers.
vi.mock("@/lib/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/utils")>()),
  hasEnvVars: true,
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: mockCreateSupabaseClient }));
// Only the renderer is stubbed — `toBlobPart` is a pure byte copy and the
// route's Blob construction should stay under test.
vi.mock("@/lib/cli-render", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/cli-render")>()),
  renderCliSnippetAssets: mockRender,
}));
vi.mock("@/lib/snippet-publish", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/snippet-publish")>()),
  publishSnippetWithClient: mockPublish,
}));

import { POST } from "./route";

const USER = {
  id: "user-1",
  is_anonymous: false,
  email: "dev@example.com",
  user_metadata: { user_name: "leandrocp", avatar_url: "https://avatars/1.png" },
};

function mockSupabase({ user = USER as object | null, error = null as object | null } = {}) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error }) } };
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://supagist.app/api/cli/publish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer token-123",
      host: "supagist.app",
      "x-forwarded-proto": "https",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const VALID = { code: "const x = 1;", filename: "app.ts" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
  mockCreateSupabaseClient.mockReturnValue(mockSupabase());
  mockRender.mockResolvedValue({
    canonicalPng: new Uint8Array([1]),
    ogPng: new Uint8Array([2]),
    svg: "<svg/>",
  });
  mockPublish.mockResolvedValue({ path: "/app-ts-abc123" });
});

describe("POST /api/cli/publish — authentication", () => {
  it("rejects a request with no Authorization header", async () => {
    const response = await POST(request(VALID, { Authorization: "" }));
    expect(response.status).toBe(401);
    expect((await response.json()).error).toMatch(/auth login/);
  });

  it("rejects a non-bearer Authorization scheme", async () => {
    const response = await POST(request(VALID, { Authorization: "Basic abc" }));
    expect(response.status).toBe(401);
  });

  it("accepts a lowercase bearer scheme", async () => {
    const response = await POST(request(VALID, { Authorization: "bearer token-123" }));
    expect(response.status).toBe(200);
  });

  it("validates the token against the auth server rather than trusting it", async () => {
    await POST(request(VALID));
    const supabase = mockCreateSupabaseClient.mock.results[0].value;
    expect(supabase.auth.getUser).toHaveBeenCalledWith("token-123");
  });

  it("binds the Supabase client to the caller's token so RLS still applies", async () => {
    await POST(request(VALID));
    expect(mockCreateSupabaseClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "publishable-key",
      expect.objectContaining({
        global: { headers: { Authorization: "Bearer token-123" } },
      }),
    );
  });

  it("does not persist a session on the server client", async () => {
    await POST(request(VALID));
    expect(mockCreateSupabaseClient.mock.calls[0][2].auth).toMatchObject({
      persistSession: false,
      autoRefreshToken: false,
    });
  });

  it("returns 401 when the token is rejected", async () => {
    mockCreateSupabaseClient.mockReturnValue(
      mockSupabase({ user: null, error: { message: "bad jwt" } }),
    );
    const response = await POST(request(VALID));
    expect(response.status).toBe(401);
  });

  it("returns 403 for an anonymous session and never renders", async () => {
    mockCreateSupabaseClient.mockReturnValue(
      mockSupabase({ user: { ...USER, is_anonymous: true } }),
    );
    const response = await POST(request(VALID));
    expect(response.status).toBe(403);
    expect(mockRender).not.toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
  });
});

describe("POST /api/cli/publish — request validation", () => {
  it("rejects a non-JSON body", async () => {
    const response = await POST(request("{not json"));
    expect(response.status).toBe(400);
  });

  it("rejects a JSON array body", async () => {
    const response = await POST(request([1, 2]));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/JSON object/);
  });

  it("requires code", async () => {
    const response = await POST(request({ filename: "app.ts" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/`code` is required/);
  });

  it("requires a non-blank filename", async () => {
    const response = await POST(request({ code: "x", filename: "   " }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/`filename` is required/);
  });

  it("rejects an oversized body before doing any work", async () => {
    const response = await POST(request(VALID, { "content-length": String(1024 * 1024) }));
    expect(response.status).toBe(413);
    expect(mockCreateSupabaseClient).not.toHaveBeenCalled();
  });

  it("rejects empty code", async () => {
    const response = await POST(request({ code: "", filename: "app.ts" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/Code must be/);
  });

  it("rejects code over the character limit without rendering it", async () => {
    // Rasterising an 8,001-character snippet only to have the database reject
    // it is pure wasted compute.
    const response = await POST(request({ code: "x".repeat(8001), filename: "app.ts" }));
    expect(response.status).toBe(400);
    expect(mockRender).not.toHaveBeenCalled();
  });

  it("counts the limit by code point, matching Postgres char_length", async () => {
    const response = await POST(request({ code: "🔥".repeat(8000), filename: "app.ts" }));
    expect(response.status).toBe(200);
  });

  it("returns 400 with the validator's message for a bad appearance", async () => {
    const response = await POST(request({ ...VALID, appearance: { brand: "nope" } }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/Unknown brand "nope"/);
    expect(mockRender).not.toHaveBeenCalled();
  });
});

describe("POST /api/cli/publish — language", () => {
  it("infers the language from the filename when none is given", async () => {
    await POST(request(VALID));
    expect(mockRender).toHaveBeenCalledWith(expect.objectContaining({ language: "typescript" }));
  });

  it("honours an explicit language", async () => {
    await POST(request({ ...VALID, language: "rust" }));
    expect(mockRender).toHaveBeenCalledWith(expect.objectContaining({ language: "rust" }));
  });

  it("falls back to inference for a blank language", async () => {
    await POST(request({ ...VALID, language: "  " }));
    expect(mockRender).toHaveBeenCalledWith(expect.objectContaining({ language: "typescript" }));
  });
});

describe("POST /api/cli/publish — success", () => {
  it("returns an absolute URL built from the request origin", async () => {
    const response = await POST(request(VALID));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: "https://supagist.app/app-ts-abc123",
      path: "/app-ts-abc123",
    });
  });

  it("passes the author's handle and avatar into the render", async () => {
    await POST(request(VALID));
    expect(mockRender).toHaveBeenCalledWith(
      expect.objectContaining({
        authorUsername: "leandrocp",
        authorAvatarUrl: "https://avatars/1.png",
      }),
    );
  });

  it("falls back to the email local-part when there is no GitHub handle", async () => {
    mockCreateSupabaseClient.mockReturnValue(
      mockSupabase({ user: { ...USER, user_metadata: {} } }),
    );
    await POST(request(VALID));
    expect(mockRender).toHaveBeenCalledWith(expect.objectContaining({ authorUsername: "dev" }));
  });

  it("sends a null avatar rather than an empty string", async () => {
    mockCreateSupabaseClient.mockReturnValue(
      mockSupabase({ user: { ...USER, user_metadata: { user_name: "x", avatar_url: "" } } }),
    );
    await POST(request(VALID));
    expect(mockRender).toHaveBeenCalledWith(expect.objectContaining({ authorAvatarUrl: null }));
  });

  it("publishes the rendered assets with the resolved theme", async () => {
    await POST(request({ ...VALID, appearance: { theme: "nord" } }));
    expect(mockPublish).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ theme: "nord", filename: "app.ts", language: "typescript" }),
    );
  });

  it("trims the filename before publishing", async () => {
    await POST(request({ code: "x", filename: "  app.ts  " }));
    expect(mockPublish).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ filename: "app.ts" }),
    );
  });
});

describe("POST /api/cli/publish — failures", () => {
  it("maps a rate-limit rejection to 429", async () => {
    mockPublish.mockResolvedValue({ error: "Slow down.", reason: "rate_limited" });
    expect((await POST(request(VALID))).status).toBe(429);
  });

  it("maps an unauthenticated rejection to 403", async () => {
    mockPublish.mockResolvedValue({ error: "Nope.", reason: "unauthenticated" });
    expect((await POST(request(VALID))).status).toBe(403);
  });

  it("maps a storage failure to 502", async () => {
    mockPublish.mockResolvedValue({ error: "Upload failed.", reason: "storage_failed" });
    expect((await POST(request(VALID))).status).toBe(502);
  });

  it("maps an insert failure to 500", async () => {
    mockPublish.mockResolvedValue({ error: "Insert failed.", reason: "insert_failed" });
    expect((await POST(request(VALID))).status).toBe(500);
  });

  it("returns 500 without leaking internals when rendering throws", async () => {
    mockRender.mockRejectedValue(new Error("resvg segfault at 0xdeadbeef"));
    const response = await POST(request(VALID));
    expect(response.status).toBe(500);
    expect((await response.json()).error).not.toContain("0xdeadbeef");
  });
});
