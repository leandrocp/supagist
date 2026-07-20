import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestError } from "./instrumentation";

afterEach(() => vi.restoreAllMocks());

describe("server request instrumentation", () => {
  it("logs structured request context without request headers", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await onRequestError(
      Object.assign(new Error("render failed"), { digest: "digest-123" }),
      { path: "/snippet", method: "GET", headers: { cookie: "secret-cookie" } },
      {
        routerKind: "App Router",
        routePath: "/[snippet]",
        routeType: "render",
        renderSource: "server-rendering",
        revalidateReason: undefined,
      },
    );

    expect(consoleError).toHaveBeenCalledTimes(1);
    let payload: unknown;
    try {
      payload = JSON.parse(String(consoleError.mock.calls[0][0]));
    } catch (error) {
      throw new Error("instrumentation did not emit valid JSON", { cause: error });
    }
    expect(payload).toMatchObject({
      event: "server_request_error",
      message: "render failed",
      digest: "digest-123",
      method: "GET",
      path: "/snippet",
      routePath: "/[snippet]",
    });
    expect(JSON.stringify(payload)).not.toContain("secret-cookie");
  });
});
