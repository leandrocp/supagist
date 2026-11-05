import { test, expect } from "@playwright/test";
import githubLight from "@lumis-sh/themes/github_light";

// ── Public pages ──────────────────────────────────────────────────────────────

test("home page loads and shows the supagist brand", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("supagist").first()).toBeVisible();
});

test("agent skill stays discoverable and reachable across viewport sizes", async ({ page }) => {
  // site/v1: a strip above the nav from md up, and the hero's secondary
  // action at every width.
  await page.goto("/");
  const strip = page.getByRole("complementary", { name: "Supagist agent skill" });
  const link = page.getByRole("link", { name: /agent skill/i });
  await expect(link).toHaveAttribute("href", "/agents");
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 812 });
    if (width < 768) await expect(strip).toBeHidden();
    else await expect(strip.getByRole("link", { name: /get the skill/i })).toBeInViewport();
    await expect(link).toBeInViewport();
    const box = (await link.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await link.click({ trial: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  }
  await link.focus();
  await expect(link).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/agents$/);
  await expect(page.getByRole("heading", { name: "Install the skill" })).toBeVisible();
  await expect(page.getByText("npx skills add leandrocp/supagist --skill supagist")).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
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
  // The table of contents repeats the clause title, so ask for the heading.
  await expect(page.getByRole("heading", { name: /supagist is open source/i })).toBeVisible();
});

test("privacy and data help pages load", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  await page.goto("/help/data");
  await expect(page.getByRole("heading", { name: "Managing your data" })).toBeVisible();
});

