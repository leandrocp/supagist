import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

import { publishSnippet } from "./publish";

// ── Mock factory ──────────────────────────────────────────────────────────────

function makeMockSupabase({
  user = { id: "user-1", user_metadata: { user_name: "testuser", avatar_url: "" } } as
    | object
    | null,
  authError = null as object | null,
  profileExists = true,
  uploadError = null as { message: string } | null,
  insertError = null as { message: string } | null,
  upsertError = null as { message: string } | null,
} = {}) {
  const mockSingle = vi
    .fn()
    .mockResolvedValue({ data: profileExists ? { id: "user-1" } : null, error: null });
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq, single: mockSingle });
  const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: upsertError });
  const mockInsert = vi.fn().mockResolvedValue({ data: null, error: insertError });
  const mockFrom = vi
    .fn()
    .mockReturnValue({ select: mockSelect, upsert: mockUpsert, insert: mockInsert });

  const mockUpload = vi.fn().mockResolvedValue({ data: {}, error: uploadError });
  const mockRemove = vi.fn().mockResolvedValue({});
  const mockStorageFrom = vi.fn().mockReturnValue({ upload: mockUpload, remove: mockRemove });
  const mockRpc = vi.fn();

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: authError }),
    },
    from: mockFrom,
    storage: { from: mockStorageFrom },
    rpc: mockRpc,
    _: {
      mockSingle,
      mockEq,
      mockSelect,
      mockUpsert,
      mockInsert,
      mockFrom,
      mockUpload,
      mockRemove,
      mockStorageFrom,
      mockRpc,
    },
  };
}

// ── FormData helpers ──────────────────────────────────────────────────────────

function makeFormData(overrides: Record<string, string | Blob> = {}): FormData {
  const fd = new FormData();
  fd.set("code", "const x = 1;");
  fd.set("filename", "foo.ts");
  fd.set("theme", "tokyo-night");
  fd.set("language", "typescript");
  fd.set("canonical_image", new Blob(["png"], { type: "image/png" }));
  fd.set("og_image", new Blob(["png"], { type: "image/png" }));
  fd.set("svg", new Blob(["<svg/>"], { type: "image/svg+xml" }));
  for (const [k, v] of Object.entries(overrides)) {
    fd.set(k, v);
  }
  return fd;
}

// ── Validation (no Supabase calls) ────────────────────────────────────────────

describe("publishSnippet — validation", () => {
  it("rejects when code is missing (not a string)", async () => {
    const fd = makeFormData();
    fd.delete("code");
    expect((await publishSnippet(fd)).error).toBe("Invalid publish data.");
  });

  it("rejects when canonical_image is not a Blob", async () => {
    expect((await publishSnippet(makeFormData({ canonical_image: "not-a-blob" }))).error).toBe(
      "Invalid publish data.",
    );
  });

  it("rejects when og_image is not a Blob", async () => {
    expect((await publishSnippet(makeFormData({ og_image: "not-a-blob" }))).error).toBe(
      "Invalid publish data.",
    );
  });

  it("rejects when svg is not a Blob", async () => {
    expect((await publishSnippet(makeFormData({ svg: "not-a-blob" }))).error).toBe(
      "Invalid publish data.",
    );
  });

  it("rejects empty code", async () => {
    expect((await publishSnippet(makeFormData({ code: "" }))).error).toMatch(/Code must be/);
  });

  it("rejects code exceeding 8000 characters", async () => {
    expect((await publishSnippet(makeFormData({ code: "x".repeat(8001) }))).error).toMatch(
      /Code must be/,
    );
  });

  it("accepts code at exactly 8000 characters (boundary)", async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase());
    const result = await publishSnippet(makeFormData({ code: "x".repeat(8000) }));
    expect(result.error).toBeUndefined();
  });

  it("accepts code at exactly 1 character (boundary)", async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase());
    const result = await publishSnippet(makeFormData({ code: "x" }));
    expect(result.error).toBeUndefined();
  });

  it("rejects blank filename", async () => {
    expect((await publishSnippet(makeFormData({ filename: "   " }))).error).toBe(
      "Filename is required.",
    );
  });

  it("error result never has a path", async () => {
    const result = await publishSnippet(makeFormData({ code: "" }));
    expect("path" in result).toBe(false);
  });
});

// ── Auth guard ────────────────────────────────────────────────────────────────

describe("publishSnippet — auth guard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects when user is not signed in", async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase({ user: null }));
    expect((await publishSnippet(makeFormData())).error).toBe(
      "You must be signed in with a permanent account to publish.",
    );
  });

  it("rejects anonymous Supabase users", async () => {
    const supabase = makeMockSupabase({ user: { id: "guest-1", is_anonymous: true } });
    mockCreateClient.mockResolvedValue(supabase);

    expect((await publishSnippet(makeFormData())).error).toBe(
      "You must be signed in with a permanent account to publish.",
    );
    expect(supabase._.mockUpload).not.toHaveBeenCalled();
    expect(supabase._.mockInsert).not.toHaveBeenCalled();
  });

  it("rejects when auth returns an error", async () => {
    mockCreateClient.mockResolvedValue(
      makeMockSupabase({ user: null, authError: { message: "token expired" } }),
    );
    expect((await publishSnippet(makeFormData())).error).toBe(
      "You must be signed in with a permanent account to publish.",
    );
  });
});

