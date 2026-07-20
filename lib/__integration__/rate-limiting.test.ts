/**
 * Integration tests for the rate-limit RPC and the BEFORE INSERT triggers
 * that bound user-content writes. Runs against a real local Supabase
 * instance per the CLAUDE.md "no DB mocks" rule. Skips automatically
 * when the integration env isn't configured.
 *
 * Required env (set automatically when running against the local stack):
 *   E2E_SUPABASE_URL
 *   E2E_SUPABASE_ANON_KEY
 *   E2E_SUPABASE_SERVICE_KEY
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.E2E_SUPABASE_URL;
const serviceKey = process.env.E2E_SUPABASE_SERVICE_KEY;
const anonKey = process.env.E2E_SUPABASE_ANON_KEY;

const skip =
  !url || !serviceKey || !anonKey || url.includes("supabase.co") || url.includes("supabase.io");

type TestUser = {
  id: string;
  client: SupabaseClient;
};

async function createTestUser(adminUrl: string, sk: string, ak: string): Promise<TestUser> {
  const email = `rl-${randomUUID()}@test.local`;
  const password = randomUUID();
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
      user_metadata: { user_name: `rl-${Date.now()}`, avatar_url: "" },
    }),
  });
  if (!created.ok) throw new Error(`admin create failed: ${await created.text()}`);
  const { id } = (await created.json()) as { id: string };

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
  return { id, client };
}

async function deleteTestUser(adminUrl: string, sk: string, userId: string): Promise<void> {
  await fetch(`${adminUrl}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${sk}`, apikey: sk },
  });
}

describe.skipIf(skip)("rate limiting", () => {
  let admin: SupabaseClient;
  let alice: TestUser;
  let snippetId: string;

  beforeAll(async () => {
    admin = createClient(url!, serviceKey!, { auth: { persistSession: false } });
    alice = await createTestUser(url!, serviceKey!, anonKey!);

    const { data, error } = await admin
      .from("snippets")
      .insert({
        author_id: alice.id,
        slug: `rl-test-${Date.now()}`,
        short_id: randomUUID().slice(0, 6),
        filename: "rl.tsx",
        code: "x",
        language: "tsx",
        theme: "github_light",
        line_count: 1,
        code_char_count: 1,
        canonical_image_path: `rl-${Date.now()}-canonical`,
        og_image_path: `rl-${Date.now()}-og`,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`snippet insert failed: ${error?.message}`);
    snippetId = data.id;
  });

  afterAll(async () => {
    if (snippetId) await admin.from("snippets").delete().eq("id", snippetId);
    if (alice?.id) await deleteTestUser(url!, serviceKey!, alice.id);
  });

  beforeEach(async () => {
    // Wipe Alice's rate-limit buckets so each test starts clean. The
    // service-role admin client bypasses RLS to clear the locked-down table.
    await admin.from("rate_limit_buckets").delete().like("key", `%:${alice.id}`);
  });

  // ── check_rate_limit RPC ───────────────────────────────────────────────────

  it("check_rate_limit returns true under the cap and false at the cap", async () => {
    const key = `unit:${alice.id}`;
    const { data: first } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_max: 2,
      p_window: "1 minute",
    });
    const { data: second } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_max: 2,
      p_window: "1 minute",
    });
    const { data: third } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_max: 2,
      p_window: "1 minute",
    });
    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(third).toBe(false);
  });

  it("check_rate_limit rejects invalid configuration instead of failing open", async () => {
    const { error: nullKeyError } = await admin.rpc("check_rate_limit", {
      p_key: null,
      p_max: 1,
      p_window: "1 minute",
    });
    const { error: zeroMaxError } = await admin.rpc("check_rate_limit", {
      p_key: `zero:${alice.id}`,
      p_max: 0,
      p_window: "1 minute",
    });
    expect(nullKeyError).not.toBeNull();
    expect(zeroMaxError).not.toBeNull();
  });

  it("does not expose the generic bucket primitive to authenticated users", async () => {
    const { error } = await alice.client.rpc("check_rate_limit", {
      p_key: `publish_hour:${randomUUID()}`,
      p_max: 1_000_000,
      p_window: "1 millisecond",
    });

    expect(error).not.toBeNull();
  });

  // ── BEFORE INSERT triggers ─────────────────────────────────────────────────

  it("allows a persistent user to insert below the publish limits", async () => {
    const unique = randomUUID();
    const { data, error } = await alice.client
      .from("snippets")
      .insert({
        id: unique,
        author_id: alice.id,
        slug: `direct-ok-${unique}`,
        short_id: unique.slice(0, 6),
        filename: "direct.ts",
        code: "x\ny",
        language: "typescript",
        theme: "github_light",
        line_count: 999,
        code_char_count: 999,
        last_seen_at: "2000-01-01T00:00:00.000Z",
        view_count: 999,
        canonical_image_path: `${alice.id}/snippets/${unique}/canonical.png`,
        og_image_path: `${alice.id}/snippets/${unique}/og.png`,
      })
      .select("id, line_count, code_char_count, last_seen_at, view_count")
      .single();

    expect(error).toBeNull();
    if (!data) throw new Error("direct insert did not return the snippet");
    expect(data).toMatchObject({ id: unique, line_count: 2, code_char_count: 3, view_count: 0 });
    expect(new Date(data.last_seen_at).getTime()).toBeGreaterThan(Date.now() - 60_000);
    await admin.from("snippets").delete().eq("id", data.id);
  });

  it("rejects asset paths outside the author's snippet prefix", async () => {
    const unique = randomUUID();
    const { error } = await alice.client.from("snippets").insert({
      id: unique,
      author_id: alice.id,
      slug: `bad-path-${unique}`,
      short_id: unique.slice(0, 6),
      filename: "bad.ts",
      code: "x",
      language: "typescript",
      theme: "github_light",
      line_count: 1,
      code_char_count: 1,
      canonical_image_path: `${randomUUID()}/snippets/${randomUUID()}/canonical.png`,
      og_image_path: `${alice.id}/snippets/${unique}/og.png`,
    });

    expect(error?.message).toContain("invalid_snippet_asset_paths");
  });

  it("rejects anonymous users at the database publish boundary", async () => {
    const anonymous = createClient(url!, anonKey!, { auth: { persistSession: false } });
    const { data: authData, error: authError } = await anonymous.auth.signInAnonymously();
    expect(authError).toBeNull();
    if (!authData.user) throw new Error("anonymous sign-in did not return a user");

    const anonymousId = authData.user.id;
    const unique = randomUUID();
    const { error } = await anonymous.from("snippets").insert({
      id: unique,
      author_id: anonymousId,
      slug: `anonymous-${unique}`,
      short_id: unique.slice(0, 6),
      filename: "anonymous.ts",
      code: "x",
      language: "typescript",
      theme: "github_light",
      line_count: 1,
      code_char_count: 1,
      canonical_image_path: `${anonymousId}/snippets/${unique}/canonical.png`,
      og_image_path: `${anonymousId}/snippets/${unique}/og.png`,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain("persistent_account_required");
    await admin.auth.admin.deleteUser(anonymousId);
  });

  it("direct snippet inserts obey the hourly publish limit", async () => {
    await admin.from("rate_limit_buckets").upsert({
      key: `publish_hour:${alice.id}`,
      window_start: new Date().toISOString(),
      count: 10,
    });

    const unique = randomUUID();
    const { error } = await alice.client.from("snippets").insert({
      id: unique,
      author_id: alice.id,
      slug: `direct-${unique}`,
      short_id: unique.slice(0, 6),
      filename: "direct.ts",
      code: "x",
      language: "typescript",
      theme: "github_light",
      line_count: 1,
      code_char_count: 1,
      canonical_image_path: `${alice.id}/snippets/${unique}/canonical.png`,
      og_image_path: `${alice.id}/snippets/${unique}/og.png`,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain("publish_hour_rate_limit");
  });

  it("snippet_line_reactions trigger blocks once the per-minute cap is hit", async () => {
    // The migration sets the cap at 60/minute. We pre-fill Alice's bucket
    // to 60 via the RPC (fast: a single row update) instead of inserting
    // 60 reaction rows.
    await admin.from("rate_limit_buckets").upsert({
      key: `line_react:${alice.id}`,
      window_start: new Date().toISOString(),
      count: 60,
    });

    const { error } = await alice.client.from("snippet_line_reactions").insert({
      snippet_id: snippetId,
      author_id: alice.id,
      line_number: 1,
      emoji: "🔥",
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/rate limit/i);
  });

  it("snippet_comments trigger blocks once the per-minute cap is hit", async () => {
    await admin.from("rate_limit_buckets").upsert({
      key: `comment:${alice.id}`,
      window_start: new Date().toISOString(),
      count: 30,
    });

    const { error } = await alice.client.from("snippet_comments").insert({
      snippet_id: snippetId,
      author_id: alice.id,
      line_number: 1,
      body: "blocked",
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/rate limit/i);
  });

  it("the trigger does NOT block valid writes when the bucket is below the cap", async () => {
    const { error } = await alice.client.from("snippet_line_reactions").insert({
      snippet_id: snippetId,
      author_id: alice.id,
      line_number: 1,
      emoji: "✨",
    });
    expect(error).toBeNull();
  });

  it("the rate_limit_buckets table is invisible to authenticated users", async () => {
    const { data, error } = await alice.client.from("rate_limit_buckets").select("*").limit(1);
    // RLS with no policies returns an empty set (or a permission error,
    // depending on the PostgREST version). Either way, no rows leak.
    expect(error || (data ?? []).length === 0).toBeTruthy();
  });
});
