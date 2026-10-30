import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

/** Provision the configured identity without resetting an existing user's data. */
export async function ensureAuthUser(
  url: string,
  serviceKey: string,
  email: string,
  password: string,
): Promise<void> {
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Include the domain: different test identities may share an email local part.
  const username = `e2e-${createHash("sha256").update(email.trim().toLowerCase()).digest("hex")}`;
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { user_name: username, avatar_url: "" },
  });
  // A duplicate email is safe to reuse; password auth still verifies credentials.
  // Other failures (including profile constraints and other 422s) must stop setup.
  if (error && error.code !== "email_exists") {
    throw new Error(`Supabase test user creation failed: ${error.message}`, { cause: error });
  }
}
