import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ rpc: mockRpc }),
}));

import { recordVisit } from "./record-visit";

describe("recordVisit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: true, error: null });
  });

  it("calls the bounded atomic view RPC once", async () => {
    await recordVisit("snippet-123");

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("record_snippet_view", {
      p_snippet_id: "snippet-123",
    });
  });

  it("resolves without throwing when a best-effort view write fails", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "DB down" } });
    await expect(recordVisit("snippet-123")).resolves.toBeUndefined();
  });

  it("uses separate snippet ids across calls", async () => {
    await recordVisit("aaa");
    await recordVisit("bbb");
    const ids = mockRpc.mock.calls.map((call) => {
      return (call[1] as { p_snippet_id: string }).p_snippet_id;
    });
    expect(ids).toEqual(["aaa", "bbb"]);
  });
});
