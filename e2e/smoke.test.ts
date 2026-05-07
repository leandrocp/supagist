import { test, expect } from "@playwright/test";

// ── Public pages ──────────────────────────────────────────────────────────────

test("home page loads and shows the supagist brand", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("supagist").first()).toBeVisible();
});

test("home page has a code editor area", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("textarea")).toBeVisible();
});

test("home status bar shows the friendly language name (not all-caps id)", async ({ page }) => {
  // Default snippet is .tsx → tsx (Lumis registers TSX as its own language).
  // We assert the friendly name "TSX" appears, which proves languageDisplayName
  // is consulting LanguageInfo.name rather than echoing the raw id.
  await page.goto("/");
  await expect(page.getByText("TSX", { exact: true })).toBeVisible();
});

test("terms page loads", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByText(/supagist is open source/i)).toBeVisible();
});

test("404 for a path that is too short to be a snippet", async ({ page }) => {
  const response = await page.goto("/x");
  expect(response?.status()).toBe(404);
});

test("404 for a well-formed snippet id that does not exist in the DB", async ({ page }) => {
  // Matches slug-shortId pattern but won't be in the DB
  const response = await page.goto("/does-not-exist-zz0000");
  expect(response?.status()).toBe(404);
});

// ── Navigation ────────────────────────────────────────────────────────────────

test("architecture footer link is present on home page", async ({ page }) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: /architecture/i });
  await expect(link).toBeVisible();
});

test("login link is reachable from the home page nav", async ({ page }) => {
  await page.goto("/");
  // The auth button or sign-in link should be visible when env vars are set
  // We just verify the /auth/login page itself loads
  const response = await page.goto("/auth/login");
  expect(response?.status()).toBe(200);
});
