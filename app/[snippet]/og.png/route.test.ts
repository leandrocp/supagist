import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pngSize } from "@/lib/og-render";

// Supabase is external I/O here; the route, the model and the real next/og
// render run unmocked.
const db = vi.hoisted(() => ({
  snippet: null as Record<string, unknown> | null,
  reactions: [] as { emoji: string }[],
  reactionsError: null as Error | null,
  comments: 0,
  files: {} as Record<string, Uint8Array>,
  downloads: [] as string[],
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    rpc: () => ({
      select: () => ({ maybeSingle: async () => ({ data: db.snippet }) }),
    }),
    from: (table: string) => ({
      select: () => ({
        eq: async () =>
          table === "snippet_line_reactions"
            ? { data: db.reactions, error: db.reactionsError }
            : { count: db.comments, error: null },
      }),
    }),
    storage: {
      from: () => ({
        download: async (path: string) => {
          db.downloads.push(path);
          const bytes = db.files[path];
          return bytes ? { data: new Blob([bytes as BlobPart]) } : { data: null };
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://storage.test/${path}` },
        }),
      }),
    },
  }),
}));

const { GET } = await import("./route");
const { loadTheme } = await import("@/lib/theme-loader");

/** RGB of one pixel of a 1200×630 PNG, decoded by resvg. */
async function pixelAt(png: Uint8Array, x: number, y: number) {
  const { Resvg } = await import("@resvg/resvg-js");
  const href = `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
  const image = new Resvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><image href="${href}" width="1200" height="630"/></svg>`,
  ).render();
  const at = (y * image.width + x) * 4;
  return [...image.pixels.subarray(at, at + 3)];
}

const CARD = new Uint8Array(
  readFileSync(new URL("../../../public/brand/hero-card.png", import.meta.url)),
);

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "s1",
  author_id: "u1",
  filename: "seal-button.tsx",
  language: "tsx",
  theme: "github_light",
  // A row stored before trimming, with trailing blank lines.
  code: "const a = 1;\nconst b = 2;\n\n",
  line_count: 4,
  view_count: 137,
  created_at: "2026-10-31T12:00:00Z",
  visibility: "public",
  canonical_image_path: "u1/snippets/s1/canonical.png",
  og_image_path: "u1/snippets/s1/og.png",
  svg_path: "u1/snippets/s1/canonical.svg",
  author: { username: "leandrocp", avatar_url: null },
  ...overrides,
});

const get = (param = "seal-button-tsx-6ophdd") =>
  GET(new Request(`https://supagist.app/${param}/og.png`), {
    params: Promise.resolve({ snippet: param }),
  });

// next/og loads its layout engine from a data: URL; anything else would be a
// runtime CDN dependency (fonts, emoji or avatars) that the image must not have.
const realFetch = globalThis.fetch;
const networkCalls: string[] = [];
const fetchSpy = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.startsWith("data:")) return realFetch(input, init);
  networkCalls.push(url);
  return Promise.reject(new Error(`the share image must not fetch ${url}`));
});

beforeEach(() => {
  Object.assign(db, {
    snippet: row(),
    reactions: [{ emoji: "🔥" }, { emoji: "🔥" }, { emoji: "❤️" }],
    reactionsError: null,
    comments: 2,
    files: { "u1/snippets/s1/card.png": CARD },
    downloads: [],
  });
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
  networkCalls.length = 0;
});

describe("GET /[snippet]/og.png", () => {
  it("renders a cacheable 1200×630 PNG without any network fetch", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    );
    expect(res.headers.get("x-robots-tag")).toBeNull();
    expect(pngSize(new Uint8Array(await res.arrayBuffer()))).toEqual({ width: 1200, height: 630 });
    expect(db.downloads).toEqual(["u1/snippets/s1/card.png"]);
    expect(networkCalls).toEqual([]);
  }, 30_000);

  it("falls back to canonical.png for snippets published before card.png", async () => {
    db.files = { "u1/snippets/s1/canonical.png": CARD };
    const res = await get();
    expect(res.status).toBe(200);
    expect(db.downloads).toEqual(["u1/snippets/s1/card.png", "u1/snippets/s1/canonical.png"]);
  }, 30_000);

  // The reported bug: an owner edit nulls the stored image paths, and the
  // share image lost its card (envelope and seal only).
  it("draws the edited code from the live row once an edit dropped the stored renders", async () => {
    const edited = (code: string) =>
      row({
        code,
        theme: "lumis-dusk",
        // The composer's default, which names no font file.
        font_id: "system",
        appearance: null,
        canonical_image_path: null,
        og_image_path: null,
        svg_path: null,
      });
    // Offline here, the parser fetch fails and the code draws as plain text.
    vi.spyOn(console, "warn").mockImplementation(() => {});
    // card.png from before the edit is still in Storage, but stale.
    db.snippet = edited("const before = 1;\nconst after = 2;");
    const first = new Uint8Array(await (await get()).arrayBuffer());
    db.snippet = edited("const edited = 3;\nconst again = 4;");
    const res = await get();
    expect(res.status).toBe(200);
    const second = new Uint8Array(await res.arrayBuffer());

    expect(db.downloads).toEqual([]);
    // Only the pinned parser, as the browser and the MCP renderer load it.
    expect(networkCalls.length).toBeGreaterThan(0);
    for (const url of networkCalls) {
      expect(url).toMatch(
        /^https:\/\/cdn\.jsdelivr\.net\/npm\/@lumis-sh\/wasm-tsx@[\d.]+\/tree-sitter-tsx\.wasm$/,
      );
    }
    // The card sits in the envelope: right of the short lines, its body is the
    // theme's editor colour (the envelope alone is grey there).
    const { data: theme } = await loadTheme("lumis-dusk");
    const bg = (theme.highlights.normal as { bg: string }).bg;
    const pixel = await pixelAt(second, 1100, 330);
    expect(pixel.map((c) => c.toString(16).padStart(2, "0")).join("")).toBe(bg.slice(1));
    // Same filename, lines, theme and date: only the code differs, so the
    // pictures differ only if the card shows the live code.
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(false);
  }, 30_000);

  it("marks unlisted images noindex and skips the avatar", async () => {
    db.snippet = row({
      visibility: "unlisted",
      author: { username: "leandrocp", avatar_url: "https://avatars.githubusercontent.com/u/1" },
    });
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    expect(networkCalls).toEqual([]);
  }, 30_000);

  it("redirects to the publish-time og.png when the render fails", async () => {
    db.reactionsError = new Error("db down");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await get();
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://storage.test/u1/snippets/s1/og.png");
  });

  it("404s for an unknown or malformed snippet", async () => {
    db.snippet = null;
    expect((await get()).status).toBe(404);
    expect((await get("x")).status).toBe(404);
  });
});
