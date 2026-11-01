"use server";

import { availableLanguages, availableThemes } from "@lumis-sh/lumis/client";
import { isBrandThemeId } from "@/lib/brand-themes";
import { createClient } from "@/lib/supabase/server";
import { codePointLength, getRawFileExtension, normalizeSnippetCode } from "@/lib/snippet-utils";
import { cardPathFor } from "@/lib/og-image";

export type SnippetEdit = {
  code: string;
  title: string;
  language: string;
  theme: string;
  visibility: "public" | "unlisted";
};

type Result = { ok: true; error?: never } | { ok?: never; error: string };

const BUCKET = "snippet-images";

/**
 * Removes a snippet's stored files right away: the recorded paths plus
 * everything in the owner's folder for it (such as card.png, or files a
 * previous edit replaced). The queued cleanup retries anything this misses.
 */
async function removeSnippetFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  folder: string,
  paths: (string | null)[],
) {
  const bucket = supabase.storage.from(BUCKET);
  const { data: files } = await bucket.list(folder);
  const all = new Set([
    ...paths.filter((path): path is string => typeof path === "string"),
    ...(files ?? []).map((file) => `${folder}/${file.name}`),
  ]);
  if (all.size > 0) await bucket.remove([...all]);
}

async function persistentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user: user && !user.is_anonymous ? user : null };
}

type StoredImages = {
  canonical_image_path: string;
  og_image_path: string;
  svg_path: string;
  raw_path: string;
};

/**
 * Stores the images the editor re-rendered for an edit, under new names in
 * the snippet's folder: Storage has no overwrite policy, and a new URL is
 * never served stale from the CDN. The share image's card goes beside the
 * canonical PNG under the same version (`cardPathFor`), before the row points
 * at it, so a new share URL never finds an old card. Returns the columns to
 * set and every file uploaded, or null when there are none to store.
 */
async function uploadEditImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  folder: string,
  filename: string,
  code: string,
  images: FormData | undefined,
): Promise<{ columns: StoredImages; files: string[] } | null> {
  const canonical = images?.get("canonical_image");
  const og = images?.get("og_image");
  const svg = images?.get("svg");
  if (!(canonical instanceof Blob) || !(og instanceof Blob) || !(svg instanceof Blob)) return null;

  const version = crypto.randomUUID().slice(0, 8);
  const paths: StoredImages = {
    canonical_image_path: `${folder}/canonical-${version}.png`,
    og_image_path: `${folder}/og-${version}.png`,
    svg_path: `${folder}/canonical-${version}.svg`,
    raw_path: `${folder}/raw-${version}.${getRawFileExtension(filename)}`,
  };
  const card = images?.get("card_image");
  const cardPath = card instanceof Blob ? cardPathFor(paths.canonical_image_path) : null;
  const files = [...Object.values(paths), ...(cardPath ? [cardPath] : [])];
  const bucket = supabase.storage.from(BUCKET);
  const results = await Promise.all([
    bucket.upload(paths.canonical_image_path, canonical, { contentType: "image/png" }),
    bucket.upload(paths.og_image_path, og, { contentType: "image/png" }),
    bucket.upload(paths.svg_path, svg, { contentType: "image/svg+xml" }),
    bucket.upload(paths.raw_path, Buffer.from(code, "utf-8"), { contentType: "text/plain" }),
    // Optional: without it the share image falls back to the canonical PNG.
    cardPath && card instanceof Blob
      ? bucket.upload(cardPath, card, { contentType: "image/png" })
      : { error: null },
  ]);
  if (results.slice(0, 4).some((result) => result.error)) {
    await bucket.remove(files);
    return null;
  }
  return { columns: paths, files };
}

/**
 * Owner-only edit. RLS and a database trigger enforce ownership and editable
 * fields. `images` holds the editor's re-render (as a publish sends it); with
 * them the snippet keeps its stored images, without them the edit clears the
 * ones that no longer match.
 */
