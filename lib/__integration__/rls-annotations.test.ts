/**
 * Integration tests for the RLS policies on snippet_line_reactions and
 * snippet_comments. Per CLAUDE.md, RLS is tested against a real Supabase
 * instance — never via mocks — so a regression like the missing DELETE
 * policy (which silently dropped delete requests on the floor) gets caught
 * the next time it lands.
 *
 * Required env (set automatically when running against the local stack):
 *   E2E_SUPABASE_URL          — local instance URL (must NOT be supabase.co)
 *   E2E_SUPABASE_ANON_KEY     — anon key
 *   E2E_SUPABASE_SERVICE_KEY  — service role key for the same instance
 *
 * Skips automatically (and does not fail CI) when the env isn't configured —
 * a developer who hasn't started local Supabase will still have a green
 * `npm test` for the unit suite.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.E2E_SUPABASE_URL;
const serviceKey = process.env.E2E_SUPABASE_SERVICE_KEY;
const anonKey = process.env.E2E_SUPABASE_ANON_KEY;

const skip =
  !url || !serviceKey || !anonKey || url.includes("supabase.co") || url.includes("supabase.io");

type TestUser = {
  id: string;
  email: string;
  client: SupabaseClient;
};

async function createTestUser(adminUrl: string, sk: string, ak: string): Promise<TestUser> {
  const email = `rls-${randomUUID()}@test.local`;
  const password = randomUUID();

  // 1. Create the auth user via the admin API. The handle_new_user trigger
  //    auto-inserts a row into public.profiles, so we don't have to.
  const created = await fetch(`${adminUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sk}`,
      apikey: sk,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { user_name: `rls-${Date.now()}`, avatar_url: "" },
    }),
  });
  if (!created.ok) throw new Error(`admin create failed: ${await created.text()}`);
  const { id } = (await created.json()) as { id: string };

  // 2. Sign in to get a JWT, then build a per-user client that respects RLS.
  const tokenRes = await fetch(`${adminUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ak, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!tokenRes.ok) throw new Error(`sign-in failed: ${await tokenRes.text()}`);
  const { access_token, refresh_token } = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
  };

  const client = createClient(adminUrl, ak, { auth: { persistSession: false } });
  await client.auth.setSession({ access_token, refresh_token });
  return { id, email, client };
}

async function deleteTestUser(adminUrl: string, sk: string, userId: string): Promise<void> {
  await fetch(`${adminUrl}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${sk}`, apikey: sk },
  });
}

describe.skipIf(skip)("RLS: annotations delete policies", () => {
  // Lazily constructed inside beforeAll so describe.skipIf can avoid it
  // entirely when the integration env isn't configured.
  let admin: SupabaseClient;

  let alice: TestUser;
  let bob: TestUser;
  let snippetId: string;

  beforeAll(async () => {
    admin = createClient(url!, serviceKey!, { auth: { persistSession: false } });
    alice = await createTestUser(url!, serviceKey!, anonKey!);
    bob = await createTestUser(url!, serviceKey!, anonKey!);

    // Service-role insert so we don't depend on the publish action plumbing.
    const { data, error } = await admin
      .from("snippets")
      .insert({
        author_id: alice.id,
        slug: `rls-test-${Date.now()}`,
        short_id: randomUUID().slice(0, 6),
        filename: "rls.tsx",
        code: "x",
        language: "tsx",
        theme: "github_light",
        line_count: 1,
        code_char_count: 1,
        canonical_image_path: `rls-${Date.now()}-canonical`,
        og_image_path: `rls-${Date.now()}-og`,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`snippet insert failed: ${error?.message}`);
    snippetId = data.id;
  });

  afterAll(async () => {
    if (snippetId) {
      await admin.from("snippets").delete().eq("id", snippetId);
    }
    if (alice?.id) await deleteTestUser(url!, serviceKey!, alice.id);
    if (bob?.id) await deleteTestUser(url!, serviceKey!, bob.id);
  });

  // ── snippet_line_reactions ─────────────────────────────────────────────────

  it("user can delete their own reaction", async () => {
    const { data: inserted } = await alice.client
      .from("snippet_line_reactions")
      .insert({ snippet_id: snippetId, author_id: alice.id, line_number: 1, emoji: "🔥" })
      .select("id")
      .single();
    expect(inserted?.id).toBeTruthy();

    const { data: deleted, error } = await alice.client
      .from("snippet_line_reactions")
      .delete()
      .eq("id", inserted!.id)
      .select("id");
    expect(error).toBeNull();
    expect(deleted).toHaveLength(1);
  });

  it("rejects reactions outside the supported emoji catalog", async () => {
    const { error } = await alice.client.from("snippet_line_reactions").insert({
      snippet_id: snippetId,
      author_id: alice.id,
      line_number: 1,
      emoji: "not-an-emoji",
    });

    expect(error?.message).toContain("snippet_line_reactions_emoji_allowed_check");
  });

  it("user cannot delete another user's reaction (RLS returns 0 rows, not an error)", async () => {
    const { data: aliceReaction } = await alice.client
      .from("snippet_line_reactions")
      .insert({ snippet_id: snippetId, author_id: alice.id, line_number: 1, emoji: "💡" })
      .select("id")
      .single();
    expect(aliceReaction?.id).toBeTruthy();

    const { data: deleted, error } = await bob.client
      .from("snippet_line_reactions")
      .delete()
      .eq("id", aliceReaction!.id)
      .select("id");
    expect(error).toBeNull();
    expect(deleted).toEqual([]);

    // Reaction should still exist for everyone else to see
    const { data: stillThere } = await admin
      .from("snippet_line_reactions")
      .select("id")
      .eq("id", aliceReaction!.id)
      .maybeSingle();
    expect(stillThere?.id).toBe(aliceReaction!.id);

    // Cleanup so afterAll doesn't have to know about it
    await admin.from("snippet_line_reactions").delete().eq("id", aliceReaction!.id);
  });

  // ── snippet_comments ───────────────────────────────────────────────────────

  it("user can delete their own comment", async () => {
    const { data: inserted } = await alice.client
      .from("snippet_comments")
      .insert({ snippet_id: snippetId, author_id: alice.id, line_number: 1, body: "mine" })
      .select("id")
      .single();
    expect(inserted?.id).toBeTruthy();

    const { data: deleted, error } = await alice.client
      .from("snippet_comments")
      .delete()
      .eq("id", inserted!.id)
      .select("id");
    expect(error).toBeNull();
    expect(deleted).toHaveLength(1);
  });

  it("user cannot delete another user's comment", async () => {
    const { data: aliceComment } = await alice.client
      .from("snippet_comments")
      .insert({ snippet_id: snippetId, author_id: alice.id, line_number: 1, body: "alice" })
      .select("id")
      .single();
    expect(aliceComment?.id).toBeTruthy();

    const { data: deleted, error } = await bob.client
      .from("snippet_comments")
      .delete()
      .eq("id", aliceComment!.id)
      .select("id");
    expect(error).toBeNull();
    expect(deleted).toEqual([]);

    const { data: stillThere } = await admin
      .from("snippet_comments")
      .select("id")
      .eq("id", aliceComment!.id)
      .maybeSingle();
    expect(stillThere?.id).toBe(aliceComment!.id);

    await admin.from("snippet_comments").delete().eq("id", aliceComment!.id);
  });

  // ── multi-comment behavior (covers the unique-constraint drop) ─────────────

  it("a single user can post multiple comments on the same line", async () => {
    const insertOne = (body: string) =>
      alice.client
        .from("snippet_comments")
        .insert({ snippet_id: snippetId, author_id: alice.id, line_number: 1, body })
        .select("id")
        .single();

    const first = await insertOne("first reply");
    const second = await insertOne("second reply");
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(first.data?.id).toBeTruthy();
    expect(second.data?.id).toBeTruthy();
    expect(first.data!.id).not.toBe(second.data!.id);

    await admin.from("snippet_comments").delete().in("id", [first.data!.id, second.data!.id]);
  });

  it("rejects comments and reactions outside the snippet's line range", async () => {
    const comment = await alice.client.from("snippet_comments").insert({
      snippet_id: snippetId,
      author_id: alice.id,
      line_number: 2,
      body: "outside",
    });
    const reaction = await alice.client.from("snippet_line_reactions").insert({
      snippet_id: snippetId,
      author_id: alice.id,
      line_number: 2,
      emoji: "🔥",
    });

    expect(comment.error?.message).toContain("annotation_line_out_of_bounds");
    expect(reaction.error?.message).toContain("annotation_line_out_of_bounds");
  });

  it("rejects oversized comment and emoji payloads", async () => {
    const comment = await alice.client.from("snippet_comments").insert({
      snippet_id: snippetId,
      author_id: alice.id,
      line_number: 1,
      body: "x".repeat(2001),
    });
    const reaction = await alice.client.from("snippet_line_reactions").insert({
      snippet_id: snippetId,
      author_id: alice.id,
      line_number: 1,
      emoji: "x".repeat(17),
    });

    expect(comment.error).not.toBeNull();
    expect(reaction.error).not.toBeNull();
  });
});
