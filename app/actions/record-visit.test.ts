import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ rpc: mockRpc }),
}));

import { recordVisit } from "./record-visit";

describe("recordVisit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  it("calls record_visit RPC with the snippet id and page_view source", async () => {
    await recordVisit("snippet-123");
    expect(mockRpc).toHaveBeenCalledWith("record_visit", {
      p_snippet_id: "snippet-123",
      p_source: "page_view",
    });
  });

  it("calls increment_view_count RPC with the snippet id", async () => {
    await recordVisit("snippet-123");
    expect(mockRpc).toHaveBeenCalledWith("increment_view_count", {
      p_snippet_id: "snippet-123",
    });
  });

  it("calls both RPCs for every invocation", async () => {
    await recordVisit("snippet-abc");
    expect(mockRpc).toHaveBeenCalledTimes(2);
  });

  it("resolves without throwing even when RPCs return an error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "DB down" } });
    await expect(recordVisit("snippet-123")).resolves.toBeUndefined();
  });

  it("uses separate snippet ids across calls", async () => {
    await recordVisit("aaa");
    await recordVisit("bbb");
    const ids = mockRpc.mock.calls.map((c) => (c[1] as { p_snippet_id: string }).p_snippet_id);
    expect(ids).toContain("aaa");
    expect(ids).toContain("bbb");
  });
});
