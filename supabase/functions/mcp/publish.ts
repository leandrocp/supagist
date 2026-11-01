import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { renderInput } from "./input.ts";
import { redactSecrets, type RedactionSummary } from "./redact.ts";

// Appearance inputs match the render tool. Annotations, author and benchmark
// fixtures are render-only data: a saved snippet's author is the signed-in user.
const {
  reactions: _reactions,
  comments: _comments,
  showReactions: _showReactions,
  showComments: _showComments,
  author: _author,
  fixture: _fixture,
  format: _format,
  pixelRatio: _pixelRatio,
  ...appearance
} = renderInput.shape;

export const publishInput = z.strictObject({
  ...appearance,
  title: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .optional()
    .describe("Page title. Defaults to the filename; also forms the link slug."),
});

export type PublishInput = z.input<typeof publishInput>;

export type PublishResult = {
  url: string;
  image_url: string;
  visibility: "unlisted";
  redactions: RedactionSummary;
};

const APP_ORIGIN = "https://supagist.app";

// Same link shape as the web app's lib/snippet-utils.ts.
function shortId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => chars[b % 36]).join("");
}
function toSlug(text: string) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "snippet"
  );
}
function rawExtension(filename: string) {
  const base = filename.trim().split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  const ext = dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";
  return /^[a-z0-9]+$/.test(ext) ? ext : "txt";
}

export async function publishSnippet(
  rawInput: PublishInput,
  userId: string,
  // Caller-scoped client: RLS, Storage policies and the publish trigger all
  // apply as the signed-in user, exactly like a web publish.
  supabase: SupabaseClient,
): Promise<PublishResult> {
  const input = publishInput.parse(rawInput);
  // Redact before anything is rendered, uploaded or stored.
  const code = redactSecrets(input.code);
  const title = input.title === undefined ? undefined : redactSecrets(input.title);
  const kinds = { ...code.summary.kinds };
  for (const [kind, count] of Object.entries(title?.summary.kinds ?? {}))
    kinds[kind] = (kinds[kind] ?? 0) + count;
  const redactions = {
    redacted: code.summary.redacted + (title?.summary.redacted ?? 0),
    kinds,
  };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw new Error("Could not load the Supagist profile.");
  if (!profile) throw new Error("Sign in to supagist.app once to create a profile, then retry.");

  const { renderSnippet } = await import("./render.ts");
  const { title: _title, ...appearance } = input;
  const rendered = await renderSnippet({
    ...appearance,
    code: code.code,
    author: profile.username,
  });

  const id = crypto.randomUUID();
  const prefix = `${userId}/snippets/${id}`;
  const svgPath = `${prefix}/canonical.svg`;
  const rawPath = `${prefix}/raw.${rawExtension(input.filename)}`;
  const bucket = supabase.storage.from("snippet-images");
  // Storage takes the type from the Blob itself; an untyped Blob is rejected.
  const upload = (path: string, text: string, type: string) =>
    bucket.upload(path, new Blob([text], { type }), { contentType: type });
  const uploads = await Promise.all([
    upload(svgPath, rendered.svg, "image/svg+xml"),
    upload(rawPath, code.code, "text/plain"),
  ]);
  if (uploads.some((upload) => upload.error)) {
    await bucket.remove([svgPath, rawPath]);
    throw new Error("Could not store the snippet image.");
  }

  const slug = toSlug(title?.code ?? input.filename);
  const short = shortId();
  const { error } = await supabase.from("snippets").insert({
    id,
    short_id: short,
    slug,
    title: title?.code ?? null,
    filename: input.filename,
    language: rendered.language,
    theme: rendered.theme,
    font_id: rendered.fontId,
    code: code.code,
    code_char_count: Array.from(code.code).length,
    line_count: code.code.split("\n").length,
    author_id: userId,
    visibility: "unlisted",
    // PNG assets come from the web composer's browser export; MCP stores SVG.
    canonical_image_path: null,
    og_image_path: null,
    svg_path: svgPath,
    raw_path: rawPath,
  });
  if (error) {
    await bucket.remove([svgPath, rawPath]);
    // The INSERT trigger also counts web publishes against the same account.
    if (
      error.message.includes("publish_hour_rate_limit") ||
      error.message.includes("publish_day_rate_limit")
    )
      throw new Error("Publish limit reached. Try again later.");
    throw new Error("Could not save the snippet.");
  }

  return {
    url: `${APP_ORIGIN}/${slug}-${short}`,
    image_url: bucket.getPublicUrl(svgPath).data.publicUrl,
    visibility: "unlisted",
    redactions,
  };
}
