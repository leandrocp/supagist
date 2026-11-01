/**
 * Motion: publishing stamps the seal and still lands the snippet, with and
 * without reduced motion, and line reactions pop in and shrink away. Each test
 * signs in a fresh user so the publish rate limit never couples tests.
 */
import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { ensureAuthUser } from "./auth-user";

const CODE = "const greet = (name: string) => `hi ${name}`;\nconsole.log(greet('supagist'));";

async function signInFreshUser(page: Page) {
  const email = `motion-${randomUUID()}@supagist.test`;
  const password = `Motion-${randomUUID()}`;
  await ensureAuthUser(
    process.env.E2E_SUPABASE_URL!,
    process.env.E2E_SUPABASE_SERVICE_KEY!,
    email,
    password,
  );
  const res = await page.request.post("/api/test/sign-in", {
    headers: { "x-e2e-secret": process.env.E2E_TEST_SECRET! },
    data: { email, password },
  });
  expect(res.ok()).toBe(true);
}

/** Compose, publish, and return the published snippet's row. */
async function publish(page: Page) {
  await page.goto("/");
  await page.locator("textarea").fill(CODE);
  await page.getByLabel("Filename").fill("greet.ts");
  await page.getByRole("button", { name: /^publish$/i }).click();
  await page.waitForURL(/\/[a-z0-9-]+-[a-z0-9]{6}$/, { timeout: 60_000 });
  const shortId = new URL(page.url()).pathname.split("-").pop()!;
  const admin = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await admin
    .from("snippets")
    .select("code, visibility")
    .eq("short_id", shortId)
    .single();
  expect(error).toBeNull();
  return data!;
}

/** Names of the CSS animations running on the page right now. */
function runningAnimations(page: Page) {
  return page.evaluate(() =>
    document
      .getAnimations()
      .map((a) =>
        a instanceof CSSAnimation
          ? a.animationName
          : a instanceof CSSTransition
            ? "css-transition"
            : "web-animation",
      ),
  );
}

test("publishing stamps the wax seal on the card, then reveals the link", async ({ page }) => {
  await signInFreshUser(page);
  const row = await publish(page);
  expect(row).toEqual({ code: CODE, visibility: "public" });

  const stamp = page.getByTestId("publish-stamp");
  await expect(stamp).toBeVisible();
  await expect(stamp).toHaveAttribute("data-variant", "public");
  await expect(stamp).toHaveAttribute("data-motion", "full");
  // Pressed onto the card: it lives inside the snippet card or its canvas.
  expect(
    await stamp.evaluate(
      (el) => !!el.closest('[data-testid="snippet-canvas"], [data-testid="snippet-card"]'),
    ),
  ).toBe(true);
  expect(await runningAnimations(page)).toContain("stamp-press");

  const link = page.getByTestId("publish-link");
  await expect(link).toBeVisible();
  await expect(link.getByRole("link")).toHaveAttribute("href", page.url());

  // The stamp never blocks the card: its controls stay clickable underneath.
  await expect(stamp).toHaveCSS("pointer-events", "none");

  // It plays once; a reload is an ordinary visit.
  await page.reload();
  await expect(page.getByTestId("snippet-card")).toBeVisible();
  await expect(page.getByTestId("publish-stamp")).toHaveCount(0);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("publishing still works and the stamp only fades", async ({ page }) => {
    await signInFreshUser(page);
    const row = await publish(page);
    expect(row.code).toBe(CODE);

    const stamp = page.getByTestId("publish-stamp");
    await expect(stamp).toHaveAttribute("data-motion", "reduced");
    await expect(page.getByTestId("publish-link")).toBeVisible();
    // Fades only: no press, ink spread or card shake.
    expect(
      await stamp.locator(".stamp-press").evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("fade-in, fade-out");
    const running = await runningAnimations(page);
    expect(running).not.toContain("stamp-press");
    expect(running).not.toContain("stamp-ink");
    expect(running).not.toContain("web-animation");
  });
});

test("a line reaction pops in, then shrinks away when taken back", async ({ page }) => {
  await signInFreshUser(page);
  await publish(page);
  await page.reload();

  const line = page.locator('[data-line="1"]');
  await line.hover();
  await line.getByRole("button", { name: "Add a reaction" }).click();
  await page.getByRole("button", { name: "🔥" }).click();

  const chip = line.locator('[data-chip-emoji="🔥"]');
  await expect(chip).toHaveAttribute("data-chip-pop", "1");
  await expect(chip).toHaveAttribute("data-chip-mine", "1");
  // The pop marker clears so later re-renders don't replay it.
  await expect(chip).not.toHaveAttribute("data-chip-pop", "1");

  await chip.click();
  await expect(chip).toHaveCount(0);
});

test("deleting from the list plays the exit, then the snippet is gone", async ({ page }) => {
  await signInFreshUser(page);
  await publish(page);
  await page.goto("/");
  await page.locator("textarea").fill(`${CODE}\n// keep`);
  await page.getByLabel("Filename").fill("keep.ts");
  await page.getByRole("button", { name: /^publish$/i }).click();
  await page.waitForURL(/\/keep-ts-[a-z0-9]{6}$/, { timeout: 60_000 });

  await page.goto("/snippets");
  const cards = page.locator("[data-snippet-card]");
  await expect(cards).toHaveCount(2);
  await page.getByRole("button", { name: "Actions for greet.ts" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete snippet" }).click();

  // The card stays for its exit, then the refreshed list drops it.
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("keep.ts");
  await expect(page.getByText("Snippet deleted.")).toBeVisible();
});
