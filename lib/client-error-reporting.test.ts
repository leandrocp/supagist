// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { reportClientError } from "./client-error-reporting";

afterEach(() => vi.restoreAllMocks());

describe("reportClientError", () => {
  it("sends a bounded report without stack or credential data", async () => {
    const sendBeacon = vi.fn<(url: string | URL, data?: BodyInit | null) => boolean>(() => true);
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: sendBeacon });
    window.history.replaceState({}, "", "/snippet-test");
    const error = Object.assign(new Error("x".repeat(600)), { digest: "digest-123" });

    reportClientError(error);

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url, body] = sendBeacon.mock.calls[0];
    expect(url).toBe("/api/errors");
    if (!(body instanceof Blob)) throw new Error("expected the report body to be a Blob");

    let report: Record<string, unknown>;
    try {
      report = JSON.parse(await body.text()) as Record<string, unknown>;
    } catch (parseError) {
      throw new Error("client error report was not valid JSON", { cause: parseError });
    }
    expect(String(report.message)).toHaveLength(500);
    expect(report.digest).toBe("digest-123");
    expect(report.path).toBe("/snippet-test");
    expect(report).not.toHaveProperty("stack");
  });
});
