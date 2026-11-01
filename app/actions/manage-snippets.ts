"use server";

import { availableLanguages, availableThemes } from "@lumis-sh/lumis/client";
import { isBrandThemeId } from "@/lib/brand-themes";
import { createClient } from "@/lib/supabase/server";
import { codePointLength } from "@/lib/snippet-utils";

export type SnippetEdit = {
  code: string;
  title: string;
  language: string;
  theme: string;
  visibility: "public" | "unlisted";
};

type Result = { ok: true; error?: never } | { ok?: never; error: string };

const BUCKET = "snippet-images";

async function persistentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user: user && !user.is_anonymous ? user : null };
}

/** Owner-only edit. RLS and a database trigger enforce ownership and editable fields. */
export async function updateSnippet(snippetId: string, edit: SnippetEdit): Promise<Result> {
  const code = edit.code.replace(/\r\n?/g, "\n");
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

  const { data, error } = await supabase
    .from("snippets")
    .update({
      code,
      title: title || null,
      language: edit.language,
      theme: edit.theme,
      visibility: edit.visibility,
    })
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

  const paths = [row.canonical_image_path, row.og_image_path, row.svg_path, row.raw_path].filter(
    (path): path is string => typeof path === "string",
  );
  // The queued cleanup retries anything this misses.
  if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths);
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
    .select("canonical_image_path, og_image_path, svg_path, raw_path")
    .eq("author_id", user.id);

  const { error } = await supabase.rpc("delete_own_account");
  if (error) return { error: "Could not delete your account. Please try again." };

  const paths = (snippets ?? [])
    .flatMap((row) => [row.canonical_image_path, row.og_image_path, row.svg_path, row.raw_path])
    .filter((path): path is string => typeof path === "string" && path.startsWith(`${user.id}/`));
  if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths);

  await supabase.auth.signOut({ scope: "local" });
  return { ok: true };
}
