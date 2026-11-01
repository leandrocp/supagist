/**
 * Authenticated E2E flows.
 * Requires a saved session at e2e/.auth/user.json — run auth.setup.ts first.
 */
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

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

for (const font of [
  {
    id: "system",
    label: "System",
    family: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
  { id: "jetbrains", label: "JetBrains Mono", family: '"JetBrains Mono"' },
]) {
  test(`published snippets retain ${font.label} in the saved view and export`, async ({ page }) => {
    await page.goto("/");
    await page.locator("textarea").fill("const font = 'saved';\nconsole.log(font);");
    await page.getByLabel("Filename").fill("font.ts");
    await page.getByRole("button", { name: "Advanced settings" }).click();
    await page.getByRole("combobox", { name: "Font", exact: true }).click();
    await page.getByRole("option", { name: font.label, exact: true }).click();
    await expect(page.locator("textarea")).toHaveCSS("font-family", font.family);

    await page.getByRole("button", { name: /^publish$/i }).click();
    await page.waitForURL(/\/[a-z0-9-]+-[a-z0-9]{6}$/);
    await page.reload();
    const code = page.getByText("const", { exact: true });
    await expect(code).toHaveCSS("font-family", font.family);

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(code).toHaveCSS("font-family", font.family);
    await expect(code).toBeVisible();
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await expect(page.locator('select:has(option[value="jetbrains"])')).toHaveValue(font.id);
  });
}

test("published snippet page shows the code", async ({ page }) => {
  await page.goto("/");

  const editor = page.locator("textarea");
  await editor.fill("SELECT id FROM users;");
  await page.getByRole("button", { name: /^publish$/i }).click();
  await page.waitForURL(/\/[a-z0-9-]+-[a-z0-9]{6}$/);

  await expect(page.getByText("SELECT id FROM users;")).toBeVisible();
});

test("web publishes stay public; unlisted snippets show the indicator and noindex", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("textarea").fill("const unlisted = true;");
  await page.getByLabel("Filename").fill("unlisted.ts");
  await page.getByRole("button", { name: /^publish$/i }).click();
  await page.waitForURL(/\/[a-z0-9-]+-[a-z0-9]{6}$/);
  const robots = page.locator('meta[name="robots"]');
  await expect(page.getByRole("heading", { name: "unlisted.ts" })).toBeVisible();
  await expect(robots).toHaveCount(0);
  await expect(page.getByText("Unlisted", { exact: true })).toHaveCount(0);

  // Visibility has no client write path yet; flip it as a trusted admin.
  const shortId = new URL(page.url()).pathname.split("-").pop()!;
  const admin = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
  const { error } = await admin
    .from("snippets")
    .update({ visibility: "unlisted" })
    .eq("short_id", shortId);
  expect(error).toBeNull();

  await page.reload();
  await expect(page.getByText("Unlisted", { exact: true })).toBeVisible();
  await expect(robots).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByText("const unlisted")).toBeVisible();

  // The owner still finds it under /snippets.
  await page.goto("/snippets");
  await expect(page.locator(`a[href$="-${shortId}"]`).first()).toBeVisible();
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

test("removing a line reaction persists across a reload", async ({ page }) => {
  await page.goto("/");
  await page.locator("textarea").fill("const unreact = 1;");
  await page.getByRole("button", { name: /^publish$/i }).click();
  await page.waitForURL(/\/[a-z0-9-]+-[a-z0-9]{6}$/);

  const gutterLine = page.locator(".group\\/gutterline").first();
  const reacted = page.getByRole("button", { name: /reacted with 🔥/i });
  await gutterLine.hover();
  await gutterLine.getByRole("button", { name: "Add a reaction" }).click();
  await page.getByRole("button", { name: "🔥" }).click();
  await expect(reacted).toBeVisible();

  await page.reload();
  await expect(reacted).toBeVisible();
  await gutterLine.hover();
  await gutterLine.getByRole("button", { name: "Add a reaction" }).click();
  await page.getByRole("button", { name: "Remove reaction" }).click();
  await expect(reacted).toHaveCount(0);

  await page.reload();
  await expect(page.getByText("const unreact")).toBeVisible();
  await expect(reacted).toHaveCount(0);
});

test("a failed reaction removal says so and keeps the reaction", async ({ page }) => {
  await page.goto("/");
  await page.locator("textarea").fill("const failing = 1;");
  await page.getByRole("button", { name: /^publish$/i }).click();
  await page.waitForURL(/\/[a-z0-9-]+-[a-z0-9]{6}$/);

  const gutterLine = page.locator(".group\\/gutterline").first();
  const reacted = page.getByRole("button", { name: /reacted with 🔥/i });
  await gutterLine.hover();
  await gutterLine.getByRole("button", { name: "Add a reaction" }).click();
  await page.getByRole("button", { name: "🔥" }).click();
  await expect(reacted).toBeVisible();

  await page.route("**/rest/v1/snippet_line_reactions*", (route) =>
    route.request().method() === "DELETE"
      ? route.fulfill({ status: 500, contentType: "application/json", body: '{"message":"x"}' })
      : route.fallback(),
  );
  await gutterLine.hover();
  await gutterLine.getByRole("button", { name: "Add a reaction" }).click();
  await page.getByRole("button", { name: "Remove reaction" }).click();
  await expect(page.getByText("Could not remove your reaction. Please try again.")).toBeVisible();
  await expect(reacted).toBeVisible();
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
