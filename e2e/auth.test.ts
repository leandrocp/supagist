/**
 * Authenticated E2E flows.
 * Requires a saved session at e2e/.auth/user.json — run auth.setup.ts first.
 */
import { test, expect } from "@playwright/test";

// ── Snippet creation golden path ──────────────────────────────────────────────

test("authenticated user can publish a snippet", async ({ page }) => {
  await page.goto("/");

  const editor = page.locator("textarea");
  await editor.fill("const hello = 'world';\nconsole.log(hello);");

  // Set a filename (aria-label="Filename", placeholder="snippet.tsx")
  const filenameInput = page.getByLabel("Filename");
  await filenameInput.fill("hello.ts");

  // Save button
  await page.getByRole("button", { name: /^save$/i }).click();

  // Should redirect to the new snippet page
  await page.waitForURL(/\/[a-z0-9-]+-[a-z0-9]{6}$/);
  await expect(page.getByRole("heading", { name: "hello.ts" })).toBeVisible();
  await expect(page.getByText("const hello")).toBeVisible();
});

test("published snippet page shows the code", async ({ page }) => {
  await page.goto("/");

  const editor = page.locator("textarea");
  await editor.fill("SELECT id FROM users;");
  await page.getByRole("button", { name: /^save$/i }).click();
  await page.waitForURL(/\/[a-z0-9-]+-[a-z0-9]{6}$/);

  await expect(page.getByText("SELECT id FROM users;")).toBeVisible();
});

test("authenticated user can add a reaction to a line", async ({ page }) => {
  // Navigate to an existing snippet (requires a known snippet URL in the DB)
  // For now this test verifies the reaction UI is present and interactive
  await page.goto("/");
  const editor = page.locator("textarea");
  await editor.fill("const x = 1;");
  await page.getByRole("button", { name: /^save$/i }).click();
  await page.waitForURL(/\/[a-z0-9-]+-[a-z0-9]{6}$/);

  // Hover over the first line to reveal the reaction button
  const gutterLine = page.locator(".group\\/gutterline").first();
  await gutterLine.hover();

  // The emoji picker trigger should appear
  const smileButton = gutterLine.locator("button").first();
  await expect(smileButton).toBeVisible();
  await smileButton.click();

  // Emoji picker should open
  await expect(page.getByText("🔥")).toBeVisible();
});
