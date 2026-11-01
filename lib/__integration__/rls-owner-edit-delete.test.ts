/**
 * Self-serve data control against the local Supabase stack (never mocked):
 * un-reacting, owner-only snippet edit and delete, and account deletion, each
 * checked for the owner, another user and an anonymous caller. Skips when the
 * local Supabase env is missing.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.E2E_SUPABASE_URL;
const serviceKey = process.env.E2E_SUPABASE_SERVICE_KEY;
const anonKey = process.env.E2E_SUPABASE_ANON_KEY;

const skip =
  !url || !serviceKey || !anonKey || url.includes("supabase.co") || url.includes("supabase.io");

type User = { id: string; client: SupabaseClient };

async function createTestUser(): Promise<User> {
  const email = `own-${randomUUID()}@test.local`;
  const password = randomUUID();
  const created = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { user_name: `own-${randomUUID().slice(0, 8)}`, avatar_url: "" },
    }),
  });
  if (!created.ok) throw new Error(`admin create failed: ${await created.text()}`);
  const { id } = (await created.json()) as { id: string };
  const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { id, client };
}

describe.skipIf(skip)("owner edit/delete RLS and account deletion", () => {
  const admin = skip ? null! : createClient(url!, serviceKey!, { auth: { persistSession: false } });
  const anon = skip ? null! : createClient(url!, anonKey!, { auth: { persistSession: false } });
  let alice: User;
  let bob: User;
  const users: User[] = [];

  async function insertSnippet(owner: User, code = "one\ntwo\nthree") {
    const id = randomUUID();
    const prefix = `${owner.id}/snippets/${id}`;
    const { error } = await admin.from("snippets").insert({
      id,
      short_id: id.slice(0, 8),
      slug: "own",
      author_id: owner.id,
      filename: "own.ts",
      code,
      language: "typescript",
      theme: "github_dark",
      line_count: code.split("\n").length,
      code_char_count: code.length,
      canonical_image_path: `${prefix}/canonical.png`,
      og_image_path: `${prefix}/og.png`,
      svg_path: `${prefix}/canonical.svg`,
      raw_path: `${prefix}/raw.ts`,
    });
    if (error) throw error;
    return { id, prefix };
  }

  const queuedPaths = async (snippetId: string) => {
    const { data } = await admin
      .from("storage_cleanup_queue")
      .select("paths")
      .eq("snippet_id", snippetId)
      .maybeSingle();
    return ((data?.paths as string[] | undefined) ?? []).toSorted();
  };

  beforeAll(async () => {
    [alice, bob] = await Promise.all([createTestUser(), createTestUser()]);
    users.push(alice, bob);
  });

  afterAll(async () => {
    if (skip) return;
    for (const user of users) {
      await admin.from("snippets").delete().eq("author_id", user.id);
      await fetch(`${url}/auth/v1/admin/users/${user.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey! },
      });
    }
  });

  it("un-react: the author deletes their own snippet reaction; others and anon cannot", async () => {
    const { id } = await insertSnippet(alice);
    const { data: reaction } = await bob.client
      .from("snippet_reactions")
      .insert({ snippet_id: id, author_id: bob.id, emoji: "🔥" })
      .select("id")
      .single();

    for (const client of [alice.client, anon]) {
      const { data } = await client
        .from("snippet_reactions")
        .delete()
        .eq("id", reaction!.id)
        .select("id");
      expect(data ?? []).toEqual([]);
    }

    const { data: deleted, error } = await bob.client
      .from("snippet_reactions")
      .delete()
      .eq("id", reaction!.id)
      .select("id");
    expect(error).toBeNull();
    expect(deleted).toEqual([{ id: reaction!.id }]);
  });

  it("only the owner can edit; an edit recomputes metadata, drops stale images and trims annotations", async () => {
    const { id, prefix } = await insertSnippet(alice);
    await bob.client
      .from("snippet_comments")
      .insert({ snippet_id: id, author_id: bob.id, line_number: 3, body: "on line 3" });
    await bob.client
      .from("snippet_line_reactions")
      .insert({ snippet_id: id, author_id: bob.id, line_number: 1, emoji: "🔥" });

    for (const client of [bob.client, anon]) {
      const { data } = await client
        .from("snippets")
        .update({ title: "hijack" })
        .eq("id", id)
        .select();
      expect(data ?? []).toEqual([]);
    }

    const { data, error } = await alice.client
      .from("snippets")
      .update({ code: "only\nlines 🎉", title: "Edited", visibility: "unlisted" })
      .eq("id", id)
      .select(
        "title, visibility, line_count, code_char_count, canonical_image_path, og_image_path, svg_path, raw_path",
      )
      .single();
    expect(error).toBeNull();
    expect(data).toEqual({
      title: "Edited",
      visibility: "unlisted",
      line_count: 2,
      code_char_count: 12,
      canonical_image_path: null,
      og_image_path: null,
      svg_path: null,
      raw_path: null,
    });
    expect(await queuedPaths(id)).toEqual(
      ["canonical.png", "canonical.svg", "card.png", "og.png", "raw.ts"].map(
        (file) => `${prefix}/${file}`,
      ),
    );

    // Line 3 no longer exists; line 1 still does.
    const { data: comments } = await admin
      .from("snippet_comments")
      .select("id")
      .eq("snippet_id", id);
    const { data: reactions } = await admin
      .from("snippet_line_reactions")
      .select("line_number")
      .eq("snippet_id", id);
    expect(comments).toEqual([]);
    expect(reactions).toEqual([{ line_number: 1 }]);
  });

  it("a title-only edit keeps the stored images", async () => {
    const { id, prefix } = await insertSnippet(alice);
    const { data } = await alice.client
      .from("snippets")
      .update({ title: "Renamed" })
      .eq("id", id)
      .select("svg_path")
      .single();
    expect(data?.svg_path).toBe(`${prefix}/canonical.svg`);
    expect(await queuedPaths(id)).toEqual([]);
  });

  it("an edit that brings re-rendered images keeps them and queues only what it replaced", async () => {
    const { id, prefix } = await insertSnippet(alice);
    const { data, error } = await alice.client
      .from("snippets")
      .update({
        code: "re-rendered",
        canonical_image_path: `${prefix}/canonical-v2.png`,
        og_image_path: `${prefix}/og-v2.png`,
        raw_path: `${prefix}/raw-v2.ts`,
      })
      .eq("id", id)
      .select("canonical_image_path, og_image_path, svg_path, raw_path")
      .single();
    expect(error).toBeNull();
    // The SVG was not replaced, so it is stale and cleared.
    expect(data).toEqual({
      canonical_image_path: `${prefix}/canonical-v2.png`,
      og_image_path: `${prefix}/og-v2.png`,
      svg_path: null,
      raw_path: `${prefix}/raw-v2.ts`,
    });
    // The replaced version's card goes with its canonical PNG; the new one
    // (card-v2.png) sits beside canonical-v2.png.
    expect(await queuedPaths(id)).toEqual(
      ["canonical.png", "canonical.svg", "card.png", "og.png", "raw.ts"].map(
        (file) => `${prefix}/${file}`,
      ),
    );

    // A later edit retires card-v2.png with canonical-v2.png.
    await alice.client.from("snippets").update({ code: "cleared" }).eq("id", id);
    expect(await queuedPaths(id)).toEqual(
      expect.arrayContaining([`${prefix}/canonical-v2.png`, `${prefix}/card-v2.png`]),
    );
  });

  it("the owner cannot change identity, counters or point assets outside the snippet's folder", async () => {
    const { id, prefix } = await insertSnippet(alice);
    for (const change of [
      { author_id: bob.id },
      { short_id: "hijack" },
      { view_count: 1_000_000 },
      { svg_path: `${alice.id}/snippets/${randomUUID()}/canonical.svg` },
      { svg_path: `${bob.id}/snippets/${id}/canonical.svg` },
      { canonical_image_path: `${prefix}/nested/canonical.png` },
      { canonical_image_path: `${prefix}/` },
      // Fixed at publish: an edit re-renders the images with it.
      { appearance: { background: "Lumis" } },
    ]) {
      const { error } = await alice.client.from("snippets").update(change).eq("id", id);
      expect(error?.message, JSON.stringify(change)).toMatch(
        /snippet_field_not_editable|row-level security/,
      );
    }
  });

  it("a snippet keeps the appearance it was published with, as a bounded object", async () => {
    const { id } = await insertSnippet(alice);
    const appearance = { background: "Lumis", windowDecoration: "lumis", ligatures: false };
    expect((await admin.from("snippets").update({ appearance }).eq("id", id)).error).toBeNull();
    const { data } = await anon.from("snippets").select("appearance").eq("id", id).single();
    expect(data?.appearance).toEqual(appearance);

    for (const invalid of [["Lumis"], "Lumis", { pad: "x".repeat(5000) }]) {
      const { error } = await admin.from("snippets").update({ appearance: invalid }).eq("id", id);
      expect(error?.message, JSON.stringify(invalid).slice(0, 40)).toMatch(
        /snippets_appearance_check/,
      );
    }
  });

  it("only the owner can delete; deletion cascades annotations and queues every asset", async () => {
    const { id, prefix } = await insertSnippet(alice);
    await bob.client
      .from("snippet_comments")
      .insert({ snippet_id: id, author_id: bob.id, line_number: 1, body: "hi" });
    await bob.client
      .from("snippet_reactions")
      .insert({ snippet_id: id, author_id: bob.id, emoji: "🔥" });

    for (const client of [bob.client, anon]) {
      const { data } = await client.from("snippets").delete().eq("id", id).select("id");
      expect(data ?? []).toEqual([]);
    }
    const { data: deleted, error } = await alice.client
      .from("snippets")
      .delete()
      .eq("id", id)
      .select("id");
    expect(error).toBeNull();
    expect(deleted).toEqual([{ id }]);

    const [{ count: comments }, { count: reactions }] = await Promise.all([
      admin
        .from("snippet_comments")
        .select("*", { count: "exact", head: true })
        .eq("snippet_id", id),
      admin
        .from("snippet_reactions")
        .select("*", { count: "exact", head: true })
        .eq("snippet_id", id),
    ]);
    expect([comments, reactions]).toEqual([0, 0]);
    expect(await queuedPaths(id)).toEqual(
      ["canonical.png", "canonical.svg", "card.png", "og.png", "raw.ts"].map(
        (file) => `${prefix}/${file}`,
      ),
    );
  });

  it("anonymous callers cannot delete an account", async () => {
    const { error } = await anon.rpc("delete_own_account");
    expect(error).not.toBeNull();
  });

  it("account deletion removes the user, their snippets and their activity elsewhere", async () => {
    const carol = await createTestUser();
    users.push(carol);
    const own = await insertSnippet(carol);
    const others = await insertSnippet(alice);
    await carol.client
      .from("snippet_comments")
      .insert({ snippet_id: others.id, author_id: carol.id, line_number: 1, body: "bye" });
    await carol.client
      .from("snippet_line_reactions")
      .insert({ snippet_id: others.id, author_id: carol.id, line_number: 1, emoji: "👍" });
    await carol.client
      .from("snippet_reactions")
      .insert({ snippet_id: others.id, author_id: carol.id, emoji: "👍" });
    await carol.client.rpc("record_snippet_view", { p_snippet_id: others.id });

    const { error } = await carol.client.rpc("delete_own_account");
    expect(error).toBeNull();

    const counts = await Promise.all(
      [
        admin.from("profiles").select("*", { count: "exact", head: true }).eq("id", carol.id),
        admin
          .from("snippets")
          .select("*", { count: "exact", head: true })
          .eq("author_id", carol.id),
        ...["snippet_comments", "snippet_line_reactions", "snippet_reactions"].map((table) =>
          admin.from(table).select("*", { count: "exact", head: true }).eq("author_id", carol.id),
        ),
        admin
          .from("snippet_visits")
          .select("*", { count: "exact", head: true })
          .eq("viewer_profile_id", carol.id),
      ].map(async (query) => (await query).count),
    );
    expect(counts).toEqual([0, 0, 0, 0, 0, 0]);
    const { data: authUser } = await admin.auth.admin.getUserById(carol.id);
    expect(authUser.user).toBeNull();
    expect(await queuedPaths(own.id)).toHaveLength(5);

    // Alice's snippet is untouched.
    const { count } = await admin
      .from("snippets")
      .select("*", { count: "exact", head: true })
      .eq("id", others.id);
    expect(count).toBe(1);
  });
});
