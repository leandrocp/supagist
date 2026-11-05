import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ogImageHash } from "@/lib/og-compose";

// Supabase and the network are external I/O here; the route, the export
// renderer, the compositor and sharp run unmocked.
const db = vi.hoisted(() => ({
  snippet: null as Record<string, unknown> | null,
  claims: null as { sub: string } | null,
  uploads: [] as { path: string; type: string; bytes: number }[],
  stored: new Map<string, Uint8Array>(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    rpc: () => ({ select: () => ({ maybeSingle: async () => ({ data: db.snippet }) }) }),
    auth: { getClaims: async () => ({ data: db.claims ? { claims: db.claims } : null }) },
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.test/${path}` } }),
        upload: async (path: string, blob: Blob, options: { contentType: string }) => {
          db.uploads.push({ path, type: options.contentType, bytes: blob.size });
          return { error: null };
        },
      }),
    },
  }),
}));

const { GET, POST } = await import("./route");

const PARAM = "posts-ts-ab12cd";

const POSTS = `import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

export async function getRecentPosts(limit = 10) {
  const { data, error } = await supabase.from('posts').select('*').limit(limit)
  if (error) throw error
  return data
}`;

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "s1",
  author_id: "u1",
  code: POSTS,
  filename: "posts.ts",
  language: "typescript",
  theme: "github_dark",
  font_id: "jetbrains",
  appearance: { background: null },
  visibility: "public",
  og_image_path: "u1/snippets/s1/og.png",
  author: { username: "leandrocp", avatar_url: null },
  ...overrides,
});

const call = (method: typeof GET, file: string, init?: RequestInit) =>
  method(new Request(`https://supagist.app/og/${file}`, init), {
    params: Promise.resolve({ file }),
  });
const current = () => `${PARAM}.${ogImageHash(db.snippet as never)}.jpg`;

/** Mean RGB of a region of an image. */
async function meanAt(
  image: Uint8Array,
  region: { left: number; top: number; width: number; height: number },
) {
  const cut = await sharp(image).extract(region).toBuffer();
  const { channels } = await sharp(cut).stats();
  return channels.slice(0, 3).map((c) => Math.round(c.mean));
}

beforeEach(() => {
  db.snippet = row();
  db.claims = null;
  db.uploads.length = 0;
  db.stored.clear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  // Offline, except for objects this test put in storage.
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input);
      const stored = db.stored.get(url);
      if (stored) return new Response(stored as BodyInit);
      if (url.startsWith("https://storage.test/")) return new Response(null, { status: 404 });
      throw new Error("offline");
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /og/<param>.<hash>.jpg", () => {
  it("renders a no-background card beside the corners on Paper, as an immutable JPEG", async () => {
    const res = await call(GET, current());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("x-og-source")).toBe("render");
    const image = new Uint8Array(await res.arrayBuffer());
    const meta = await sharp(image).metadata();
    expect(meta).toMatchObject({ format: "jpeg", width: 1200, height: 630 });
    expect(meta.isProgressive).toBe(true);
    // A dark card on the opposite polarity: Paper #F4EDE0 at the frame edge.
    const [r, g, b] = await meanAt(image, { left: 2, top: 2, width: 40, height: 40 });
    expect(Math.abs(r! - 0xf4)).toBeLessThan(4);
    expect(Math.abs(g! - 0xed)).toBeLessThan(4);
    expect(Math.abs(b! - 0xe0)).toBeLessThan(4);
    // The wax seal sits on the mark line at the left inset (28..60, 585..617).
    const [sr, sg, sb] = await meanAt(image, { left: 36, top: 593, width: 4, height: 4 });
    expect(sr!).toBeGreaterThan(150);
    expect(sg!).toBeLessThan(100);
    expect(sb!).toBeLessThan(100);
  });

  it("serves the image stored at publish when there is one", async () => {
    const file = current();
    const hash = ogImageHash(db.snippet as never);
    const bytes = await sharp({
      create: { width: 1200, height: 630, channels: 3, background: "#123456" },
    })
      .jpeg()
      .toBuffer();
    db.stored.set(`https://storage.test/u1/snippets/s1/og-${hash}.jpg`, new Uint8Array(bytes));
    const res = await call(GET, file);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-og-source")).toBe("publish");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array(bytes));
  });

  it("redirects an outdated hash to the current URL", async () => {
    const res = await call(GET, `${PARAM}.0123456789abcdef.jpg`);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`https://supagist.app/og/${current()}`);
  });

  it("is not served for unlisted snippets, which keep their own share image", async () => {
    db.snippet = row({ visibility: "unlisted" });
    expect((await call(GET, current())).status).toBe(404);
  });

  it("404s a malformed name or unknown snippet", async () => {
    expect((await call(GET, `${PARAM}.png`)).status).toBe(404);
    db.snippet = null;
    expect((await call(GET, `${PARAM}.0123456789abcdef.jpg`)).status).toBe(404);
  });
});

describe("POST /og/<param>.jpg (generate on publish)", () => {
  const post = (token?: string) =>
    call(POST, `${PARAM}.jpg`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

  it("renders and stores the JPEG in the owner's snippet folder under its hash", async () => {
    db.claims = { sub: "u1" };
    const res = await post("token");
    expect(res.status).toBe(200);
    const body = await res.json();
    const hash = ogImageHash(db.snippet as never);
    expect(body).toMatchObject({ stored: true, url: `/og/${PARAM}.${hash}.jpg` });
    expect(body.metrics).toMatchObject({ source: "transparent", band_style: expect.any(String) });
    expect(db.uploads).toEqual([
      { path: `u1/snippets/s1/og-${hash}.jpg`, type: "image/jpeg", bytes: expect.any(Number) },
    ]);
  });

  it("skips the render when that hash is already stored", async () => {
    db.claims = { sub: "u1" };
    const hash = ogImageHash(db.snippet as never);
    db.stored.set(`https://storage.test/u1/snippets/s1/og-${hash}.jpg`, new Uint8Array([1]));
    expect(await (await post("token")).json()).toEqual({
      stored: true,
      url: `/og/${PARAM}.${hash}.jpg`,
    });
    expect(db.uploads).toEqual([]);
  });

  it("needs the owner's token and stores nothing for unlisted snippets", async () => {
    expect((await post()).status).toBe(401);
    db.claims = { sub: "someone-else" };
    expect((await post("token")).status).toBe(404);
    db.claims = { sub: "u1" };
    db.snippet = row({ visibility: "unlisted" });
    expect(await (await post("token")).json()).toEqual({ stored: false, reason: "unlisted" });
    expect(db.uploads).toEqual([]);
  });
});
