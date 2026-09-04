import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateShortId,
  toSlug,
  buildReactionRows,
  buildCommentRows,
  getRawFileExtension,
  codePointLength,
} from "@/lib/snippet-utils";

/**
 * Machine-readable classification of a publish failure. Callers that need to
 * branch (the CLI route maps these to HTTP statuses) read `reason` instead of
 * pattern-matching the human-facing `error` string.
 */
export type PublishFailureReason =
  | "invalid_input"
  | "unauthenticated"
  | "rate_limited"
  | "storage_failed"
  | "insert_failed"
  | "profile_sync_failed";

export type PublishResult =
  | { path: string; error?: never; reason?: never }
  | { error: string; reason: PublishFailureReason; path?: never };

export type PublishInput = {
  code: string;
  filename: string;
  theme: string;
  language: string;
  canonicalImage: Blob;
  ogImage: Blob;
  svg: Blob;
  reactions?: Record<number, string>;
  comments?: Record<number, { author?: string; body: string }>;
};

/**
 * Any Supabase client can publish: the cookie-backed SSR client behind the
 * homepage composer, and the bearer-token client the CLI route builds. Both are
 * `SupabaseClient`, and both carry the caller's identity, so RLS and the
 * publish trigger apply identically either way.
 */
type PublishClient = SupabaseClient;

export const PUBLISH_MAX_CODE_CHARS = 8000;

const AUTH_REQUIRED_ERROR = "You must be signed in with a permanent account to publish.";

/**
 * Shared publish pipeline for every client that can create a snippet: the
 * homepage composer (via the `publishSnippet` server action) and the CLI (via
 * `POST /api/cli/publish`). Both arrive here with the four rendered assets
 * already in hand, so the auth gate, validation, storage layout, and rate-limit
 * error mapping stay in exactly one place.
 *
 * Publish limits themselves are enforced by a BEFORE INSERT trigger on
 * `snippets`, which keeps direct PostgREST writes on the same non-bypassable
 * boundary; this function only translates the trigger's errors for humans.
 */
