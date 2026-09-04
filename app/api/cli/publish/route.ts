import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { buildAppUrl, getRequestOrigin, hasEnvVars } from "@/lib/utils";
import { inferLanguage, codePointLength } from "@/lib/snippet-utils";
import {
  publishSnippetWithClient,
  PUBLISH_MAX_CODE_CHARS,
  type PublishFailureReason,
} from "@/lib/snippet-publish";
import { parseCliAppearance, CliAppearanceError } from "@/lib/cli-appearance";
import { renderCliSnippetAssets, toBlobPart } from "@/lib/cli-render";

// resvg is a native addon and Lumis loads parser WASM from disk, so this route
// cannot run anywhere but the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Generous relative to an 8,000-character snippet, but bounded so a malformed
 * or hostile client can't stream an unbounded body into the renderer.
 */
const MAX_BODY_BYTES = 256 * 1024;

const PUBLISH_FAILURE_STATUS: Record<PublishFailureReason, number> = {
  invalid_input: 400,
  unauthenticated: 403,
  rate_limited: 429,
  storage_failed: 502,
  insert_failed: 500,
  profile_sync_failed: 500,
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, ...rest] = header.split(" ");
  if (scheme.toLowerCase() !== "bearer") return null;
  const token = rest.join(" ").trim();
  return token.length > 0 ? token : null;
}

/**
 * Publishes a snippet on behalf of a CLI user.
 *
 * The CLI does no local rendering — it posts source plus an appearance object
 * and gets a URL back, which is why the four snippet assets are generated here
 * with the same pipeline the browser composer uses. The Supabase client is
 * bound to the caller's own access token, so RLS, the storage ownership
 * policies, and the publish rate-limit trigger all apply exactly as they do to
 * a browser publish; this route grants no extra authority.
 */
export async function POST(request: Request) {
  if (!hasEnvVars) {
    return errorResponse("Supagist is not configured.", 503);
  }

  const accessToken = bearerToken(request);
  if (!accessToken) {
    return errorResponse("Missing bearer token. Run `npx supagist auth login`.", 401);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return errorResponse("Request body is too large.", 413);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return errorResponse("Request body must be a JSON object.", 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const code = typeof body.code === "string" ? body.code : null;
  const filename = typeof body.filename === "string" ? body.filename.trim() : "";

  if (code === null) return errorResponse("`code` is required.", 400);
  if (filename.length === 0) return errorResponse("`filename` is required.", 400);

  // Check the length before rendering: an oversized snippet would be rejected
  // by publishSnippetWithClient anyway, and rasterising it first is pure waste.
  const codeLength = codePointLength(code.replace(/\r\n?/g, "\n"));
  if (codeLength === 0 || codeLength > PUBLISH_MAX_CODE_CHARS) {
    return errorResponse(
      `Code must be 1–${PUBLISH_MAX_CODE_CHARS.toLocaleString("en-US")} characters (got ${codeLength}).`,
      400,
    );
  }

  let appearance;
  try {
    appearance = parseCliAppearance(body.appearance);
  } catch (error) {
    if (error instanceof CliAppearanceError) return errorResponse(error.message, 400);
    throw error;
  }

  const requestedLanguage = typeof body.language === "string" ? body.language.trim() : "";
  const language = requestedLanguage || inferLanguage(filename, code);

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );

  // Pass the token explicitly: this client holds no stored session, so the
  // no-arg form would have nothing to validate.
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  const user = userData?.user;

  if (userError || !user) {
    return errorResponse("Session expired. Run `npx supagist auth login` again.", 401);
  }
  if (user.is_anonymous) {
    return errorResponse("You must be signed in with a permanent account to publish.", 403);
  }

  const authorUsername = String(
    user.user_metadata?.user_name ??
      user.user_metadata?.preferred_username ??
      user.email?.split("@")[0] ??
      "unknown",
  );
  const authorAvatarUrl =
    typeof user.user_metadata?.avatar_url === "string" && user.user_metadata.avatar_url.length > 0
      ? user.user_metadata.avatar_url
      : null;

  let assets;
  try {
    assets = await renderCliSnippetAssets({
      code,
      filename,
      language,
      appearance,
      authorUsername,
      authorAvatarUrl,
    });
  } catch {
    return errorResponse("Could not render the snippet image.", 500);
  }

  const result = await publishSnippetWithClient(supabase, {
    code,
    filename,
    theme: appearance.theme,
    language,
    canonicalImage: new Blob([toBlobPart(assets.canonicalPng)], { type: "image/png" }),
    ogImage: new Blob([toBlobPart(assets.ogPng)], { type: "image/png" }),
    svg: new Blob([assets.svg], { type: "image/svg+xml;charset=utf-8" }),
  });

  if (result.error) {
    return errorResponse(result.error, PUBLISH_FAILURE_STATUS[result.reason]);
  }

  const origin = getRequestOrigin(request.headers);
  return NextResponse.json({
    url: buildAppUrl(result.path!, origin),
    path: result.path,
  });
}
