"use server";

import { createClient } from "@/lib/supabase/server";

export type SnippetSummary = {
  short_id: string;
  slug: string;
  filename: string;
  language: string | null;
  created_at: string;
  view_count: number;
};

export async function getMySnippets(): Promise<SnippetSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("snippets")
    .select("short_id, slug, filename, language, created_at, view_count")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return data ?? [];
}
