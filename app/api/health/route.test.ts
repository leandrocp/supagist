import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("@/lib/utils", () => ({ hasEnvVars: true }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.limit.mockResolvedValue({ error: null });
  mocks.createClient.mockResolvedValue({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ limit: mocks.limit })),
    })),
  });
});

describe("GET /api/health", () => {
  it("returns an uncached healthy response when the database answers", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(await response.json()).toMatchObject({ status: "ok", database: "ok" });
  });

  it("returns 503 without leaking database details when the query fails", async () => {
    mocks.limit.mockResolvedValue({ error: { message: "connection details" } });

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unhealthy", database: "unreachable" });
  });

  it("returns 503 when client creation throws", async () => {
    mocks.createClient.mockRejectedValue(new Error("secret detail"));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unhealthy", database: "unreachable" });
  });
});
