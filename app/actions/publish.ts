"use server";

import { createClient } from "@/lib/supabase/server";
import { publishSnippetWithClient, type PublishResult } from "@/lib/snippet-publish";

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
    return { error: "Invalid publish data.", reason: "invalid_input" };
  }

  const reactions = parseDraftObject(reactionsJson) as Record<number, string>;
  const comments = parseDraftObject(commentsJson) as Record<
    number,
    { author: string; body: string }
  >;

  const supabase = await createClient();

  return publishSnippetWithClient(supabase, {
    code,
    filename,
    theme,
    language,
    canonicalImage,
    ogImage,
    svg: svgBlob,
    reactions,
    comments,
  });
}
