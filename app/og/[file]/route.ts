import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseSnippetParam } from "@/lib/snippet-utils";
import {
  ogImageHash,
  ogImagePath,
  ogStoragePath,
  parseOgImageFile,
  type OgHashable,
} from "@/lib/og-compose";
import { renderShareImage, type OgMetrics } from "@/lib/og-compose-render";

// sharp, resvg and the Lumis parsers need Node, not Edge.
export const runtime = "nodejs";

// The URL carries a hash of everything drawn (spec §6.1), so an edit makes a
// new URL and this one never changes.
const IMMUTABLE = "public, max-age=31536000, immutable";
const BUCKET = "snippet-images";

type Snippet = OgHashable & {
  id: string;
  author_id: string | null;
  visibility: "public" | "unlisted";
  og_image_path: string | null;
};

function supabaseFor(token?: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
    },
  );
}

async function loadSnippet(supabase: SupabaseClient, param: string) {
  const parsed = parseSnippetParam(param);
  if (!parsed) return null;
  const { data } = await supabase
    .rpc("get_snippet_by_link", { p_slug: parsed.slug, p_short_id: parsed.shortId })
    .select("*, author:author_id(username, avatar_url)")
    .maybeSingle<Snippet>();
  return data;
}

function logRender(snippet: Snippet, metrics: OgMetrics, trigger: "publish" | "request") {
  console.log(JSON.stringify({ event: "og_render", snippet_id: snippet.id, trigger, ...metrics }));
}

/**
 * The public share image (OG spec v2.1) at its versioned URL. Publish stores
 * it beside the snippet's other files (POST below); a miss renders it here.
 * Unlisted snippets keep their own share image (app/[snippet]/og.png).
 */
export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const file = parseOgImageFile((await params).file);
  if (!file) return new Response("Not found", { status: 404 });
  const supabase = supabaseFor();
  const snippet = await loadSnippet(supabase, file.param);
  if (!snippet || snippet.visibility !== "public") {
    return new Response("Not found", { status: 404 });
  }

  const hash = ogImageHash(snippet);
  if (hash !== file.hash) {
    return new Response(null, {
      status: 307,
      headers: {
        Location: new URL(ogImagePath(file.param, hash), request.url).href,
        "Cache-Control": "public, max-age=300",
      },
    });
  }
  const headers = {
    "Content-Type": "image/jpeg",
    "Cache-Control": IMMUTABLE,
    "CDN-Cache-Control": IMMUTABLE,
  };

  if (snippet.author_id) {
    const stored = supabase.storage
      .from(BUCKET)
      .getPublicUrl(ogStoragePath(snippet.author_id, snippet.id, hash)).data.publicUrl;
    const response = await fetch(stored).catch(() => null);
    if (response?.ok) {
      return new Response(await response.arrayBuffer(), {
        headers: { ...headers, "X-Og-Source": "publish" },
      });
    }
  }

  try {
    const { jpeg, metrics } = await renderShareImage(snippet);
    logRender(snippet, metrics, "request");
    return new Response(new Uint8Array(jpeg), {
      headers: { ...headers, "X-Og-Source": "render" },
    });
  } catch (error) {
    // The publish-time og.png, else the site default. Not cached, so the
    // next crawl tries the real image again.
    console.error(`Share image failed for snippet ${snippet.id}`, error);
    const fallback = snippet.og_image_path
      ? supabase.storage.from(BUCKET).getPublicUrl(snippet.og_image_path).data.publicUrl
      : "/og-image.png";
    return new Response(null, {
      status: 307,
      headers: { Location: new URL(fallback, request.url).href, "Cache-Control": "no-store" },
    });
  }
}

/**
 * Generates and stores the share image at publish (spec §6.7), so the first
 * paste of the auto-copied link already has it. Called with the owner's
 * access token by the web publish and visibility change, and by the MCP
 * `update_snippet` tool; the file goes into the owner's folder under the
 * Storage policies. Any `<param>.jpg` names the snippet; the hash is the
 * current one.
 */
export async function POST(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const name = (await params).file;
  const param = name.endsWith(".jpg") ? name.slice(0, -".jpg".length).split(".")[0]! : "";
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  if (!token) return Response.json({ error: "Sign in to publish." }, { status: 401 });

  const supabase = supabaseFor(token);
  const { data: claims } = await supabase.auth.getClaims(token);
  const userId = claims?.claims.sub;
  if (!userId) return Response.json({ error: "Sign in to publish." }, { status: 401 });

  const snippet = await loadSnippet(supabase, param);
  if (!snippet || snippet.author_id !== userId) {
    return Response.json({ error: "Snippet not found, or it isn't yours." }, { status: 404 });
  }
  if (snippet.visibility !== "public") {
    // Unlisted snippets use the existing share image; nothing to store.
    return Response.json({ stored: false, reason: "unlisted" });
  }

  const hash = ogImageHash(snippet);
  const path = ogStoragePath(userId, snippet.id, hash);
  const existing = await fetch(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, {
    method: "HEAD",
  }).catch(() => null);
  if (existing?.ok) return Response.json({ stored: true, url: ogImagePath(param, hash) });

  const { jpeg, metrics } = await renderShareImage(snippet);
  logRender(snippet, metrics, "publish");
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, new Blob([new Uint8Array(jpeg)], { type: "image/jpeg" }), {
      contentType: "image/jpeg",
      cacheControl: "31536000",
    });
  // The same hash is the same picture: an existing file is already right.
  if (error && !error.message.includes("already exists")) {
    console.error(`Share image upload failed for snippet ${snippet.id}`, error);
    return Response.json({ error: "Could not store the share image." }, { status: 502 });
  }
  return Response.json({ stored: true, url: ogImagePath(param, hash), metrics });
}
