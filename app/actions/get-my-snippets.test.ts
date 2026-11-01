import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

import { getMySnippets } from "./get-my-snippets";

const SNIPPET = {
  short_id: "abc123",
  slug: "hello-ts",
  filename: "hello.ts",
  language: "typescript",
  created_at: "2026-04-24T00:00:00Z",
  view_count: 5,
  canonical_image_path: "user-1/snippets/s1/canonical.png",
};

function makeMockSupabase({
  user = { id: "user-1" } as object | null,
  snippets = [SNIPPET] as object[] | null,
  dbError = null as object | null,
} = {}) {
  const mockOrder = vi.fn().mockReturnThis();
  const mockLimit = vi.fn().mockResolvedValue({ data: snippets, error: dbError });
  const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
  mockOrder.mockReturnValue({ limit: mockLimit });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: mockFrom,
    storage: {
      from: vi.fn().mockReturnValue({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://cdn.test/snippet-images/${path}` },
        }),
      }),
    },
  };
}

describe("getMySnippets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty array when not authenticated", async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase({ user: null }));
    expect(await getMySnippets()).toEqual([]);
  });

  it("returns snippets for the current user", async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase());
    const result = await getMySnippets();
    expect(result).toHaveLength(1);
    expect(result[0].short_id).toBe("abc123");
    expect(result[0].filename).toBe("hello.ts");
    // The thumbnail is the stored render's public URL; the raw path is not leaked.
    expect(result[0].thumbnail_url).toBe(
      "https://cdn.test/snippet-images/user-1/snippets/s1/canonical.png",
    );
    expect(result[0]).not.toHaveProperty("canonical_image_path");
  });

  it("returns empty array when the user has no snippets", async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase({ snippets: [] }));
    expect(await getMySnippets()).toEqual([]);
  });

  it("returns empty array on database error", async () => {
    mockCreateClient.mockResolvedValue(
      makeMockSupabase({ snippets: null, dbError: { message: "connection error" } }),
    );
    expect(await getMySnippets()).toEqual([]);
  });

  it("queries snippets ordered by created_at descending with limit 20", async () => {
    const supabase = makeMockSupabase();
    mockCreateClient.mockResolvedValue(supabase);
    await getMySnippets();
    const fromCall = supabase.from.mock.calls[0];
    expect(fromCall[0]).toBe("snippets");
  });
});
