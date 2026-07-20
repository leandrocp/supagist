"use server";

import { createClient } from "@/lib/supabase/server";
import {
  generateShortId,
  toSlug,
  buildReactionRows,
  buildCommentRows,
  getRawFileExtension,
  codePointLength,
} from "@/lib/snippet-utils";

type PublishResult = { path: string; error?: never } | { error: string; path?: never };

function parseDraftObject(value: FormDataEntryValue | null): Record<string, unknown> {
  if (typeof value !== "string") return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export async function publishSnippet(formData: FormData): Promise<PublishResult> {
  const code = formData.get("code");
  const filename = formData.get("filename");
  const theme = formData.get("theme");
  const language = formData.get("language");
  const canonicalImage = formData.get("canonical_image");
  const ogImage = formData.get("og_image");
  const svgBlob = formData.get("svg");
  const reactionsJson = formData.get("reactions");
  const commentsJson = formData.get("comments");

  if (
    typeof code !== "string" ||
    typeof filename !== "string" ||
    typeof theme !== "string" ||
    typeof language !== "string" ||
    !(canonicalImage instanceof Blob) ||
    !(ogImage instanceof Blob) ||
    !(svgBlob instanceof Blob)
  ) {
    return { error: "Invalid publish data." };
  }

  const reactions = parseDraftObject(reactionsJson) as Record<number, string>;
  const comments = parseDraftObject(commentsJson) as Record<
    number,
    { author: string; body: string }
  >;

  // Normalize line endings to LF so the rendered HTML doesn't carry
  // trailing \r characters into the per-line spans. With CRLF endings the
  // chunk passed to spanInline ends in \r, and `white-space: pre-wrap`
  // treats \r as a segment break — the trailing reaction chip then drops
  // onto a fresh visual row even when there's plenty of horizontal space.
  // Normalising at write time keeps every row of the snippet table sane.
  const normalizedCode = code.replace(/\r\n?/g, "\n");

  // Use code-point length to match Postgres char_length(). The
  // snippets_code_char_count_check constraint compares the column we insert
  // against char_length(code), so a JS-side mismatch (UTF-16 code units vs.
  // Unicode code points — different for emoji and other astral chars) makes
  // the insert fail.
  const codeLength = codePointLength(normalizedCode);
  if (codeLength === 0 || codeLength > 8000) {
    return { error: `Code must be 1–8,000 characters (got ${codeLength}).` };
  }

  if (filename.trim().length === 0) {
    return { error: "Filename is required." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || user.is_anonymous) {
    return { error: "You must be signed in with a permanent account to publish." };
  }

  // Publish limits are enforced by a BEFORE INSERT trigger on snippets. This
  // keeps direct PostgREST writes and this action on the same non-bypassable
  // boundary; the generic rate-limit primitive is not executable by clients.

  // Ensure profile exists — trigger covers new users; this is a safety net
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).single();

  if (!profile) {
    const username = String(
      user.user_metadata?.user_name ??
        user.user_metadata?.preferred_username ??
        user.email?.split("@")[0] ??
        "unknown",
    );
    const avatarUrl = String(user.user_metadata?.avatar_url ?? "");
    const githubUserId = user.user_metadata?.provider_id
      ? Number(user.user_metadata.provider_id)
      : null;

    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: user.id,
      username,
      avatar_url: avatarUrl,
      github_user_id: githubUserId,
    });

    if (upsertError) {
      return { error: "Failed to sync profile. Please sign out and sign in again." };
    }
  }

  const snippetId = crypto.randomUUID();
  const shortId = generateShortId();
  const slug = toSlug(filename);

  // Storage RLS requires every asset to live under the authenticated owner's
  // UUID prefix. The snippet ID remains the second-level isolation boundary.
  const assetPrefix = `${user.id}/snippets/${snippetId}`;
  const canonicalPath = `${assetPrefix}/canonical.png`;
  const ogPath = `${assetPrefix}/og.png`;
  const svgPath = `${assetPrefix}/canonical.svg`;
  const rawExt = getRawFileExtension(filename);
  const rawPath = `${assetPrefix}/raw.${rawExt}`;

  // Upload all assets in parallel
  const rawBuffer = Buffer.from(normalizedCode, "utf-8");
  const [canonicalRes, ogRes, svgRes, rawRes] = await Promise.all([
    supabase.storage
      .from("snippet-images")
      .upload(canonicalPath, canonicalImage, { contentType: "image/png" }),
    supabase.storage.from("snippet-images").upload(ogPath, ogImage, { contentType: "image/png" }),
    supabase.storage
      .from("snippet-images")
      .upload(svgPath, svgBlob, { contentType: "image/svg+xml" }),
    supabase.storage
      .from("snippet-images")
      .upload(rawPath, rawBuffer, { contentType: "text/plain" }),
  ]);

  const uploadError = canonicalRes.error ?? ogRes.error ?? svgRes.error ?? rawRes.error;
  if (uploadError) {
    await supabase.storage.from("snippet-images").remove([canonicalPath, ogPath, svgPath, rawPath]);
    return { error: `Failed to upload assets: ${uploadError.message}` };
  }

  const { error: insertError } = await supabase.from("snippets").insert({
    id: snippetId,
    short_id: shortId,
    slug,
    filename,
    language,
    theme,
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

    if (insertError.message.includes("publish_hour_rate_limit")) {
      return { error: "Too many snippets in the last hour. Try again later." };
    }
    if (insertError.message.includes("publish_day_rate_limit")) {
      return { error: "Daily snippet limit reached. Come back tomorrow." };
    }
    if (insertError.message.includes("persistent_account_required")) {
      return { error: "You must be signed in with a permanent account to publish." };
    }

    return { error: "Failed to publish the snippet. Please try again." };
  }

  const reactionRows = buildReactionRows(snippetId, user.id, reactions);
  const commentRows = buildCommentRows(snippetId, user.id, comments);

  if (reactionRows.length > 0) {
    await supabase.from("snippet_line_reactions").insert(reactionRows);
  }
  if (commentRows.length > 0) {
    await supabase.from("snippet_comments").insert(commentRows);
  }

  return { path: `/${slug}-${shortId}` };
}
