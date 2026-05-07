/**
 * Playwright auth setup — runs once per CI job (and locally when the saved
 * session expires).  Saves session cookies to e2e/.auth/user.json so
 * auth.test.ts can reuse them without OAuth.
 *
 * ⚠️  This setup MUST point at a non-production Supabase instance.
 *     Set E2E_SUPABASE_URL to the local instance URL (http://127.0.0.1:54321)
 *     or a dedicated CI project.  Never set it to the production URL.
 *
 * Required env vars (never use production values here):
 *   E2E_SUPABASE_URL           — local/CI Supabase URL, e.g. http://127.0.0.1:54321
 *   E2E_SUPABASE_ANON_KEY      — anon key for that instance
 *   E2E_SUPABASE_SERVICE_KEY   — service-role key for that instance
 *   E2E_TEST_SECRET            — secret shared with app/api/test/sign-in
 *   E2E_USER_EMAIL             — test user email (created if absent)
 *   E2E_USER_PASSWORD          — test user password
 */
import { test as setup } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, ".auth/user.json");

setup("create test user and authenticate", async ({ page }) => {
  const supabaseUrl = process.env.E2E_SUPABASE_URL;
  const serviceKey = process.env.E2E_SUPABASE_SERVICE_KEY;
  const anonKey = process.env.E2E_SUPABASE_ANON_KEY;
  const testSecret = process.env.E2E_TEST_SECRET;
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!supabaseUrl || !serviceKey || !anonKey || !testSecret || !email || !password) {
    throw new Error(
      "Missing E2E env vars. Set E2E_SUPABASE_URL, E2E_SUPABASE_ANON_KEY, " +
        "E2E_SUPABASE_SERVICE_KEY, E2E_TEST_SECRET, E2E_USER_EMAIL, E2E_USER_PASSWORD. " +
        "These must NOT point to production.",
    );
  }

  // Refuse to run against a supabase.co hostname — local/CI only
  if (supabaseUrl.includes("supabase.co")) {
    throw new Error("E2E_SUPABASE_URL must not point to a supabase.co (production) project.");
  }

  // 1. Ensure test user exists (idempotent — ignores 422 conflict)
  await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { user_name: "e2e-test", avatar_url: "" },
    }),
  });

  // 2. Smoke-check that password auth works
  const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Supabase sign-in failed: ${await tokenRes.text()}`);
  }

  // 3. Sign in through the app so @supabase/ssr sets the session cookies properly
  const signInRes = await page.request.post("/api/test/sign-in", {
    headers: { "x-e2e-secret": testSecret, "Content-Type": "application/json" },
    data: { email, password },
  });
  if (!signInRes.ok()) {
    throw new Error(`Test sign-in route returned ${signInRes.status()}: ${await signInRes.text()}`);
  }

  // 4. Save cookies for reuse in auth.test.ts
  await page.context().storageState({ path: AUTH_FILE });
});
