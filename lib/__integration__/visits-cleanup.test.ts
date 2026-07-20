import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.E2E_SUPABASE_URL;
const serviceKey = process.env.E2E_SUPABASE_SERVICE_KEY;
const anonKey = process.env.E2E_SUPABASE_ANON_KEY;
const skip =
  !url || !serviceKey || !anonKey || url.includes("supabase.co") || url.includes("supabase.io");
const localUrl = url ?? "";
const localServiceKey = serviceKey ?? "";
const localAnonKey = anonKey ?? "";

const BUCKET = "snippet-images";

type TestUser = { id: string; client: SupabaseClient };

async function createTestUser(): Promise<TestUser> {
  const email = `visits-${randomUUID()}@test.local`;
  const password = randomUUID();
  const created = await fetch(`${localUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localServiceKey}`,
      apikey: localServiceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { user_name: `visits-${Date.now()}`, avatar_url: "" },
    }),
  });
  if (!created.ok) throw new Error(`admin create failed: ${await created.text()}`);
  const { id } = (await created.json()) as { id: string };

  const tokenResponse = await fetch(`${localUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: localAnonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!tokenResponse.ok) throw new Error(`sign-in failed: ${await tokenResponse.text()}`);
  const { access_token, refresh_token } = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token: string;
  };

  const client = createClient(localUrl, localAnonKey, { auth: { persistSession: false } });
  await client.auth.setSession({ access_token, refresh_token });
  return { id, client };
}

function snippetRow(authorId: string, suffix: string, lastSeenAt?: string) {
  return {
    id: suffix,
    author_id: authorId,
    slug: `activity-${suffix}`,
    short_id: suffix.replaceAll("-", "").slice(0, 6),
    filename: "activity.ts",
    code: "x",
    language: "typescript",
    theme: "github_light",
    line_count: 1,
    code_char_count: 1,
    canonical_image_path: `${authorId}/snippets/${suffix}/canonical.png`,
    og_image_path: `${authorId}/snippets/${suffix}/og.png`,
    last_seen_at: lastSeenAt,
  };
}

describe.skipIf(skip)("bounded visits and queued Storage cleanup", () => {
  let admin: SupabaseClient;
  let user: TestUser;
  const snippetIds = new Set<string>();
  const storagePaths = new Set<string>();

  beforeAll(async () => {
    admin = createClient(localUrl, localServiceKey, { auth: { persistSession: false } });
    user = await createTestUser();
  });

  afterAll(async () => {
    if (storagePaths.size > 0) await admin.storage.from(BUCKET).remove([...storagePaths]);
    if (snippetIds.size > 0)
      await admin
        .from("snippets")
        .delete()
        .in("id", [...snippetIds]);
    if (user?.id) await admin.auth.admin.deleteUser(user.id);
  });

  it("counts at most one view per signed-in visitor and snippet per minute", async () => {
    const suffix = randomUUID();
    const { data: snippet, error } = await admin
      .from("snippets")
      .insert(snippetRow(user.id, suffix))
      .select("id")
      .single();
    if (error || !snippet) throw new Error(`snippet insert failed: ${error?.message}`);
    snippetIds.add(snippet.id);

    const first = await user.client.rpc("record_snippet_view", { p_snippet_id: snippet.id });
    const second = await user.client.rpc("record_snippet_view", { p_snippet_id: snippet.id });
    expect(first.error).toBeNull();
    expect(first.data).toBe(true);
    expect(second.error).toBeNull();
    expect(second.data).toBe(false);

    const { data: stored } = await admin
      .from("snippets")
      .select("view_count")
      .eq("id", snippet.id)
      .single();
    const { count } = await admin
      .from("snippet_visits")
      .select("id", { count: "exact", head: true })
      .eq("snippet_id", snippet.id);
    expect(stored?.view_count).toBe(1);
    expect(count).toBe(1);
  });

  it("does not create rate-limit buckets for nonexistent snippet ids", async () => {
    const countViewBuckets = async () => {
      const { count } = await admin
        .from("rate_limit_buckets")
        .select("key", { count: "exact", head: true })
        .like("key", "view:%");
      return count ?? 0;
    };
    const before = await countViewBuckets();

    const result = await user.client.rpc("record_snippet_view", {
      p_snippet_id: randomUUID(),
    });

    expect(result.error).toBeNull();
    expect(result.data).toBe(false);
    expect(await countViewBuckets()).toBe(before);
  });

  it("does not expose the former independent visit primitives", async () => {
    const increment = await user.client.rpc("increment_view_count", {
      p_snippet_id: randomUUID(),
    });
    const insert = await user.client.rpc("record_visit", {
      p_snippet_id: randomUUID(),
      p_source: "page_view",
    });
    expect(increment.error).not.toBeNull();
    expect(insert.error).not.toBeNull();
  });

  it("queues stale paths atomically, then removes them through the Storage API", async () => {
    const suffix = randomUUID();
    const staleAt = new Date(Date.now() - 190 * 24 * 60 * 60 * 1000).toISOString();
    const row = snippetRow(user.id, suffix, staleAt);
    const paths = [row.canonical_image_path, row.og_image_path];
    for (const path of paths) {
      storagePaths.add(path);
      const uploaded = await admin.storage
        .from(BUCKET)
        .upload(path, new Blob([path], { type: "image/png" }));
      expect(uploaded.error).toBeNull();
    }

    const { data: snippet, error } = await admin.from("snippets").insert(row).select("id").single();
    if (error || !snippet) throw new Error(`stale snippet insert failed: ${error?.message}`);

    const queued = await admin.rpc("queue_old_snippets_for_cleanup", { p_limit: 10 });
    expect(queued.error).toBeNull();
    expect(
      queued.data?.some((entry: { snippet_id: string }) => entry.snippet_id === snippet.id),
    ).toBe(true);

    const { data: removedSnippet } = await admin
      .from("snippets")
      .select("id")
      .eq("id", snippet.id)
      .maybeSingle();
    expect(removedSnippet).toBeNull();

    const queueRow = queued.data?.find(
      (entry: { snippet_id: string }) => entry.snippet_id === snippet.id,
    ) as { id: string; paths: string[] } | undefined;
    if (!queueRow) throw new Error("cleanup RPC did not return the queued snippet");

    const removed = await admin.storage.from(BUCKET).remove(queueRow.paths);
    expect(removed.error).toBeNull();
    await admin.from("storage_cleanup_queue").delete().eq("id", queueRow.id);
    for (const path of paths) storagePaths.delete(path);
  });

  it("does not queue untrusted paths that point outside the snippet namespace", async () => {
    const suffix = randomUUID();
    const targetPath = `${randomUUID()}/snippets/${randomUUID()}/canonical.png`;
    storagePaths.add(targetPath);
    const uploaded = await admin.storage
      .from(BUCKET)
      .upload(targetPath, new Blob(["target"], { type: "image/png" }));
    expect(uploaded.error).toBeNull();

    const staleAt = new Date(Date.now() - 190 * 24 * 60 * 60 * 1000).toISOString();
    const row = {
      ...snippetRow(user.id, suffix, staleAt),
      canonical_image_path: targetPath,
    };
    const { data: snippet, error } = await admin.from("snippets").insert(row).select("id").single();
    if (error || !snippet) throw new Error(`malicious snippet insert failed: ${error?.message}`);
    snippetIds.add(snippet.id);

    const queued = await admin.rpc("queue_old_snippets_for_cleanup", { p_limit: 100 });
    expect(queued.error).toBeNull();
    expect(
      queued.data?.some((entry: { snippet_id: string }) => entry.snippet_id === snippet.id),
    ).toBe(false);

    const { error: downloadError } = await admin.storage.from(BUCKET).download(targetPath);
    expect(downloadError).toBeNull();
  });

  it("does not queue a snippet whose last_seen_at was refreshed", async () => {
    const suffix = randomUUID();
    const { data: snippet, error } = await admin
      .from("snippets")
      .insert(snippetRow(user.id, suffix, new Date().toISOString()))
      .select("id")
      .single();
    if (error || !snippet) throw new Error(`active snippet insert failed: ${error?.message}`);
    snippetIds.add(snippet.id);

    await admin.rpc("queue_old_snippets_for_cleanup", { p_limit: 100 });
    const { data: stillActive } = await admin
      .from("snippets")
      .select("id")
      .eq("id", snippet.id)
      .single();
    expect(stillActive?.id).toBe(snippet.id);
  });
});
