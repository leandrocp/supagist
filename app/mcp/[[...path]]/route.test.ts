import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config } from "@/proxy";
import { DELETE, GET, OPTIONS, POST } from "./route";
import {
  GET as wellKnown,
  OPTIONS as wellKnownOptions,
} from "@/app/.well-known/oauth-protected-resource/[[...path]]/route";

const endpoint = "https://supagist.app/mcp";
const context = (path?: string[]) => ({ params: Promise.resolve({ path }) });
const upstream = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://provider.example");
  vi.stubGlobal("fetch", upstream);
  upstream.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("branded MCP endpoint", () => {
  it("bypasses browser cookie refresh only for MCP paths", () => {
    for (const url of ["/mcp", "/mcp/oauth-protected-resource"]) {
      expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(false);
    }
    for (const url of ["/", "/oauth/consent", "/mcp-example-abc123"]) {
      expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
    }
  });

  it("advertises a matching public resource and the real OAuth issuer", async () => {
    const denied = await POST(new Request(endpoint, { method: "POST" }), context());
    expect(denied.status).toBe(401);
    expect(denied.headers.get("www-authenticate")).toBe(
      'Bearer resource_metadata="https://supagist.app/mcp/oauth-protected-resource"',
    );
    const metadata = await GET(
      new Request("https://internal-next-server/mcp/oauth-protected-resource", {
        headers: { host: "supagist.app", "x-forwarded-host": "attacker.example" },
      }),
      context(["oauth-protected-resource"]),
    );
    expect(await metadata.json()).toEqual({
      resource: endpoint,
      authorization_servers: ["https://provider.example/auth/v1"],
      bearer_methods_supported: ["header"],
    });
    expect(upstream).not.toHaveBeenCalled();
  });

  it("serves the same metadata at the RFC 9728 well-known URLs used for token refresh", async () => {
    const metadata = {
      resource: endpoint,
      authorization_servers: ["https://provider.example/auth/v1"],
      bearer_methods_supported: ["header"],
    };
    // Path-inserted form first, then the root form, matching MCP SDK discovery order.
    for (const path of [["mcp"], undefined]) {
      const url = `https://supagist.app/.well-known/oauth-protected-resource${path ? "/mcp" : ""}`;
      const response = await wellKnown(new Request(url), context(path));
      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBe("*");
      expect(await response.json()).toEqual(metadata);
    }
    const preflight = await wellKnownOptions(
      new Request("https://supagist.app/.well-known/oauth-protected-resource/mcp", {
        method: "OPTIONS",
      }),
      context(["mcp"]),
    );
    expect(preflight.status).toBe(204);
    for (const path of [["other"], ["mcp", "extra"]]) {
      const missing = await wellKnown(
        new Request(`https://supagist.app/.well-known/oauth-protected-resource/${path.join("/")}`),
        context(path),
      );
      expect(missing.status).toBe(404);
    }
    expect(upstream).not.toHaveBeenCalled();
  });

  it("forwards bearer requests and streams responses without cookies or arbitrary headers", async () => {
    let finish!: () => void;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"result":1}\n\n'));
        finish = () => controller.close();
      },
    });
    upstream.mockResolvedValue(
      new Response(stream, {
        headers: {
          "content-type": "text/event-stream",
          "mcp-session-id": "session-123",
          "set-cookie": "provider-session=private",
        },
      }),
    );
    const payload = '{"jsonrpc":"2.0","id":1,"method":"tools/list"}';
    const request = new Request(`${endpoint}?target=https://attacker.example`, {
      method: "POST",
      headers: {
        authorization: "Bearer user-token",
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        "mcp-protocol-version": "2025-06-18",
        "mcp-session-id": "session-123",
        cookie: "browser-session=private",
        apikey: "untrusted-key",
        "x-forwarded-for": "spoofed-ip",
        "x-forwarded-host": "attacker.example",
      },
      body: payload,
    });
    const response = await POST(request, context());
    const [target, init] = upstream.mock.calls[0];
    expect(String(target)).toBe("https://provider.example/functions/v1/mcp");
    expect(init?.redirect).toBe("error");
    expect(init?.cache).toBe("no-store");
    expect(init?.signal).toBe(request.signal);
    expect(await new Response(init?.body).text()).toBe(payload);
    expect(Object.fromEntries(new Headers(init?.headers))).toEqual({
      accept: "application/json, text/event-stream",
      authorization: "Bearer user-token",
      "content-type": "application/json",
      "mcp-protocol-version": "2025-06-18",
      "mcp-session-id": "session-123",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("mcp-session-id")).toBe("session-123");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const reader = response.body!.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toBe('data: {"result":1}\n\n');
    finish();
    expect((await reader.read()).done).toBe(true);
  });

  it("forwards Vercel's platform-verified client IP, not caller-selected alternatives", async () => {
    vi.stubEnv("VERCEL", "1");
    upstream.mockResolvedValue(new Response(null, { status: 202 }));
    await POST(
      new Request(endpoint, {
        method: "POST",
        headers: {
          authorization: "Bearer user-token",
          "x-vercel-forwarded-for": "192.0.2.42",
          "x-forwarded-for": "spoofed-ip",
          "cf-connecting-ip": "also-spoofed",
        },
      }),
      context(),
    );
    expect(new Headers(upstream.mock.calls[0][1]?.headers).get("x-forwarded-for")).toBe(
      "192.0.2.42",
    );
  });

  it.each([401, 403, 429, 503])(
    "preserves upstream status %i and rate-limit details",
    async (status) => {
      upstream.mockResolvedValue(
        Response.json(
          { error: "Denied" },
          {
            status,
            headers: {
              "retry-after": "37",
              "www-authenticate": 'Bearer resource_metadata="https://provider.example/internal"',
            },
          },
        ),
      );
      const response = await GET(
        new Request(endpoint, { headers: { authorization: "Bearer invalid-or-limited" } }),
        context(),
      );
      expect(response.status).toBe(status);
      expect(response.headers.get("retry-after")).toBe("37");
      expect(await response.json()).toEqual({ error: "Denied" });
      if (status === 401) {
        expect(response.headers.get("www-authenticate")).toContain(
          `${endpoint}/oauth-protected-resource`,
        );
        expect(response.headers.get("www-authenticate")).not.toContain("provider.example");
      }
    },
  );

  it("supports session deletion, SSE reconnection and unauthenticated preflight", async () => {
    upstream.mockResolvedValue(new Response(null, { status: 204 }));
    await DELETE(
      new Request(endpoint, {
        method: "DELETE",
        headers: { authorization: "Bearer user", "mcp-session-id": "session-123" },
      }),
      context(),
    );
    expect(upstream.mock.calls[0][1]?.method).toBe("DELETE");
    await GET(
      new Request(endpoint, {
        headers: { authorization: "Bearer user", "last-event-id": "event-9" },
      }),
      context(),
    );
    expect(new Headers(upstream.mock.calls[1][1]?.headers).get("last-event-id")).toBe("event-9");
    const preflight = await OPTIONS(new Request(endpoint, { method: "OPTIONS" }), context());
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-headers")).toContain("authorization");
    expect(preflight.headers.get("access-control-expose-headers")).toContain("www-authenticate");
  });

  it("rejects unknown routes and hides upstream network errors", async () => {
    const missing = await GET(new Request(`${endpoint}/unknown`), context(["unknown"]));
    expect(missing.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
    upstream.mockRejectedValue(new Error("provider.example private detail"));
    const failed = await POST(
      new Request(endpoint, { method: "POST", headers: { authorization: "Bearer user" } }),
      context(),
    );
    expect(failed.status).toBe(502);
    expect(await failed.text()).not.toContain("provider.example");
  });
});
