import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../options/route";
import { POST } from "./route";

const fetchMock = vi.fn<typeof fetch>();
const svg = (width: number, height: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#3ECF8E"/></svg>`;

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("VERCEL", "");
  fetchMock.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request("https://supagist.app/api/render", {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
const upstreamCall = (index = 0) => {
  const [url, init] = fetchMock.mock.calls[index];
  return { url: String(url), init: init!, headers: new Headers(init!.headers) };
};

describe("POST /api/render", () => {
  it("forwards SVG requests unchanged with the caller's token", async () => {
    fetchMock.mockResolvedValue(
      new Response("<svg/>", {
        headers: { "content-type": "image/svg+xml", "x-supagist-width": "300", "set-cookie": "x" },
      }),
    );
    const body = '{"code":"const a = 1;","brand":"supabase"}';
    const response = await post(body, {
      authorization: "Bearer user-token",
      "user-agent": "supagist-cli/0.1.0",
      "x-supagist-client-ip": "198.51.100.7",
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<svg/>");
    expect(response.headers.get("x-supagist-width")).toBe("300");
    expect(response.headers.get("set-cookie")).toBeNull();
    const call = upstreamCall();
    expect(call.url).toBe("https://project.supabase.co/functions/v1/render");
    expect(call.init.body).toBe(body);
    expect(call.headers.get("authorization")).toBe("Bearer user-token");
    expect(call.headers.get("user-agent")).toBe("supagist-cli/0.1.0");
    // A caller cannot pick the IP its quota is charged to.
    expect(call.headers.get("x-supagist-client-ip")).toBeNull();
    expect(call.init.redirect).toBe("error");
  });

  it("on Vercel, sends the ingress client IP with the deployment's OIDC token", async () => {
    vi.stubEnv("VERCEL", "1");
    fetchMock.mockResolvedValue(new Response("<svg/>"));
    await post(
      { code: "x" },
      { "x-vercel-forwarded-for": "203.0.113.4", "x-vercel-oidc-token": "oidc.jwt" },
    );
    const { headers } = upstreamCall();
    expect(headers.get("x-supagist-client-ip")).toBe("203.0.113.4");
    expect(headers.get("x-supagist-proxy-token")).toBe("oidc.jwt");
  });

  it("passes rate limit and validation errors through with Retry-After", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { code: "RATE_LIMITED", message: "Rate limit reached.", retryAfter: 60 } },
        { status: 429, headers: { "retry-after": "60" } },
      ),
    );
    const response = await post({ code: "x", format: "png" });
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect((await response.json()).error.code).toBe("RATE_LIMITED");
  });

  it("rasterizes PNG from an SVG rendered at 1x, at the requested pixel ratio", async () => {
    fetchMock.mockResolvedValue(new Response(svg(40, 30)));
    const response = await post({ code: "x", brand: "vercel", format: "png", pixelRatio: 4 });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-supagist-width")).toBe("160");
    expect(response.headers.get("x-supagist-height")).toBe("120");
    const png = Buffer.from(await response.arrayBuffer());
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(160);
    expect(png.readUInt32BE(20)).toBe(120);
    expect(JSON.parse(upstreamCall().init.body as string)).toEqual({
      code: "x",
      brand: "vercel",
    });
  });

  it("defaults PNG to 2x", async () => {
    fetchMock.mockResolvedValue(new Response(svg(40, 30)));
    const response = await post({ code: "x", format: "png" });
    expect(response.headers.get("x-supagist-width")).toBe("80");
  });

  it("rejects unsupported PNG pixel ratios without rendering", async () => {
    const response = await post({ code: "x", format: "png", pixelRatio: 3 });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "INVALID_INPUT", message: "pixelRatio: PNG supports 1, 2, 4, 6" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses PNGs above 16 million pixels", async () => {
    fetchMock.mockResolvedValue(new Response(svg(1000, 1000)));
    const response = await post({ code: "x", format: "png", pixelRatio: 6 });
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toMatch(/6000×6000 PNG exceeds 16 million/);
  });

  it("rejects bodies over 256 KB before calling the function", async () => {
    const response = await post({ code: "x".repeat(300 * 1024) });
    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards malformed JSON so the function charges and rejects it", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: { code: "INVALID_JSON" } }, { status: 400 }),
    );
    const response = await post("{nope");
    expect(response.status).toBe(400);
    expect(upstreamCall().init.body).toBe("{nope");
  });

  it("reports an unreachable function as 502", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const response = await post({ code: "x" });
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("UPSTREAM_UNAVAILABLE");
  });
});

describe("GET /api/options", () => {
  it("adds the formats and pixel ratios this layer renders", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ brands: [{ id: "supabase" }], themes: ["dracula"] }),
    );
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    const response = await GET(new Request("https://supagist.app/api/options"));
    expect(upstreamCall().url).toBe("https://project.supabase.co/functions/v1/render/options");
    expect(upstreamCall().init.method).toBe("GET");
    expect(await response.json()).toEqual({
      brands: [{ id: "supabase" }],
      themes: ["dracula"],
      formats: ["svg", "png"],
      pixelRatios: { svg: [1, 2], png: [1, 2, 4, 6] },
      defaults: { format: "svg", pixelRatio: { svg: 1, png: 2 } },
      supabase: { url: "https://project.supabase.co", publishableKey: "sb_publishable_test" },
    });
  });

  it("passes upstream errors through", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 503 }));
    const response = await GET(new Request("https://supagist.app/api/options"));
    expect(response.status).toBe(503);
  });
});
