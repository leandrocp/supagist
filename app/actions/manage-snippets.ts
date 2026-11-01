"use server";

import { createClient } from "@/lib/supabase/server";

/** What an owner can still change once a snippet is published (sealed). */
export type SnippetEdit = {
  title: string;
  visibility: "public" | "unlisted";
};

type Result = { ok: true; error?: never } | { ok?: never; error: string };

const BUCKET = "snippet-images";

/**
 * Removes a snippet's stored files right away: the recorded paths plus
 * everything in the owner's folder for it (such as card.png, or files an
 * earlier version of editing replaced). The queued cleanup retries anything this misses.
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

/**
 * Owner-only edit of a published snippet's title and visibility. The code,
 * language, theme and images are sealed at publish; RLS and a database
 * trigger enforce ownership and the editable fields.
 */
export async function updateSnippet(snippetId: string, edit: SnippetEdit): Promise<Result> {
  const title = edit.title.trim();
  if (title.length > 120) return { error: "Title must be at most 120 characters." };
  if (edit.visibility !== "public" && edit.visibility !== "unlisted") {
    return { error: "Unknown visibility." };
  }

  const { supabase, user } = await persistentUser();
  if (!user) return { error: "Sign in to edit your snippets." };

  const { data, error } = await supabase
    .from("snippets")
    .update({ title: title || null, visibility: edit.visibility })
    .eq("id", snippetId)
    .eq("author_id", user.id)
    .select("id");
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
