import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OG_BAND, OG_SIZE, ogVersion } from "@/lib/og-image";
import { OG_MAX_BYTES } from "@/lib/og-render";
import { renderSnippetPng } from "@/lib/snippet-render";
import { loadTheme } from "@/lib/theme-loader";

// Supabase is external I/O here; the route, the export renderer and sharp run
// unmocked.
const db = vi.hoisted(() => ({ snippet: null as Record<string, unknown> | null }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    rpc: () => ({ select: () => ({ maybeSingle: async () => ({ data: db.snippet }) }) }),
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.test/${path}` } }),
      }),
    },
  }),
}));

const { GET } = await import("./route");

const author = { username: "leandrocp", avatar_url: "https://avatars.githubusercontent.com/u/1" };

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "s1",
  code: "export function Render() {\n  return <h1>Hello, Supagist!</h1>;\n}\n\n",
  filename: "snippet.tsx",
  language: "tsx",
  theme: "lumis-dusk",
  font_id: "jetbrains",
  appearance: { background: "Lumis Dark", aspectRatio: "16:9", outerPadding: 64 },
  visibility: "public",
  og_image_path: "u1/snippets/s1/og.png",
  author,
  ...overrides,
});

const get = (query = "") =>
  GET(new Request(`https://supagist.app/snippet-tsx-zocdc9/og.png${query}`), {
    params: Promise.resolve({ snippet: "snippet-tsx-zocdc9" }),
  });

/** Mean RGB of a region of an image. */
async function meanAt(
  image: Uint8Array,
  region: { left: number; top: number; width: number; height: number },
) {
  const cut = await sharp(image).extract(region).toBuffer();
  const { channels } = await sharp(cut).stats();
  return channels.slice(0, 3).map((c) => c.mean);
}

// Offline: the avatar and the parser fetch fail, and the code draws as plain
// text. The image must still render.
const networkCalls: string[] = [];
beforeEach(() => {
  db.snippet = row();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      networkCalls.push(String(input instanceof Request ? input.url : input));
      return Promise.reject(new Error("offline"));
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  networkCalls.length = 0;
});

describe("GET /[snippet]/og.png", () => {
  it("is the 16:9 export filling the frame, with the band, under the size limit", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    const og = new Uint8Array(await res.arrayBuffer());
    expect(og.byteLength).toBeLessThanOrEqual(OG_MAX_BYTES);
    expect(await sharp(og).metadata()).toMatchObject(OG_SIZE);

    // The middle of the frame is the export's middle: 3200×1800 scaled to
    // 1120×630 at x=40, so their centres line up.
    const exported = await renderSnippetPng({ ...row(), code: row().code.trimEnd() } as never);
    const exportCentre = await meanAt(await sharp(exported).resize(1120, 630).png().toBuffer(), {
      left: 460,
      top: 215,
      width: 200,
      height: 200,
    });
    const ogCentre = await meanAt(og, { left: 500, top: 215, width: 200, height: 200 });
    ogCentre.forEach((c, i) => expect(Math.abs(c - exportCentre[i])).toBeLessThan(4));

    // The flat C seal in the band is wax red: a good part of its box is.
    const box = await sharp(og)
      .extract({
        left: 40 + OG_BAND.inset,
        top: OG_SIZE.height - (OG_BAND.height + OG_BAND.seal) / 2,
        width: OG_BAND.seal,
        height: OG_BAND.seal,
      })
      .removeAlpha()
      .raw()
      .toBuffer();
    let wax = 0;
    for (let i = 0; i < box.length; i += 3) {
      if (box[i] > 150 && box[i + 1] < 90 && box[i + 2] < 90) wax += 1;
    }
    expect(wax).toBeGreaterThan(OG_BAND.seal ** 2 / 4);
  }, 60_000);

  it("fits an auto-sized card with no background whole, on its editor colour", async () => {
    db.snippet = row({ appearance: { background: null, aspectRatio: null } });
    const og = new Uint8Array(await (await get()).arrayBuffer());
    expect(await sharp(og).metadata()).toMatchObject(OG_SIZE);
    const { data } = await loadTheme("lumis-dusk");
    const bg = (data.highlights.normal as { bg: string }).bg;
    const want = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16));
    // Far left of the frame is the fill, not the card.
    const fill = await meanAt(og, { left: 2, top: 200, width: 8, height: 100 });
    fill.forEach((c, i) => expect(Math.abs(c - want[i])).toBeLessThan(2));
  }, 60_000);

  it("caches the current version for a year and anything else for an hour", async () => {
    const current = ogVersion(row() as never);
    expect((await get(`?v=${current}`)).headers.get("cache-control")).toBe(
      "public, max-age=31536000, s-maxage=31536000, immutable",
    );
    expect((await get("?v=stale")).headers.get("cache-control")).toBe(
      "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    );
  }, 60_000);

  it("unlisted shows less: noindex, no author anywhere in the picture", async () => {
    db.snippet = row({
      appearance: { background: "Lumis Dark", footer: { enabled: true, showAuthor: true } },
    });
    const pub = Buffer.from(await (await get()).arrayBuffer());
    networkCalls.length = 0;
    db.snippet = { ...db.snippet, visibility: "unlisted" };
    const res = await get();
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    const unlisted = Buffer.from(await res.arrayBuffer());
    expect(unlisted.equals(pub)).toBe(false);
    // Not even the avatar is fetched.
    expect(networkCalls.filter((url) => url.includes("avatars"))).toEqual([]);
  }, 60_000);

  it("redirects, uncached, to the publish-time og.png when the render fails", async () => {
    db.snippet = row({ theme: "no-such-theme" });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await get();
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://storage.test/u1/snippets/s1/og.png");
    expect(res.headers.get("cache-control")).toBe("no-store");
  }, 60_000);

  it("404s for an unknown or malformed snippet", async () => {
    db.snippet = null;
    expect((await get()).status).toBe(404);
    const res = await GET(new Request("https://supagist.app/x/og.png"), {
      params: Promise.resolve({ snippet: "x" }),
    });
    expect(res.status).toBe(404);
  });
});
