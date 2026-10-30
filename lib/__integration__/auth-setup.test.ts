/** Real local Auth + profiles regression tests for Playwright user provisioning. */
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { ensureAuthUser } from "../../e2e/auth-user";

const url = process.env.E2E_SUPABASE_URL;
const serviceKey = process.env.E2E_SUPABASE_SERVICE_KEY;
const anonKey = process.env.E2E_SUPABASE_ANON_KEY;
const skip =
  !url || !serviceKey || !anonKey || !["localhost", "127.0.0.1"].includes(new URL(url).hostname);

describe.skipIf(skip)("E2E auth user provisioning", () => {
  let admin: SupabaseClient;
  const ids = new Set<string>();
  const password = randomUUID();

  beforeAll(() => {
    admin = createClient(url!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  afterEach(async () => {
    for (const id of ids) {
      const { error } = await admin.auth.admin.deleteUser(id);
      expect(error).toBeNull();
    }
    ids.clear();
  });

  async function signIn(email: string) {
    const client = createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    expect(error).toBeNull();
    ids.add(data.user!.id);
    const profile = await admin
      .from("profiles")
      .select("id, username")
      .eq("id", data.user!.id)
      .single();
    expect(profile.error).toBeNull();
    return profile.data!;
  }

  it("isolates emails with the same local part and reuses the same identity", async () => {
    const localPart = `auth-setup-${randomUUID()}`;
    const firstEmail = `${localPart}@supagist.test`;
    const secondEmail = `${localPart}@other.supagist.test`;
    await ensureAuthUser(url!, serviceKey!, firstEmail, password);
    const first = await signIn(firstEmail);
    await ensureAuthUser(url!, serviceKey!, secondEmail, password);
    const second = await signIn(secondEmail);
    expect(second.id).not.toBe(first.id);
    expect(second.username).not.toBe(first.username);

    await ensureAuthUser(url!, serviceKey!, firstEmail.toUpperCase(), password);
    expect(await signIn(firstEmail)).toEqual(first);
  });

  it("preserves a pre-existing profile and password", async () => {
    const email = `auth-setup-${randomUUID()}@supagist.test`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { user_name: `legacy-${randomUUID()}` },
    });
    expect(error).toBeNull();
    ids.add(data.user!.id);
    const original = await signIn(email);
    await ensureAuthUser(url!, serviceKey!, email, randomUUID());
    expect(await signIn(email)).toEqual(original);
  });

  it("reports creation validation errors with their original message", async () => {
    await expect(ensureAuthUser(url!, serviceKey!, "not-an-email", password)).rejects.toThrow(
      "Supabase test user creation failed: Unable to validate email address",
    );
  });

  it("reports profile constraint failures at creation", async () => {
    const email = `auth-setup-${randomUUID()}@supagist.test`;
    await ensureAuthUser(url!, serviceKey!, email, password);
    const original = await signIn(email);
    expect((await admin.auth.admin.deleteUser(original.id)).error).toBeNull();
    ids.delete(original.id);

    // Another account takes this profile name, forcing the real trigger to fail.
    const { data, error } = await admin.auth.admin.createUser({
      email: `blocker-${randomUUID()}@supagist.test`,
      password,
      email_confirm: true,
      user_metadata: { user_name: original.username },
    });
    expect(error).toBeNull();
    ids.add(data.user!.id);
    await expect(ensureAuthUser(url!, serviceKey!, email, password)).rejects.toThrow(
      "Supabase test user creation failed",
    );
  });
});