export async function updateSnippet(
  snippetId: string,
  edit: SnippetEdit,
  images?: FormData,
): Promise<Result> {
  const code = normalizeSnippetCode(edit.code);
  const length = codePointLength(code);
  if (length === 0 || length > 8000) {
    return { error: `Code must be 1–8,000 characters (got ${length.toLocaleString()}).` };
  }
  const title = edit.title.trim();
  if (title.length > 120) return { error: "Title must be at most 120 characters." };
  if (!isBrandThemeId(edit.theme) && !availableThemes().some((t) => t.name === edit.theme)) {
    return { error: "Unknown theme." };
  }
  if (!availableLanguages().some((language) => language.id === edit.language)) {
    return { error: "Unknown language." };
  }
  if (edit.visibility !== "public" && edit.visibility !== "unlisted") {
    return { error: "Unknown visibility." };
  }

  const { supabase, user } = await persistentUser();
  if (!user) return { error: "Sign in to edit your snippets." };

  const { data: snippet } = await supabase
    .from("snippets")
    .select("filename")
    .eq("id", snippetId)
    .eq("author_id", user.id)
    .maybeSingle();
  if (!snippet) return { error: "Snippet not found, or it isn't yours." };

  const folder = `${user.id}/snippets/${snippetId}`;
  const stored = await uploadEditImages(supabase, folder, snippet.filename, code, images);

  const { data, error } = await supabase
    .from("snippets")
    .update({
      code,
      title: title || null,
      language: edit.language,
      theme: edit.theme,
      visibility: edit.visibility,
      ...stored?.columns,
    })
    .eq("id", snippetId)
    .eq("author_id", user.id)
    .select("id");
  if (error || !data?.length) {
    if (stored) await supabase.storage.from(BUCKET).remove(stored.files);
  }
  if (error?.message.includes("edit_hour_rate_limit")) {
    return { error: "Too many edits in the last hour. Try again later." };
  }
  if (error) return { error: "Could not save your changes. Please try again." };
  if (!data?.length) return { error: "Snippet not found, or it isn't yours." };

  return { ok: true };
}

/**
 * Owner-only delete. Reactions, comments and visits cascade; the delete
 * trigger queues every asset path for Storage cleanup in the same transaction,
 * and this removes the owner's objects right away.
 */
export async function deleteSnippet(snippetId: string): Promise<Result> {
  const { supabase, user } = await persistentUser();
  if (!user) return { error: "Sign in to delete your snippets." };

  const { data, error } = await supabase
    .from("snippets")
    .delete()
    .eq("id", snippetId)
    .eq("author_id", user.id)
    .select("canonical_image_path, og_image_path, svg_path, raw_path");
  if (error) return { error: "Could not delete the snippet. Please try again." };
  const row = data?.[0];
  if (!row) return { error: "Snippet not found, or it isn't yours." };

  await removeSnippetFiles(supabase, `${user.id}/snippets/${snippetId}`, [
    row.canonical_image_path,
    row.og_image_path,
    row.svg_path,
    row.raw_path,
  ]);
  return { ok: true };
}

/** Deletes the signed-in account and all its data, then ends the session. */
export async function deleteAccount(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to delete your account." };

  // List the owner's objects first: once the account is gone, Storage no
  // longer accepts its session. The database queues the same paths anyway.
  const { data: snippets } = await supabase
    .from("snippets")
    .select("id, canonical_image_path, og_image_path, svg_path, raw_path")
    .eq("author_id", user.id);

  const { error } = await supabase.rpc("delete_own_account");
  if (error) return { error: "Could not delete your account. Please try again." };

  // Only the user's own prefix is removable with their session; the database
  // queued every object under it (and any legacy paths) for cleanup anyway.
  const own = (path: string | null) => (path?.startsWith(`${user.id}/`) ? path : null);
  await Promise.all(
    (snippets ?? []).map((row) =>
      removeSnippetFiles(supabase, `${user.id}/snippets/${row.id}`, [
        own(row.canonical_image_path),
        own(row.og_image_path),
        own(row.svg_path),
        own(row.raw_path),
      ]),
    ),
  );

  await supabase.auth.signOut({ scope: "local" });
  return { ok: true };
}
