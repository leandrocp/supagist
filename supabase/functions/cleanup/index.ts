import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const BUCKET = "snippet-images";
const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 500;

type CleanupRow = {
  id: string;
  snippet_id: string;
  paths: string[];
  attempts: number;
};

export default {
  fetch: withSupabase({ auth: ["secret"] }, async (request, context) => {
    const body = await request.json().catch(() => ({}));
    const requestedLimit = Number((body as { limit?: unknown }).limit ?? DEFAULT_BATCH_SIZE);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(Math.trunc(requestedLimit), MAX_BATCH_SIZE))
      : DEFAULT_BATCH_SIZE;

    const { error: queueError } = await context.supabaseAdmin.rpc(
      "queue_old_snippets_for_cleanup",
      { p_limit: limit },
    );
    if (queueError) {
      return Response.json({ error: queueError.message }, { status: 500 });
    }

    const { data, error: readError } = await context.supabaseAdmin
      .from("storage_cleanup_queue")
      .select("id, snippet_id, paths, attempts")
      .order("created_at", { ascending: true })
      .limit(limit);
    if (readError) {
      return Response.json({ error: readError.message }, { status: 500 });
    }

    const rows = (data ?? []) as CleanupRow[];
    let removed = 0;
    const failures: Array<{ snippetId: string; error: string }> = [];

    for (const row of rows) {
      const { error: storageError } = await context.supabaseAdmin.storage
        .from(BUCKET)
        .remove(row.paths);

      if (storageError) {
        failures.push({ snippetId: row.snippet_id, error: storageError.message });
        await context.supabaseAdmin
          .from("storage_cleanup_queue")
          .update({ attempts: row.attempts + 1 })
          .eq("id", row.id);
        continue;
      }

      const { error: dequeueError } = await context.supabaseAdmin
        .from("storage_cleanup_queue")
        .delete()
        .eq("id", row.id);
      if (dequeueError) {
        failures.push({ snippetId: row.snippet_id, error: dequeueError.message });
        continue;
      }

      removed += row.paths.length;
    }

    return Response.json({ processed: rows.length, removed, failures });
  }),
};
