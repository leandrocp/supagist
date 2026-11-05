/**
 * RLS for private snippets, against the local Supabase stack (never mocked).
 * Private rows must never come back from a table read (so no listing, feed or
 * search can include them) except to their owner, yet stay reachable through
 * the exact slug + short_id link. Skips when local Supabase env is missing.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.E2E_SUPABASE_URL;
const serviceKey = process.env.E2E_SUPABASE_SERVICE_KEY;
const anonKey = process.env.E2E_SUPABASE_ANON_KEY;

const skip =
  !url || !serviceKey || !anonKey || url.includes("supabase.co") || url.includes("supabase.io");

async function createTestUser(): Promise<{ id: string; client: SupabaseClient }> {
  const email = `vis-${randomUUID()}@test.local`;
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
      user_metadata: { user_name: `vis-${randomUUID().slice(0, 8)}`, avatar_url: "" },
    }),
  });
  if (!created.ok) throw new Error(`admin create failed: ${await created.text()}`);
  const { id } = (await created.json()) as { id: string };
  const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { id, client };
}

describe.skipIf(skip)("snippet visibility RLS", () => {
  const admin = skip ? null! : createClient(url!, serviceKey!, { auth: { persistSession: false } });
  const anon = skip ? null! : createClient(url!, anonKey!, { auth: { persistSession: false } });
  let alice: { id: string; client: SupabaseClient };
  let bob: { id: string; client: SupabaseClient };
  const tag = randomUUID().slice(0, 8);
  const rows: Record<"public" | "private", { id: string; slug: string; short_id: string }> =
    {} as never;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([createTestUser(), createTestUser()]);
    for (const visibility of ["public", "private"] as const) {
      const id = randomUUID();
      const row = { id, slug: `vis-${visibility}-${tag}`, short_id: id.slice(0, 8) };
      const { error } = await admin.from("snippets").insert({
        ...row,
        ...(visibility === "private" ? { visibility } : {}),
        author_id: alice.id,
        filename: "vis.ts",
        code: "x",
        language: "typescript",
        theme: "github_dark",
        line_count: 1,
        code_char_count: 1,
        canonical_image_path: `${alice.id}/snippets/${id}/canonical.png`,
        og_image_path: `${alice.id}/snippets/${id}/og.png`,
      });
      if (error) throw error;
      rows[visibility] = row;
    }
  });

  afterAll(async () => {
    if (skip) return;
    await admin.from("snippets").delete().like("slug", `vis-%-${tag}`);
    for (const user of [alice, bob]) {
      if (!user) continue;
      await fetch(`${url}/auth/v1/admin/users/${user.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey! },
      });
    }
  });

  it("defaults new snippets to public", async () => {
    const { data } = await admin
      .from("snippets")
      .select("visibility")
      .eq("id", rows.public.id)
      .single();
    expect(data?.visibility).toBe("public");
  });

  it("rejects visibility values other than public and private", async () => {
    const { error } = await admin
      .from("snippets")
      .update({ visibility: "secret" })
      .eq("id", rows.public.id);
    expect(error?.code).toBe("23514");
  });

  it("stores the old unlisted value as private, for clients still sending it", async () => {
    const { data, error } = await alice.client
      .from("snippets")
      .update({ visibility: "unlisted" })
      .eq("id", rows.private.id)
      .select("visibility")
      .single();
    expect(error).toBeNull();
    expect(data?.visibility).toBe("private");
  });

  it("never returns private rows from table reads by anon or other users", async () => {
    for (const client of [anon, bob.client]) {
      const { data: listing } = await client
        .from("snippets")
        .select("id")
        .like("slug", `vis-%-${tag}`);
      expect(listing?.map((r) => r.id)).toEqual([rows.public.id]);
      // Filtering by the exact identifiers through the table still hides it.
      const { data: direct } = await client
        .from("snippets")
        .select("id")
        .eq("slug", rows.private.slug)
        .eq("short_id", rows.private.short_id);
      expect(direct).toEqual([]);
    }
  });

  it("shows owners their own private snippets", async () => {
    const { data } = await alice.client
      .from("snippets")
      .select("id, visibility")
      .eq("author_id", alice.id)
      .order("visibility");
    expect(data).toEqual([
      { id: rows.private.id, visibility: "private" },
      { id: rows.public.id, visibility: "public" },
    ]);
  });

  it("returns an private snippet to anyone with the exact link", async () => {
    for (const client of [anon, bob.client]) {
      const { data, error } = await client
        .rpc("get_snippet_by_link", {
          p_slug: rows.private.slug,
          p_short_id: rows.private.short_id,
        })
        .select("id, visibility, author:author_id(id)")
        .maybeSingle();
      expect(error).toBeNull();
      expect(data).toEqual({
        id: rows.private.id,
        visibility: "private",
        author: { id: alice.id },
      });
    }
  });

  it("returns nothing for a wrong or partial link", async () => {
    for (const args of [
      { p_slug: rows.private.slug, p_short_id: rows.public.short_id },
      { p_slug: `vis-private-${tag}`, p_short_id: "" },
      { p_slug: "%", p_short_id: "%" },
    ]) {
      const { data } = await anon.rpc("get_snippet_by_link", args).select("id");
      expect(data).toEqual([]);
    }
  });
});
