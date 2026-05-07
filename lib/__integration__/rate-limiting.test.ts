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

  it("check_rate_limit treats null/zero limits as always-allowed", async () => {
    const { data: nullKey } = await admin.rpc("check_rate_limit", {
      p_key: null,
      p_max: 1,
      p_window: "1 minute",
    });
    const { data: zeroMax } = await admin.rpc("check_rate_limit", {
      p_key: `zero:${alice.id}`,
      p_max: 0,
      p_window: "1 minute",
    });
    expect(nullKey).toBe(true);
    expect(zeroMax).toBe(true);
  });

  // ── BEFORE INSERT triggers ─────────────────────────────────────────────────

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

  it("the trigger does NOT block writes when the bucket is below the cap", async () => {
    const { error } = await alice.client.from("snippet_line_reactions").insert({
      snippet_id: snippetId,
      author_id: alice.id,
      line_number: 99,
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
