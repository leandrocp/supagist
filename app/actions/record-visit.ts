"use server";

import { createClient } from "@/lib/supabase/server";

export async function recordVisit(snippetId: string): Promise<void> {
  const supabase = await createClient();

  // One database function atomically rate-limits, increments, and records the
  // visit. The former independent RPCs could be spammed to inflate analytics.
  await supabase.rpc("record_snippet_view", { p_snippet_id: snippetId });
}
