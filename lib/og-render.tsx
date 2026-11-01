/**
 * Server half of the per-snippet share image: loads the bundled assets, the
 * stored card render and the avatar, and lays out direction A "Opened letter"
 * (og/v1 spec §2) with next/og. What to show is decided by `buildOgModel`.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { SupabaseClient } from "@supabase/supabase-js";
import { rasterizeSvg } from "@/lib/render-api";
import {
  OG_SIZE,
  buildOgModel,
  parseFontMetrics,
  type CardSource,
  type FontMetrics,
  type OgModel,
  type OgSnippet,
} from "@/lib/og-image";

const ASSETS = join(process.cwd(), "assets", "og");

type OgAssets = {
  fonts: { name: string; data: ArrayBuffer; weight: 500 | 600 }[];
  metrics: { title: FontMetrics; body: FontMetrics; mono: FontMetrics };
  layers: Record<"back" | "front" | "backDark" | "frontDark" | "seal", string>;
  emoji: Map<string, string>;
};

const dataUri = (bytes: Uint8Array, type = "image/png") =>
  `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;

const arrayBuffer = (bytes: Buffer) =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

let assetsPromise: Promise<OgAssets> | null = null;

/** Read once per instance: the assets never depend on the request. */
export function loadOgAssets(): Promise<OgAssets> {
  assetsPromise ??= (async () => {
    const read = (name: string) => readFile(join(ASSETS, name));
    const [fraunces, geistMedium, geistSemiBold, plex, back, front, backDark, frontDark, seal] =
      await Promise.all([
        read("fonts/Fraunces144pt-SemiBold-Soft50-latin.ttf"),
        read("fonts/Geist-Medium-latin.ttf"),
        read("fonts/Geist-SemiBold-latin.ttf"),
        read("fonts/IBMPlexMono-Medium-latin.ttf"),
        read("envelope-back.png"),
        read("envelope-front.png"),
        read("envelope-back-dark.png"),
        read("envelope-front-dark.png"),
        read("seal-r3-256.png"),
      ]);
    const emoji = new Map<string, string>();
    for (const file of await readdir(join(ASSETS, "emoji"))) {
      if (file.endsWith(".png")) {
        emoji.set(file.slice(0, -4), dataUri(await read(join("emoji", file))));
      }
    }
    return {
      fonts: [
        { name: "Fraunces", data: arrayBuffer(fraunces), weight: 600 },
        { name: "Geist", data: arrayBuffer(geistMedium), weight: 500 },
        { name: "Geist", data: arrayBuffer(geistSemiBold), weight: 600 },
        { name: "Plex Mono", data: arrayBuffer(plex), weight: 500 },
      ],
      metrics: {
        title: parseFontMetrics(fraunces),
        body: parseFontMetrics(geistMedium),
        mono: parseFontMetrics(plex),
      },
      layers: {
        back: dataUri(back),
        front: dataUri(front),
        backDark: dataUri(backDark),
        frontDark: dataUri(frontDark),
        seal: dataUri(seal),
      },
      emoji,
    };
  })();
  assetsPromise.catch(() => (assetsPromise = null));
  return assetsPromise;
}

/** Width and height from a PNG's IHDR chunk. */
export function pngSize(png: Uint8Array): { width: number; height: number } {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** Totals for the reaction summary and comment count. */
export async function fetchOgFacts(supabase: SupabaseClient, snippetId: string) {
  const [reactions, comments] = await Promise.all([
    supabase.from("snippet_line_reactions").select("emoji").eq("snippet_id", snippetId),
    supabase
      .from("snippet_comments")
      .select("id", { count: "exact", head: true })
      .eq("snippet_id", snippetId),
  ]);
  if (reactions.error) throw reactions.error;
  if (comments.error) throw comments.error;
  return {
    reactionEmojis: (reactions.data ?? []).map((row) => row.emoji as string),
    commentCount: comments.count ?? 0,
  };
}

/** The stored render for the card, as PNG bytes, or null for envelope only. */
export async function loadCardPng(
  supabase: SupabaseClient,
  source: CardSource,
): Promise<Uint8Array | null> {
  const bucket = supabase.storage.from("snippet-images");
  if (source.kind === "card") {
    // Snippets published before card.png existed fall back to canonical.png.
    for (const path of [source.path, source.fallback]) {
      const { data } = await bucket.download(path);
      if (data) return new Uint8Array(await data.arrayBuffer());
    }
    return null;
  }
  if (source.kind === "svg") {
    const { data } = await bucket.download(source.path);
    if (!data) return null;
    return (await rasterizeSvg(await data.text(), 2)).png;
  }
  return null;
}

/** The real avatar as a data URI, or null to draw the initial circle. */
export async function loadAvatar(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) return null;
    return dataUri(new Uint8Array(await res.arrayBuffer()), type);
  } catch {
    return null;
  }
}

const AVATAR_COLORS = ["#B9A0DA", "#93B4DE", "#C9A27A", "#E39A86", "#93C4A8", "#D9B860"];

