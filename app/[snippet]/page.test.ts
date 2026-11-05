import { beforeEach, describe, expect, it, vi } from "vitest";
import { ogVersion } from "@/lib/og-image";

// Supabase is external I/O; generateMetadata runs unmocked.
const db = vi.hoisted(() => ({ snippet: null as Record<string, unknown> | null }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: () => ({ select: () => ({ maybeSingle: async () => ({ data: db.snippet }) }) }),
  }),
}));

const { generateMetadata } = await import("./page");

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "s1",
  filename: "snippet.tsx",
  language: "tsx",
  theme: "lumis-dusk",
  font_id: "jetbrains",
  appearance: { background: "Lumis Dark" },
  // Stored with a trailing blank line; the image is drawn from it as stored.
  code: "const a = 1;\n\n",
  view_count: 3,
  title: null,
  visibility: "public",
  author: { id: "u1", username: "leandrocp", avatar_url: "https://a.test/1.png" },
  ...overrides,
});

const metadata = async () =>
  (await generateMetadata({ params: Promise.resolve({ snippet: "snippet-tsx-zocdc9" }) })) as {
    title: string;
    openGraph: { url: string; images: { url: string; width: number; height: number }[] };
    twitter: { card: string; images: { url: string }[] };
  };

beforeEach(() => {
  db.snippet = row();
});

describe("snippet page share metadata", () => {
  it("points og:image and twitter:image at the versioned share image, with og:url", async () => {
    const meta = await metadata();
    const url = `/snippet-tsx-zocdc9/og.png?v=${ogVersion(row() as never)}`;
    expect(meta.openGraph.url).toBe("/snippet-tsx-zocdc9");
    expect(meta.openGraph.images).toEqual([
      expect.objectContaining({ url, width: 1200, height: 630 }),
    ]);
    expect(meta.twitter.card).toBe("summary_large_image");
    expect(meta.twitter.images[0].url).toBe(url);
  });

  it("keeps the image URL on a retitle and changes it on a visibility change", async () => {
    const before = (await metadata()).openGraph.images[0].url;
    db.snippet = row({ title: "Renamed" });
    const renamed = await metadata();
    expect(renamed.title).toBe("Renamed — Supagist");
    expect(renamed.openGraph.images[0].url).toBe(before);
    db.snippet = row({ visibility: "unlisted" });
    expect((await metadata()).openGraph.images[0].url).not.toBe(before);
  });
});
