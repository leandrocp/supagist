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

type TestUser = {
  id: string;
  client: SupabaseClient;
};

async function createTestUser(adminUrl: string, sk: string, ak: string): Promise<TestUser> {
  const email = `storage-${randomUUID()}@test.local`;
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
      user_metadata: { user_name: `storage-${Date.now()}`, avatar_url: "" },
    }),
  });
  if (!created.ok) throw new Error(`admin create failed: ${await created.text()}`);
  const { id } = (await created.json()) as { id: string };

  const tokenResponse = await fetch(`${adminUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ak, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!tokenResponse.ok) throw new Error(`sign-in failed: ${await tokenResponse.text()}`);
  const { access_token, refresh_token } = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token: string;
  };

  const client = createClient(adminUrl, ak, { auth: { persistSession: false } });
  await client.auth.setSession({ access_token, refresh_token });
  return { id, client };
}

async function objectExists(admin: SupabaseClient, path: string): Promise<boolean> {
  const { error } = await admin.storage.from(BUCKET).download(path);
  return !error;
}

async function deleteTestUser(adminUrl: string, sk: string, userId: string): Promise<void> {
  await fetch(`${adminUrl}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${sk}`, apikey: sk },
  });
}

describe.skipIf(skip)("Storage RLS: snippet image ownership", () => {
  let admin: SupabaseClient;
  let alice: TestUser;
  let bob: TestUser;
  const cleanupPaths = new Set<string>();

  beforeAll(async () => {
    admin = createClient(localUrl, localServiceKey, { auth: { persistSession: false } });
    alice = await createTestUser(localUrl, localServiceKey, localAnonKey);
    bob = await createTestUser(localUrl, localServiceKey, localAnonKey);

    const { data: bucket, error } = await admin.storage.getBucket(BUCKET);
    if (error || !bucket) {
      throw new Error(`Expected configured ${BUCKET} bucket: ${error?.message ?? "not found"}`);
    }
  });

  afterAll(async () => {
    if (cleanupPaths.size > 0) {
      await admin.storage.from(BUCKET).remove([...cleanupPaths]);
    }
    if (alice?.id) await deleteTestUser(localUrl, localServiceKey, alice.id);
    if (bob?.id) await deleteTestUser(localUrl, localServiceKey, bob.id);
  });

  it("allows an authenticated user to upload and delete inside their own prefix", async () => {
    const path = `${alice.id}/snippets/${randomUUID()}/canonical.png`;
    cleanupPaths.add(path);

    const uploaded = await alice.client.storage
      .from(BUCKET)
      .upload(path, new Blob(["alice"], { type: "image/png" }));
    expect(uploaded.error).toBeNull();
    expect(await objectExists(admin, path)).toBe(true);

    const removed = await alice.client.storage.from(BUCKET).remove([path]);
    expect(removed.error).toBeNull();
    expect(await objectExists(admin, path)).toBe(false);
    cleanupPaths.delete(path);
  });

  it("rejects uploads into another user's prefix", async () => {
    const path = `${alice.id}/snippets/${randomUUID()}/canonical.png`;
    const uploaded = await bob.client.storage
      .from(BUCKET)
      .upload(path, new Blob(["bob"], { type: "image/png" }));

    expect(uploaded.error).not.toBeNull();
    expect(await objectExists(admin, path)).toBe(false);
  });

  it("does not let another authenticated user delete the owner's object", async () => {
    const path = `${alice.id}/snippets/${randomUUID()}/canonical.png`;
    cleanupPaths.add(path);
    const uploaded = await alice.client.storage
      .from(BUCKET)
      .upload(path, new Blob(["alice"], { type: "image/png" }));
    expect(uploaded.error).toBeNull();

    await bob.client.storage.from(BUCKET).remove([path]);
    expect(await objectExists(admin, path)).toBe(true);
  });

  it("rejects legacy unscoped upload paths", async () => {
    const path = `snippets/${randomUUID()}/canonical.png`;
    const uploaded = await alice.client.storage
      .from(BUCKET)
      .upload(path, new Blob(["legacy"], { type: "image/png" }));

    expect(uploaded.error).not.toBeNull();
    expect(await objectExists(admin, path)).toBe(false);
  });
});