function avatarColor(username: string) {
  let hash = 0;
  for (const char of username) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const PALETTE = {
  light: { bg: "#F4EDE0", lift: "#F8F3EB", ink: "#1C1A17", muted: "#5E574C", pill: "#EADFCB" },
  dark: { bg: "#121212", lift: "#202020", ink: "#F1E9DA", muted: "#A79F92", pill: "#24221F" },
};

function OgImage({
  model,
  assets,
  cardSrc,
  avatarSrc,
}: {
  model: OgModel;
  assets: OgAssets;
  cardSrc: string | null;
  avatarSrc: string | null;
}) {
  const c = model.dark ? PALETTE.dark : PALETTE.light;
  const layers = assets.layers;
  return (
    <div
      style={{
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        display: "flex",
        position: "relative",
        overflow: "hidden",
        backgroundColor: c.bg,
        backgroundImage: `radial-gradient(circle at 75% 40%, ${c.lift}, ${c.bg} 70%)`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        src={model.dark ? layers.backDark : layers.back}
        width={OG_SIZE.width}
        height={OG_SIZE.height}
        style={{ position: "absolute", left: 0, top: 0 }}
      />
      {model.card && cardSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          src={cardSrc}
          width={model.card.width}
          height={model.card.height}
          style={{
            position: "absolute",
            left: model.card.left,
            top: model.card.top,
            transform: "rotate(-1.2deg)",
            borderRadius: 10,
            boxShadow: `0 20px 40px -18px rgba(0,0,0,${model.dark ? 0.8 : 0.35})`,
          }}
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        src={model.dark ? layers.frontDark : layers.front}
        width={OG_SIZE.width}
        height={OG_SIZE.height}
        style={{ position: "absolute", left: 0, top: 0 }}
      />

      <div
        style={{
          position: "absolute",
          left: 64,
          top: 56,
          width: 470,
          height: 520,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" src={layers.seal} width={52} height={52} />
          <span style={{ fontFamily: "Plex Mono", fontSize: 17, color: c.muted }}>
            supagist.app
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "Fraunces",
              fontWeight: 600,
              fontSize: model.title.size,
              lineHeight: 1,
              letterSpacing: "-0.025em",
              color: c.ink,
              whiteSpace: "nowrap",
            }}
          >
            {model.title.text}
          </div>

          {model.author ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 26 }}>
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" src={avatarSrc} width={34} height={34} style={{ borderRadius: 17 }} />
              ) : (
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: avatarColor(model.author.username),
                    color: "#1C1A17",
                    fontFamily: "Geist",
                    fontWeight: 600,
                    fontSize: 15,
                  }}
                >
                  {model.author.initial}
                </div>
              )}
              <span style={{ fontFamily: "Geist", fontWeight: 500, fontSize: 22, color: c.ink }}>
                @{model.author.username}
              </span>
            </div>
          ) : null}

          {model.reactions.length > 0 || model.comments ? (
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 24 }}>
              {model.reactions.map((reaction) => (
                <div key={reaction.asset} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="" src={assets.emoji.get(reaction.asset)} width={28} height={28} />
                  <span
                    style={{ fontFamily: "Geist", fontWeight: 600, fontSize: 26, color: c.ink }}
                  >
                    {reaction.count}
                  </span>
                </div>
              ))}
              {model.comments ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={c.muted}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                  </svg>
                  <span
                    style={{ fontFamily: "Geist", fontWeight: 600, fontSize: 26, color: c.muted }}
                  >
                    {model.comments}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {model.unlistedPill ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                alignSelf: "flex-start",
                gap: 10,
                marginTop: 24,
                padding: "6px 16px",
                borderRadius: 999,
                backgroundColor: c.pill,
                fontFamily: "Plex Mono",
                fontSize: 16,
                color: c.muted,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={c.muted}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Unlisted · shared by link
            </div>
          ) : null}

          {model.meta ? (
            <div
              style={{
                display: "flex",
                marginTop: 20,
                fontFamily: "Plex Mono",
                fontSize: 16,
                color: c.muted,
                whiteSpace: "nowrap",
              }}
            >
              {model.meta}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Render the 1200×630 PNG. Emoji are drawn from the bundled Noto PNGs and
 * `buildOgModel` strips every character the fonts lack, so Satori never asks
 * next/og for a remote font or emoji at render time.
 */
export async function renderOgPng(input: {
  snippet: Omit<OgSnippet, "card">;
  card: Uint8Array | null;
  avatar: string | null;
}): Promise<ArrayBuffer> {
  const assets = await loadOgAssets();
  const card = input.card ? pngSize(input.card) : null;
  const model = buildOgModel({ ...input.snippet, card }, assets.metrics, (asset) =>
    assets.emoji.has(asset),
  );
  const response = new ImageResponse(
    <OgImage
      model={model}
      assets={assets}
      cardSrc={input.card ? dataUri(input.card) : null}
      avatarSrc={input.avatar}
    />,
    { ...OG_SIZE, fonts: assets.fonts, emoji: "noto" },
  );
  // ImageResponse renders lazily into its body stream; reading it here
  // surfaces render failures to the caller instead of a truncated response.
  return response.arrayBuffer();
}
