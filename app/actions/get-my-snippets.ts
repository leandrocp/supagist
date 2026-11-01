"use server";

import { createClient } from "@/lib/supabase/server";
import { renderVersion } from "@/lib/snippet-render";

export type SnippetSummary = {
  id: string;
  short_id: string;
  slug: string;
  filename: string;
  title: string | null;
  language: string | null;
  created_at: string;
  view_count: number;
  /** The publish-time render of the snippet (its own theme), for the list
   *  thumbnail; after an edit, the live render of the edited snippet. */
  thumbnail_url: string;
};

export async function getMySnippets(): Promise<SnippetSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("snippets")
    .select(
      "id, short_id, slug, filename, title, language, created_at, view_count, canonical_image_path, code, theme, font_id, appearance",
    )
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []).map(
    ({ canonical_image_path, code, theme, font_id, appearance, ...snippet }) => ({
      ...snippet,
      // An edit drops canonical.png (and MCP publishes store none).
      thumbnail_url: canonical_image_path
        ? supabase.storage.from("snippet-images").getPublicUrl(canonical_image_path).data.publicUrl
        : `/${snippet.slug}-${snippet.short_id}/image.png?v=${renderVersion({
            code,
            filename: snippet.filename,
            language: snippet.language,
            theme,
            font_id,
            appearance,
          })}`,
    }),
  );
}