test("Google Connected Apps verification path 404s until a token is committed", async ({
  request,
}) => {
  const response = await request.get("/.well-known/google-connected-apps", { maxRedirects: 0 });
  expect(response.status()).toBe(404);
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

test("home page has exactly one header bar", async ({ page }) => {
  await page.goto("/");

  const nav = page.getByTestId("app-nav");
  await expect(nav).toBeVisible();
  await expect(page.locator("nav")).toHaveCount(1);

  // Brand and account controls share the single row.
  await expect(nav.getByRole("img", { name: "Supagist" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Log in", exact: true })).toBeVisible();
});

test("lobby presence leaves navigation readable on mobile and remains visible above sm", async ({
  browser,
  baseURL,
}) => {
  // Production CSP allows hosted Supabase, not the local HTTP/WebSocket stack.
  // Bypass it only for this layout test; keep the app's security policy unchanged.
  const context = await browser.newContext({ baseURL, bypassCSP: true });
  try {
    const page = await context.newPage();
    const otherVisitor = await context.newPage();
    await page.goto("/");
    await otherVisitor.goto("/");

    const nav = page.getByTestId("app-nav");
    const presence = nav.getByTestId("home-presence");
    // Exercise real populated presence, not the empty state before Realtime syncs.
    await expect
      .poll(() => presence.locator('[data-slot="avatar"]').count())
      .toBeGreaterThanOrEqual(2);

    for (const width of [375, 639, 640, 768, 1280]) {
      await page.setViewportSize({ width, height: 812 });
      if (width < 640) await expect(presence).toBeHidden();
      else await expect(presence).toBeVisible();

      const login = nav.getByRole("link", { name: "Log in", exact: true });
      await expect(login).toBeVisible();
      const accountBox = (await nav.locator(":scope > div").last().boundingBox())!;
      expect(accountBox.x + accountBox.width).toBeLessThanOrEqual(width);

      if (width < 768) {
        // Below md the destinations live in the menu (site/v1 mobile nav).
        const menu = nav.getByRole("button", { name: "Menu" });
        await menu.click();
        const item = page.getByRole("menuitem", { name: "Snippets", exact: true });
        await expect(item).toBeInViewport();
        await page.keyboard.press("Escape");
        continue;
      }
      const snippets = nav.getByRole("link", { name: "Snippets", exact: true });
      await expect(snippets).toBeVisible();
      const snippetsBox = (await snippets.boundingBox())!;
      expect(snippetsBox.x + snippetsBox.width).toBeLessThanOrEqual(accountBox.x);
      // Visibility alone does not detect another element covering the link.
      // Mid-height: the pill's rounded corners are outside its hit area.
      await snippets.click({
        trial: true,
        position: { x: snippetsBox.width - 1, y: snippetsBox.height / 2 },
      });
    }
  } finally {
    await context.close();
  }
});

test("home page footer divider spans the same width as the nav", async ({ page }) => {
  await page.goto("/");

  const nav = await page.getByTestId("app-nav").boundingBox();
  const footer = await page.getByTestId("site-footer").boundingBox();

  // Both are full-bleed on the home page; a footer confined to the centred
  // column left the divider visibly stopping short at both ends.
  expect(Math.abs((footer?.x ?? 0) - (nav?.x ?? 0))).toBeLessThan(2);
  expect(Math.abs((footer?.width ?? 0) - (nav?.width ?? 0))).toBeLessThan(2);
});

test("snippets listing is reachable from the nav, not buried on the home page", async ({
  page,
}) => {
  await page.goto("/");

  // The list used to sit below a viewport-height composer where nobody saw it.
  await expect(page.getByRole("heading", { name: "Your snippets" })).toHaveCount(0);

  await page.getByRole("link", { name: "Snippets" }).click();
  await page.waitForURL("**/snippets");
  await expect(page.getByRole("heading", { name: "Your snippets" })).toBeVisible();
  await expect(page.getByTestId("app-nav")).toBeVisible();
});

test("composer remains usable at 375px with a stable overlay selector", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  const shell = page.getByTestId("composer-shell");
  const preview = page.getByTestId("preview-pane");
  const workspace = page.getByTestId("composer-workspace");
  const actions = page.getByTestId("composer-actions");
  await expect(shell).toBeVisible();
  await expect(preview).toBeVisible();
  await expect(workspace).toBeVisible();
  await expect(actions).toBeVisible();

  const before = await workspace.boundingBox();
  await page.getByRole("button", { name: "Theme", exact: true }).click();
  await expect(page.getByRole("option").first()).toBeVisible();
  const after = await workspace.boundingBox();
  expect(after?.x).toBe(before?.x);
  expect(after?.width).toBe(before?.width);
  await page.keyboard.press("Escape");

  const viewport = page
    .getByTestId("customization-scroll")
    .locator("[data-radix-scroll-area-viewport]");
  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(actions.getByRole("button", { name: /publish/i })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  expect(hasHorizontalOverflow).toBe(false);
});

test("font-mono text renders in the monospace font, not the inherited sans", async ({ page }) => {
  // next/font defines the mono family variable on <body>; resolving --font-mono
  // on :root made every font-mono element (the saved view's code included)
  // fall back to Geist.
  await page.goto("/");
  const fontFamily = await page
    .getByText(/^\d+ lines?$/)
    .first()
    .evaluate((element) => getComputedStyle(element).fontFamily);
  expect(fontFamily).toContain("IBM Plex Mono");
});

// Real browser WASM loading, including a language outside the former manual map.
for (const width of [375, 768, 1280]) {
  test(`Lumis highlights and exports Python at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const wasmRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.endsWith(".wasm")) wasmRequests.push(request.url());
    });
    await page.goto("/");
    await page.getByLabel("Filename", { exact: true }).fill("hello.py");
    const code = 'def greet():\n    return "🔥 <hello>"\n';
    await page.getByLabel("Code", { exact: true }).fill(code);

    const keyword = page.getByTestId("source-line-1").locator("span").filter({ hasText: /^def$/ });
    await expect(keyword).toHaveCSS("color", "rgb(207, 34, 46)");
    await expect(page.getByTestId("source-line-2")).toHaveText('    return "🔥 <hello>"');
    await expect(page.getByText(/Could not load/)).toHaveCount(0);
    expect(wasmRequests.length).toBeGreaterThan(0);
    expect(wasmRequests.every((url) => new URL(url).origin === new URL(page.url()).origin)).toBe(
      true,
    );

    await page.getByRole("button", { name: "Export", exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "SVG image", exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("hello.svg");
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    const svg = Buffer.concat(chunks).toString("utf8");
    expect(svg).toContain(`<tspan fill="${githubLight.highlights.keyword.fg}">def</tspan>`);
    expect(svg).toContain("🔥 &lt;hello&gt;");
    expect(svg).not.toContain("<hello>");
    await expect(page.getByRole("button", { name: "SVG image", exact: true })).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: test.info().outputPath(`lumis-${width}.png`) });
  });
}

test("Copy as rich text puts highlighted, editable HTML and plain text on the clipboard", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByLabel("Filename", { exact: true }).fill("hello.py");
  const code = 'def greet():\n    return "<hello>"\n\nprint(greet())';
  await page.getByLabel("Code", { exact: true }).fill(code);
  await expect(
    page.getByTestId("source-line-1").locator("span").filter({ hasText: /^def$/ }),
  ).toHaveCSS("color", "rgb(207, 34, 46)");

  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("button", { name: "Copy as rich text", exact: true }).click();
  await expect(page.getByText("Copied as rich text")).toBeVisible();

  const clipboard = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    return {
      types: item!.types,
      html: await (await item!.getType("text/html")).text(),
      text: await (await item!.getType("text/plain")).text(),
    };
  });
  expect(clipboard.types).toEqual(expect.arrayContaining(["text/html", "text/plain"]));
  expect(clipboard.text).toBe(code);
  expect(clipboard.html).not.toContain("<svg");
  expect(clipboard.html).not.toContain("<img");

  // Paste into a contenteditable the way Slides or Docs receive it: the
  // result must be text the user can edit, still coloured by the theme.
  const pasted = await page.evaluate((html) => {
    const target = document.createElement("div");
    target.contentEditable = "true";
    document.body.append(target);
    target.focus();
    document.execCommand("insertHTML", false, html);
    const keyword = Array.from(target.querySelectorAll("span")).find(
      (span) => span.textContent === "def",
    );
    const result = {
      text: target.innerText,
      keywordColor: keyword ? getComputedStyle(keyword).color : null,
      background: getComputedStyle(target.querySelector("div[style]")!).backgroundColor,
    };
    target.remove();
    return result;
  }, clipboard.html);
  expect(pasted.text.replace(/\n+/g, "\n").trim()).toBe(code.replace(/\n+/g, "\n"));
  expect(pasted.keywordColor).toBe("rgb(207, 34, 46)");
  expect(pasted.background).toBe("rgb(255, 255, 255)");
});

test("Copy as rich text stops at the same 30 lines as the image", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByLabel("Filename", { exact: true }).fill("lines.py");
  const lines = Array.from({ length: 35 }, (_, i) => `x${i + 1} = ${i + 1}`);
  await page.getByLabel("Code", { exact: true }).fill(lines.join("\n"));
  await expect(page.getByTestId("source-line-35")).toHaveText("x35 = 35");

  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("button", { name: "Copy as rich text", exact: true }).click();
  await expect(page.getByText("Copied as rich text")).toBeVisible();

  const clipboard = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    return {
      html: await (await item!.getType("text/html")).text(),
      text: await (await item!.getType("text/plain")).text(),
    };
  });
  expect(clipboard.text).toBe(lines.slice(0, 30).join("\n"));
  expect(clipboard.html).toContain(">30<");
  expect(clipboard.html).not.toContain("x31");
  expect(clipboard.html).toContain("<div>…</div>");
});
