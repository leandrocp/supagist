"use server";

import { createClient } from "@/lib/supabase/server";

export async function recordVisit(snippetId: string): Promise<void> {
  const supabase = await createClient();

  await Promise.all([
    supabase.rpc("record_visit", { p_snippet_id: snippetId, p_source: "page_view" }),
    supabase.rpc("increment_view_count", { p_snippet_id: snippetId }),
  ]);
}