// ── Happy path ────────────────────────────────────────────────────────────────

describe("publishSnippet — happy path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a path on success", async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase());
    const result = await publishSnippet(makeFormData());
    expect(result.error).toBeUndefined();
    expect(result.path).toMatch(/^\/[a-z0-9-]+-[a-z0-9]{6}$/);
  });

  it("path slug is derived from the filename", async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase());
    const result = await publishSnippet(makeFormData({ filename: "my-script.ts" }));
    // toSlug preserves the extension as part of the slug: "my-script.ts" → "my-script-ts"
    expect(result.path).toMatch(/^\/my-script-ts-[a-z0-9]{6}$/);
  });

  it("uploads every asset under the authenticated user's storage prefix", async () => {
    const supabase = makeMockSupabase();
    mockCreateClient.mockResolvedValue(supabase);

    await publishSnippet(makeFormData());

    const uploadedPaths = supabase._.mockUpload.mock.calls.map(([path]) => path as string);
    expect(uploadedPaths).toHaveLength(4);
    expect(uploadedPaths).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^user-1\/snippets\/[0-9a-f-]+\/canonical\.png$/),
        expect.stringMatching(/^user-1\/snippets\/[0-9a-f-]+\/og\.png$/),
        expect.stringMatching(/^user-1\/snippets\/[0-9a-f-]+\/canonical\.svg$/),
        expect.stringMatching(/^user-1\/snippets\/[0-9a-f-]+\/raw\.ts$/),
      ]),
    );
    expect(new Set(uploadedPaths.map((path) => path.split("/").slice(0, 3).join("/"))).size).toBe(
      1,
    );
  });

  it("inserts reactions when provided", async () => {
    const supabase = makeMockSupabase();
    mockCreateClient.mockResolvedValue(supabase);
    const fd = makeFormData();
    fd.set("reactions", JSON.stringify({ 1: "🔥", 3: "💡" }));
    await publishSnippet(fd);
    const rxnCall = supabase._.mockInsert.mock.calls.find(
      (c) => Array.isArray(c[0]) && (c[0] as Array<{ emoji: string }>)[0]?.emoji,
    );
    expect(rxnCall).toBeDefined();
    const rows = rxnCall![0] as Array<{ line_number: number; emoji: string }>;
    expect(rows.find((r) => r.line_number === 1)?.emoji).toBe("🔥");
    expect(rows.find((r) => r.line_number === 3)?.emoji).toBe("💡");
  });

  it("skips reaction insert when there are no reactions", async () => {
    const supabase = makeMockSupabase();
    mockCreateClient.mockResolvedValue(supabase);
    await publishSnippet(makeFormData());
    const rxnCall = supabase._.mockInsert.mock.calls.find(
      (c) => Array.isArray(c[0]) && (c[0] as Array<{ emoji: string }>)[0]?.emoji,
    );
    expect(rxnCall).toBeUndefined();
  });

  it("creates a profile when one does not yet exist", async () => {
    const supabase = makeMockSupabase({ profileExists: false });
    mockCreateClient.mockResolvedValue(supabase);
    const result = await publishSnippet(makeFormData());
    expect(supabase._.mockUpsert).toHaveBeenCalled();
    expect(result.error).toBeUndefined();
  });

  it("normalizes CRLF line endings to LF before storing the snippet", async () => {
    // Regression: snippets pasted from Windows-style sources kept their
    // \r\n endings, and rendering each token chunk with `text.split('\n')`
    // left a trailing \r in the per-line spans. CSS `white-space: pre-wrap`
    // treats \r as a segment break, so the trailing reaction chip dropped
    // onto a fresh visual row even when there was room. Stored code must
    // be LF-only.
    const supabase = makeMockSupabase();
    mockCreateClient.mockResolvedValue(supabase);
    await publishSnippet(makeFormData({ code: "line1\r\nline2\r\nline3" }));
    const insertCall = supabase._.mockInsert.mock.calls.find(
      (c) => !Array.isArray(c[0]) && (c[0] as { code?: string })?.code,
    );
    expect(insertCall).toBeDefined();
    const row = insertCall![0] as { code: string; line_count: number };
    expect(row.code).toBe("line1\nline2\nline3");
    expect(row.line_count).toBe(3);
  });

  it("inserts code_char_count by Unicode code point so it matches Postgres char_length", async () => {
    // Regression: the snippets_code_char_count_check constraint compares the
    // value we insert against char_length(code), which counts code points.
    // String.length counts UTF-16 code units, so any astral character (e.g.
    // 🔥) made the insert fail when we used .length directly. The fixture
    // here has 3 code points but String.length === 4.
    const supabase = makeMockSupabase();
    mockCreateClient.mockResolvedValue(supabase);
    await publishSnippet(makeFormData({ code: "a🔥b" }));
    const insertCall = supabase._.mockInsert.mock.calls.find(
      (c) => !Array.isArray(c[0]) && (c[0] as { code_char_count?: number })?.code_char_count,
    );
    expect(insertCall).toBeDefined();
    const row = insertCall![0] as { code: string; code_char_count: number };
    expect(row.code).toBe("a🔥b");
    expect(row.code_char_count).toBe(3);
    expect(row.code.length).toBe(4); // sanity-check the JS-vs-PG divergence
  });
});

