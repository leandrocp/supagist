/**
 * Authenticated E2E flows.
 * Requires a saved session at e2e/.auth/user.json — run auth.setup.ts first.
 */
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

// Tests about editing, deleting and reacting seed their snippet as a trusted
// admin, so they don't spend the shared user's 10-per-hour publish quota.
async function seedSnippet(code: string, filename: string) {
  const admin = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const owner = users.users.find((u) => u.email === process.env.E2E_USER_EMAIL);
  const shortId = randomUUID().replace(/-/g, "").slice(0, 6);
  const slug = filename.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const { error } = await admin.from("snippets").insert({
    short_id: shortId,
    slug,
    filename,
    code,
    language: "typescript",
    theme: "github_light",
    line_count: code.split("\n").length,
    code_char_count: code.length,
    author_id: owner!.id,
  });
  if (error) throw error;
  return `/${slug}-${shortId}`;
}

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

test("snippets never show trailing whitespace, published or already stored", async ({ page }) => {
  await page.goto("/");
  await page.locator("textarea").fill("SELECT 1;  \n\t\n\n");
  await page.getByRole("button", { name: /^publish$/i }).click();
  await page.waitForURL(/\/[a-z0-9-]+-[a-z0-9]{6}$/);
  await expect(page.getByText("1 lines", { exact: true }).first()).toBeVisible();

  // Rows stored before trimming keep their code; the page trims at display.
  await page.goto(await seedSnippet("const a = 1;\t\n\nconst b = 2;  \n\n  \n", "trailing.ts"));
  await expect(page.getByText("3 lines", { exact: true }).first()).toBeVisible();
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
  await page.goto(await seedSnippet("const unreact = 1;", "react.ts"));

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
  await page.goto(await seedSnippet("const failing = 1;", "react.ts"));

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

// ── Owner edit and delete ────────────────────────────────────────────────────

async function openSeeded(page: import("@playwright/test").Page, code: string, filename: string) {
  const path = await seedSnippet(code, filename);
  await page.goto(path);
  return path;
}

test("the owner edits a snippet from its page and the change persists", async ({ page }) => {
  const path = await openSeeded(page, "const before = 1;", "edit-me.ts");

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edit snippet" });
  await dialog.getByLabel("Title").fill("Edited title");
  await dialog.getByLabel("Code").fill("const after = 2;\nconsole.log(after);");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByRole("heading", { name: "Edited title" })).toBeVisible();
  await page.reload();
  expect(new URL(page.url()).pathname).toBe(path);
  await expect(page.getByRole("heading", { name: "Edited title" })).toBeVisible();
  await expect(page.getByText("const after")).toBeVisible();
  await expect(page.getByText("const before")).toHaveCount(0);
});

test("the owner deletes a snippet from its page; the link stops working", async ({ page }) => {
  const path = await openSeeded(page, "const doomed = 1;", "delete-me.ts");

  await page.getByRole("button", { name: "Delete", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Delete this snippet?" });
  await expect(dialog.getByText("delete-me.ts")).toBeVisible();
  await dialog.getByRole("button", { name: "Delete snippet" }).click();
  await page.waitForURL(/\/snippets$/);

  const response = await page.goto(path);
  expect(response?.status()).toBe(404);
});

test("the owner deletes a snippet from /snippets with confirmation", async ({ page }) => {
  const path = await openSeeded(page, "const listed = 1;", "list-delete.ts");
  await page.goto("/snippets");
  const card = page.locator("li", { has: page.locator(`a[href="${path}"]`) });
  await card.getByRole("button", { name: "Actions for list-delete.ts" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(card).toBeVisible();

  await card.getByRole("button", { name: "Actions for list-delete.ts" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete snippet" }).click();
  await expect(page.locator(`a[href="${path}"]`)).toHaveCount(0);
  await page.reload();
  await expect(page.locator(`a[href="${path}"]`)).toHaveCount(0);
});

test("visitors who do not own a snippet get no edit or delete controls", async ({
  page,
  browser,
}) => {
  const path = await openSeeded(page, "const mine = 1;", "not-yours.ts");
  await expect(page.getByRole("button", { name: "Edit", exact: true })).toBeVisible();

  const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const other = await visitor.newPage();
  await other.goto(path);
  await expect(other.getByText("const mine")).toBeVisible();
  await expect(other.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
  await expect(other.getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);
  await visitor.close();
});

test("a user deletes their account and all their data", async ({ browser }) => {
  // A throwaway identity: this must never delete the shared E2E user.
  const admin = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
  const username = `bye-${Date.now()}`;
  const email = `${username}@supagist.test`;
  const password = "Throwaway-Pass-123!";
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { user_name: username, avatar_url: "" },
  });
  expect(error).toBeNull();

  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  const signIn = await page.request.post("/api/test/sign-in", {
    headers: { "x-e2e-secret": process.env.E2E_TEST_SECRET!, "Content-Type": "application/json" },
    data: { email, password },
  });
  expect(signIn.ok()).toBe(true);
  // A real publish, so its stored files exist and go with the account.
  await page.goto("/");
  await page.locator("textarea").fill("const leaving = true;");
  await page.getByRole("button", { name: /^publish$/i }).click();
  await page.waitForURL(/\/[a-z0-9-]+-[a-z0-9]{6}$/);
  const path = new URL(page.url()).pathname;
  const { data: published } = await admin
    .from("snippets")
    .select("id")
    .eq("short_id", path.slice(-6))
    .single();
  const folder = `${created.user!.id}/snippets/${published!.id}`;
  const { data: stored } = await admin.storage.from("snippet-images").list(folder);
  expect(stored!.length).toBeGreaterThan(0);

  await page.getByRole("button", { name: `Account menu for ${username}` }).click();
  await page.getByRole("menuitem", { name: "Account" }).click();
  await page.waitForURL(/\/account$/);
  await page.getByRole("button", { name: "Delete account" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete your account?" });
  const confirm = dialog.getByRole("button", { name: "Delete my account" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(`Type ${username} to confirm`).fill(username);
  await confirm.click();
  await page.waitForURL((url) => url.pathname === "/");
  await expect(page.getByRole("link", { name: "Log in" }).first()).toBeVisible();

  expect((await page.goto(path))?.status()).toBe(404);
  const { data: gone } = await admin.auth.admin.getUserById(created.user!.id);
  expect(gone.user).toBeNull();
  const { count } = await admin
    .from("snippets")
    .select("*", { count: "exact", head: true })
    .eq("author_id", created.user!.id);
  expect(count).toBe(0);
  // Every stored file goes right away, including ones without a column (card.png).
  const { data: left } = await admin.storage.from("snippet-images").list(folder);
  expect(left).toEqual([]);
  await context.close();
});