export async function publishSnippetWithClient(
  supabase: PublishClient,
  input: PublishInput,
): Promise<PublishResult> {
  // Normalize line endings to LF so the rendered HTML doesn't carry
  // trailing \r characters into the per-line spans. With CRLF endings the
  // chunk passed to spanInline ends in \r, and `white-space: pre-wrap`
  // treats \r as a segment break — the trailing reaction chip then drops
  // onto a fresh visual row even when there's plenty of horizontal space.
  // Normalising at write time keeps every row of the snippet table sane.
  const normalizedCode = input.code.replace(/\r\n?/g, "\n");

  // Use code-point length to match Postgres char_length(). The
  // snippets_code_char_count_check constraint compares the column we insert
  // against char_length(code), so a JS-side mismatch (UTF-16 code units vs.
  // Unicode code points — different for emoji and other astral chars) makes
  // the insert fail.
  const codeLength = codePointLength(normalizedCode);
  if (codeLength === 0 || codeLength > PUBLISH_MAX_CODE_CHARS) {
    return {
      error: `Code must be 1–${PUBLISH_MAX_CODE_CHARS.toLocaleString("en-US")} characters (got ${codeLength}).`,
      reason: "invalid_input",
    };
  }

  if (input.filename.trim().length === 0) {
    return { error: "Filename is required.", reason: "invalid_input" };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || user.is_anonymous) {
    return { error: AUTH_REQUIRED_ERROR, reason: "unauthenticated" };
  }

  // Ensure profile exists — trigger covers new users; this is a safety net
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).single();

  if (!profile) {
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const username = String(
      metadata.user_name ??
        metadata.preferred_username ??
        String(user.email ?? "").split("@")[0] ??
        "unknown",
    );
    const avatarUrl = String(metadata.avatar_url ?? "");
    const githubUserId = metadata.provider_id ? Number(metadata.provider_id) : null;

    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: user.id,
      username,
      avatar_url: avatarUrl,
      github_user_id: githubUserId,
    });

    if (upsertError) {
      return {
        error: "Failed to sync profile. Please sign out and sign in again.",
        reason: "profile_sync_failed",
      };
    }
  }

  const snippetId = crypto.randomUUID();
  const shortId = generateShortId();
  const slug = toSlug(input.filename);

  // Storage RLS requires every asset to live under the authenticated owner's
  // UUID prefix. The snippet ID remains the second-level isolation boundary.
  const assetPrefix = `${user.id}/snippets/${snippetId}`;
  const canonicalPath = `${assetPrefix}/canonical.png`;
  const ogPath = `${assetPrefix}/og.png`;
  const svgPath = `${assetPrefix}/canonical.svg`;
  const rawExt = getRawFileExtension(input.filename);
  const rawPath = `${assetPrefix}/raw.${rawExt}`;

  // Upload all assets in parallel
  const rawBuffer = Buffer.from(normalizedCode, "utf-8");
  const [canonicalRes, ogRes, svgRes, rawRes] = await Promise.all([
    supabase.storage
      .from("snippet-images")
      .upload(canonicalPath, input.canonicalImage, { contentType: "image/png" }),
    supabase.storage
      .from("snippet-images")
      .upload(ogPath, input.ogImage, { contentType: "image/png" }),
    supabase.storage
      .from("snippet-images")
      .upload(svgPath, input.svg, { contentType: "image/svg+xml" }),
    supabase.storage
      .from("snippet-images")
      .upload(rawPath, rawBuffer, { contentType: "text/plain" }),
  ]);

  const uploadError = canonicalRes.error ?? ogRes.error ?? svgRes.error ?? rawRes.error;
  if (uploadError) {
    await supabase.storage.from("snippet-images").remove([canonicalPath, ogPath, svgPath, rawPath]);
    return { error: `Failed to upload assets: ${uploadError.message}`, reason: "storage_failed" };
  }

  const { error: insertError } = await supabase.from("snippets").insert({
    id: snippetId,
    short_id: shortId,
    slug,
    filename: input.filename,
    language: input.language,
    theme: input.theme,
    code: normalizedCode,
    code_char_count: codeLength,
    line_count: normalizedCode.split("\n").length,
    author_id: user.id,
    canonical_image_path: canonicalPath,
    og_image_path: ogPath,
    svg_path: svgPath,
    raw_path: rawPath,
  });

  if (insertError) {
    await supabase.storage.from("snippet-images").remove([canonicalPath, ogPath, svgPath, rawPath]);
    return mapPublishInsertError(insertError.message);
  }

  const reactionRows = buildReactionRows(snippetId, user.id, input.reactions ?? {});
  const commentRows = buildCommentRows(snippetId, user.id, input.comments ?? {});

  if (reactionRows.length > 0) {
    await supabase.from("snippet_line_reactions").insert(reactionRows);
  }
  if (commentRows.length > 0) {
    await supabase.from("snippet_comments").insert(commentRows);
  }

  return { path: `/${slug}-${shortId}` };
}

/**
 * Translates the publish trigger's raise conditions into user-facing copy plus
 * a typed reason. The trigger names are stable identifiers we raise ourselves
 * (see `20260716221823_enforce_publish_rate_limits.sql`), so substring matching
 * on them is a lookup, not an inference about free-form text.
 */
export function mapPublishInsertError(message: string): Extract<PublishResult, { error: string }> {
  if (message.includes("publish_hour_rate_limit")) {
    return {
      error: "Too many snippets in the last hour. Try again later.",
      reason: "rate_limited",
    };
  }
  if (message.includes("publish_day_rate_limit")) {
    return { error: "Daily snippet limit reached. Come back tomorrow.", reason: "rate_limited" };
  }
  if (message.includes("persistent_account_required")) {
    return { error: AUTH_REQUIRED_ERROR, reason: "unauthenticated" };
  }
  return { error: "Failed to publish the snippet. Please try again.", reason: "insert_failed" };
}
