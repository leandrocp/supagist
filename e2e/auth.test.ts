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
  const keyword = page.getByText("const", { exact: true });
  await expect(keyword).toHaveCSS("color", "rgb(207, 34, 46)");

  // Publish button
  await page.getByRole("button", { name: /^publish$/i }).click();

  // Should redirect to the new snippet page
  await page.waitForURL(/\/[a-z0-9-]+-[a-z0-9]{6}$/);
  await expect(page.getByRole("heading", { name: "hello.ts" })).toBeVisible();
  await expect(page.getByText("const hello")).toBeVisible();
  await expect(keyword).toHaveCSS("color", "rgb(207, 34, 46)");

  // A full reload must keep native server highlighting, including its color.
  await page.reload();
  await expect(keyword).toHaveCSS("color", "rgb(207, 34, 46)");
});

test("published snippet page shows the code", async ({ page }) => {
  await page.goto("/");

  const editor = page.locator("textarea");
  await editor.fill("SELECT id FROM users;");
  await page.getByRole("button", { name: /^publish$/i }).click();
  await page.waitForURL(/\/[a-z0-9-]+-[a-z0-9]{6}$/);

  await expect(page.getByText("SELECT id FROM users;")).toBeVisible();
});

test("authenticated user can add a reaction to a line", async ({ page }) => {
  // Navigate to an existing snippet (requires a known snippet URL in the DB)
  // For now this test verifies the reaction UI is present and interactive
  await page.goto("/");
  const editor = page.locator("textarea");
  await editor.fill("const x = 1;");
  await page.getByRole("button", { name: /^publish$/i }).click();
  await page.waitForURL(/\/[a-z0-9-]+-[a-z0-9]{6}$/);

  // Hover over the first line to reveal the reaction button
  const gutterLine = page.locator(".group\\/gutterline").first();
  await gutterLine.hover();

  // The emoji picker trigger should appear
  const smileButton = gutterLine.locator("button").first();
  await expect(smileButton).toBeVisible();
  await smileButton.click();

  // Persist a reaction and verify the authoritative row appears in the UI.
  const fireOption = page.getByRole("button", { name: "🔥" });
  await expect(fireOption).toBeVisible();
  await fireOption.click();
  await expect(page.getByRole("button", { name: /reacted with 🔥/i })).toBeVisible();
});

test("saved view window toolbar fits an iPhone SE viewport", async ({ page }) => {
  await page.goto("/");
  await page.locator("textarea").fill("const fits = true;");
  await page.getByRole("button", { name: /^publish$/i }).click();
  await page.waitForURL(/\/[a-z0-9-]+-[a-z0-9]{6}$/);

  await page.setViewportSize({ width: 375, height: 812 });
  const share = page.getByRole("button", { name: "Copy link" });
  const card = share.locator("xpath=ancestor::div[contains(@class,'overflow-hidden')][1]");
  const [shareBox, cardBox] = await Promise.all([share.boundingBox(), card.boundingBox()]);
  expect(shareBox!.x + shareBox!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width);
});
