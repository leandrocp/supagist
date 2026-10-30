import { test, expect } from "@playwright/test";

test("OAuth consent preserves the authorization request through sign-in", async ({ page }) => {
  await page.goto("/oauth/consent?authorization_id=71b87b4a-b933-4ef9-bd4e-a7c73cdb711b");
  await expect(page).toHaveURL(/\/auth\/login\?next=/);
  expect(new URL(page.url()).searchParams.get("next")).toBe(
    "/oauth/consent?authorization_id=71b87b4a-b933-4ef9-bd4e-a7c73cdb711b",
  );
  await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible();
});

test("OAuth consent without an authorization request cannot approve anything", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/oauth/consent");
  await expect(page.getByRole("alert")).toContainText("Missing authorization request");
  await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