// ── Error handling ────────────────────────────────────────────────────────────

describe("publishSnippet — error handling", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an error when storage upload fails", async () => {
    mockCreateClient.mockResolvedValue(
      makeMockSupabase({ uploadError: { message: "quota exceeded" } }),
    );
    expect((await publishSnippet(makeFormData())).error).toMatch(/quota exceeded/);
  });

  it("cleans up uploaded files when storage upload fails", async () => {
    const supabase = makeMockSupabase({ uploadError: { message: "quota exceeded" } });
    mockCreateClient.mockResolvedValue(supabase);
    await publishSnippet(makeFormData());
    expect(supabase._.mockRemove).toHaveBeenCalled();
  });

  it("returns an error when snippet insert fails", async () => {
    const supabase = makeMockSupabase({ insertError: { message: "unique constraint" } });
    mockCreateClient.mockResolvedValue(supabase);
    const result = await publishSnippet(makeFormData());
    expect(result.error).toBe("Failed to publish the snippet. Please try again.");
  });

  it("cleans up uploaded files when snippet insert fails", async () => {
    const supabase = makeMockSupabase({ insertError: { message: "unique constraint" } });
    mockCreateClient.mockResolvedValue(supabase);
    await publishSnippet(makeFormData());
    expect(supabase._.mockRemove).toHaveBeenCalled();
  });

  it("handles malformed reactions JSON gracefully and still publishes", async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase());
    const fd = makeFormData();
    fd.set("reactions", "{not valid json}");
    const result = await publishSnippet(fd);
    expect(result.error).toBeUndefined();
    expect(result.path).toBeDefined();
  });

  it("handles malformed comments JSON gracefully and still publishes", async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase());
    const fd = makeFormData();
    fd.set("comments", "[[broken");
    const result = await publishSnippet(fd);
    expect(result.error).toBeUndefined();
    expect(result.path).toBeDefined();
  });

  it("ignores non-object reactions JSON", async () => {
    const supabase = makeMockSupabase();
    mockCreateClient.mockResolvedValue(supabase);
    const fd = makeFormData();
    fd.set("reactions", "null");
    await publishSnippet(fd);
    const rxnCall = supabase._.mockInsert.mock.calls.find(
      (c) => Array.isArray(c[0]) && (c[0] as Array<{ emoji: string }>)[0]?.emoji,
    );
    expect(rxnCall).toBeUndefined();
  });

  it("sanitizes the raw asset extension before upload", async () => {
    const supabase = makeMockSupabase();
    mockCreateClient.mockResolvedValue(supabase);
    await publishSnippet(makeFormData({ filename: "foo.ts/bar" }));
    const rawUploadCall = supabase._.mockUpload.mock.calls.at(-1);
    expect(rawUploadCall?.[0]).toMatch(/\/raw\.txt$/);
  });
});

// ── Rate limiting ─────────────────────────────────────────────────────────────

describe("publishSnippet — database-enforced rate limiting", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps the database hourly-limit error to a user-facing message", async () => {
    const supabase = makeMockSupabase({
      insertError: { message: "publish_hour_rate_limit" },
    });
    mockCreateClient.mockResolvedValue(supabase);

    const result = await publishSnippet(makeFormData());

    expect(result.error).toBe("Too many snippets in the last hour. Try again later.");
    expect(supabase._.mockRemove).toHaveBeenCalled();
  });

  it("maps the database daily-limit error to a user-facing message", async () => {
    const supabase = makeMockSupabase({
      insertError: { message: "publish_day_rate_limit" },
    });
    mockCreateClient.mockResolvedValue(supabase);

    const result = await publishSnippet(makeFormData());

    expect(result.error).toBe("Daily snippet limit reached. Come back tomorrow.");
    expect(supabase._.mockRemove).toHaveBeenCalled();
  });

  it("does not call the generic rate-limit RPC from the application", async () => {
    const supabase = makeMockSupabase();
    mockCreateClient.mockResolvedValue(supabase);

    await publishSnippet(makeFormData());

    expect(supabase._.mockRpc).not.toHaveBeenCalled();
  });

  it("publishes normally when the database accepts the insert", async () => {
    const supabase = makeMockSupabase();
    mockCreateClient.mockResolvedValue(supabase);
    const result = await publishSnippet(makeFormData());
    expect(result.error).toBeUndefined();
    expect(result.path).toBeDefined();
  });
});
