"use server";

import { createClient } from "@/lib/supabase/server";

export type SnippetSummary = {
  short_id: string;
  slug: string;
  filename: string;
  language: string | null;
  created_at: string;
  view_count: number;
  /** The publish-time render of the snippet (its own theme), for the list thumbnail. */
  thumbnail_url: string | null;
};

export async function getMySnippets(): Promise<SnippetSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("snippets")
    .select("short_id, slug, filename, language, created_at, view_count, canonical_image_path")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []).map(({ canonical_image_path, ...snippet }) => ({
    ...snippet,
    thumbnail_url: canonical_image_path
      ? supabase.storage.from("snippet-images").getPublicUrl(canonical_image_path).data.publicUrl
      : null,
  }));
}
