import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

afterEach(() => vi.restoreAllMocks());

function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("https://supagist.app/api/errors", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/errors", () => {
  it("accepts and logs a bounded client error report", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(request({ message: "render failed", digest: "abc", path: "/x" }));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ accepted: true });
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(String(consoleError.mock.calls[0][0])).not.toContain("cookie");
  });

  it("rejects missing messages", async () => {
    const response = await POST(request({ digest: "abc" }));
    expect(response.status).toBe(400);
  });

  it("rejects oversized bodies before parsing", async () => {
    const response = await POST(request({ message: "x" }, { "Content-Length": "4097" }));
    expect(response.status).toBe(413);
  });

  it("measures actual bytes when Content-Length is absent", async () => {
    const response = await POST(request({ message: "x".repeat(5000) }));
    expect(response.status).toBe(413);
  });

  it("rejects a large body even when Content-Length lies", async () => {
    const response = await POST(request({ message: "x".repeat(5000) }, { "Content-Length": "1" }));
    expect(response.status).toBe(413);
  });
});
