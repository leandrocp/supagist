import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

// Supabase is external I/O here; the route and the real renderer run unmocked.
const db = vi.hoisted(() => ({ snippet: null as Record<string, unknown> | null }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    rpc: () => ({ select: () => ({ maybeSingle: async () => ({ data: db.snippet }) }) }),
  }),
}));

const { GET } = await import("./route");

const get = (param = "snippet-tsx-zocdc9") =>
  GET(new Request(`https://supagist.app/${param}/image.png`), {
    params: Promise.resolve({ snippet: param }),
  });

beforeEach(() => {
  db.snippet = {
    code: "export const edited = true;",
    filename: "snippet.tsx",
    language: "tsx",
    theme: "dracula",
    font_id: "jetbrains",
    appearance: { background: "Lumis" },
    visibility: "public",
    author: { username: "leandrocp", avatar_url: null },
  };
});

afterEach(() => vi.restoreAllMocks());

describe("GET /[snippet]/image.png", () => {
  it("renders the edited snippet as a cacheable PNG", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    );
    expect((await sharp(Buffer.from(await res.arrayBuffer())).metadata()).width).toBeGreaterThan(0);
  }, 30_000);

  it("marks unlisted renders noindex and 404s for unknown links", async () => {
    db.snippet = { ...db.snippet, visibility: "unlisted" };
    expect((await get()).headers.get("x-robots-tag")).toBe("noindex");
    db.snippet = null;
    expect((await get()).status).toBe(404);
    expect((await get("x")).status).toBe(404);
  }, 30_000);
});
