/**
 * Publish fidelity: a published snippet must look the way it was composed.
 *
 * For every brand preset, a set of option combinations and the UI controls,
 * these tests compose a snippet, publish it and compare the composer preview
 * with the saved view (canvas, card, header, token colours), and the
 * composer's PNG export with the published canonical.png and with the saved
 * view's export. Each test signs in a fresh user so the publish rate limit
 * never couples tests.
 */
import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { BRAND_PRESETS } from "@/lib/brand-presets";
import { DEFAULT_FOOTER_SETTINGS, DEFAULT_HEADER_SETTINGS } from "@/lib/export-metadata";
import { ensureAuthUser } from "./auth-user";

const CODE = "const greet = (name: string) => `hi ${name}`;\nconsole.log(greet('supagist'));";
const DRAFT_KEY = "supagist:draft:v1";

function admin() {
  return createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
}

async function signInFreshUser(page: Page) {
  const email = `fidelity-${randomUUID()}@supagist.test`;
  const password = `Fidelity-${randomUUID()}`;
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

/** What a viewer sees: the canvas, the card and its header, and token colours. */
async function look(page: Page) {
  const keyword = page.locator('[data-testid="snippet-card"] span', { hasText: /^const$/ }).first();
  // The composer highlights after its WASM loads; wait for the theme colour.
  await expect(keyword).toHaveAttribute("style", /color/);
  // The composer canvas transitions its padding; measure where it settles.
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((animation) => animation.finished)),
  );
  return page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('[data-testid="snippet-card"]')!;
    const canvas = document.querySelector<HTMLElement>('[data-testid="snippet-canvas"]');
    const style = (el: Element) => getComputedStyle(el);
    const token = (text: string) => {
      const span = [...card.querySelectorAll("span")].find((s) => s.textContent === text);
      return span
        ? { color: style(span).color, fontSize: style(span).fontSize, ligatures: null }
        : null;
    };
    const header = card.querySelector('[data-testid$="-window-header"]');
    return {
      canvas: canvas
        ? {
            background: canvas.dataset.background,
            image: style(canvas).backgroundImage,
            padding: style(canvas).paddingTop,
            radius: style(canvas).borderTopLeftRadius,
            layers: Boolean(canvas.querySelector('[data-testid="preview-brand-layers"]')),
            guide:
              canvas
                .querySelector<HTMLElement>('[data-testid="preview-brand-decoration"]')
                ?.getAttribute("data-scene-guide") ?? null,
          }
        : null,
      card: {
        fill: style(card).backgroundColor,
        radius: style(card).borderTopLeftRadius,
        shadow: style(card).boxShadow,
        font: style(card).fontFamily,
        ligatures: style(card).fontVariantLigatures,
      },
      header: header
        ? {
            kind: header.getAttribute("data-testid"),
            fill: style(header).backgroundColor,
            text: header.textContent?.replace(/Copy|Rich text|Export|Share/g, "").trim(),
          }
        : null,
      tokens: { const: token("const"), greet: token("greet"), log: token("log") },
    };
  });
}

/**
 * The image itself: size plus a digest of the IHDR and IDAT chunks. Text
 * chunks (the source link) differ between exports of the same picture; the
 * same browser encodes the same pixels to the same image data.
 */
function pixels(png: Buffer) {
  const hash = createHash("sha256");
  let width = 0;
  let height = 0;
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
    }
    if (type === "IHDR" || type === "IDAT") hash.update(data);
    offset += 12 + length;
  }
  return { width, height, sha256: hash.digest("hex") };
}

async function download(page: Page, action: () => Promise<void>) {
  const [file] = await Promise.all([page.waitForEvent("download"), action()]);
  return readFile((await file.path())!);
}

async function composerPng(page: Page) {
  return download(page, async () => {
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await page.getByRole("button", { name: "PNG image" }).click();
  });
}

async function savedViewPng(page: Page) {
  const png = await download(page, async () => {
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await page.getByRole("button", { name: "Save as PNG" }).click();
  });
  await page.keyboard.press("Escape");
  return png;
}

async function publish(page: Page) {
  await page.getByRole("button", { name: /^publish$/i }).click();
  await page.waitForURL(/\/[a-z0-9-]+-[a-z0-9]{6}$/, { timeout: 60_000 });
  const shortId = new URL(page.url()).pathname.split("-").pop()!;
  const { data, error } = await admin()
    .from("snippets")
    .select("theme, font_id, language, appearance, canonical_image_path")
    .eq("short_id", shortId)
    .single();
  expect(error).toBeNull();
  return data!;
}

async function publishedPng(path: string) {
  const { data, error } = await admin().storage.from("snippet-images").download(path);
  expect(error).toBeNull();
  return Buffer.from(await data!.arrayBuffer());
}

/**
 * Composes, publishes and checks that the saved view, the published PNG and
 * the saved view's export all match the composition. Returns the stored row.
 */
async function expectPublishedAsComposed(page: Page) {
  const composed = await look(page);
  const composedPng = pixels(await composerPng(page));

  const row = await publish(page);
  await expect(page.getByTestId("snippet-card")).toBeVisible();
  expect(await look(page), "saved view matches the composer preview").toEqual(composed);
  expect(
    pixels(await publishedPng(row.canonical_image_path)),
    "published canonical.png matches Save as PNG",
  ).toEqual(composedPng);
  expect(pixels(await savedViewPng(page)), "the saved view exports the composed image").toEqual(
    composedPng,
  );
  return { row, composed };
}

test.beforeEach(async ({ page }) => {
  // Rendering 4× PNGs of 16:9 brand canvases three times takes a while.
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signInFreshUser(page);
});

// ── Every brand ───────────────────────────────────────────────────────────────

for (const preset of BRAND_PRESETS) {
  test(`brand ${preset.name}: the published snippet looks the way it was composed`, async ({
    page,
  }) => {
    await page.goto("/compose");
    await page.locator("textarea").fill(CODE);
    await page.getByLabel("Filename").fill("greet.ts");
    await page.getByRole("button", { name: "Brand", exact: true }).click();
    await page.getByPlaceholder("Search brands…").fill(preset.name);
    await page.getByRole("option", { name: preset.name, exact: true }).click();
    await expect(page.getByTestId("snippet-canvas")).toHaveAttribute(
      "data-background",
      preset.background.label,
    );
    // 2× keeps three full-size PNG renders per test within CI memory.
    await page.getByRole("combobox", { name: "Scale", exact: true }).click();
    await page.getByRole("option", { name: "2x", exact: true }).click();

    const { row, composed } = await expectPublishedAsComposed(page);

    expect(composed.canvas?.background).toBe(preset.background.label);
    expect(row.theme).toBe(preset.settings.theme);
    expect(row.font_id).toBe(preset.settings.fontId);
    const settings: { aspectRatio?: "16:9" | null; ligatures?: boolean } = preset.settings;
    expect(row.appearance).toMatchObject({
      background: preset.background.label,
      outerPadding: preset.settings.outerPadding,
      innerPadding: preset.settings.innerPadding,
      cornerRadius: preset.settings.cornerRadius,
      lineNumbers: preset.settings.lineNumbers,
      header: preset.settings.header,
      footer: preset.settings.footer,
      windowDecoration: preset.settings.windowDecoration,
      aspectRatio: settings.aspectRatio ?? null,
      ligatures: settings.ligatures ?? true,
    });
  });
}

// ── Option combinations ───────────────────────────────────────────────────────

type DraftOptions = Record<string, unknown>;

const OPTION_CASES: { name: string; draft: DraftOptions; filename?: string }[] = [
  { name: "no background, defaults", draft: {} },
  {
    name: "gradient background, Windows chrome, line numbers, footer with every item",
    draft: {
      background: "Sunset",
      outerPadding: 32,
      innerPadding: 48,
      cornerRadius: 0,
      lineNumbers: true,
      windowDecoration: "windows",
      fontId: "fira",
      fontSize: 18,
      footer: {
        enabled: true,
        showLanguage: true,
        showTheme: true,
        showLineCount: true,
        showCharCount: true,
        showAuthor: true,
        alignment: "right",
      },
    },
  },
  {
    name: "16:9 canvas without ligatures, macOS Subtle, header hidden",
    draft: {
      background: "Midnight",
      aspectRatio: "16:9",
      ligatures: false,
      windowDecoration: "macos-subtle",
      header: { ...DEFAULT_HEADER_SETTINGS, enabled: false },
      theme: "dracula",
      fontId: "geist",
    },
  },
  {
    name: "Lumis frame on a gradient, language label left, no padding",
    draft: {
      background: "Candy",
      outerPadding: 0,
      windowDecoration: "lumis",
      header: { ...DEFAULT_HEADER_SETTINGS, showLanguage: true, languagePosition: "left" },
      fontSize: 12,
    },
  },
  {
    name: "Markdown frame on the MDEx canvas with a picked language",
    // Detection says TypeScript for greet.ts; the author picked JavaScript.
    draft: {
      background: "MDEx Purple Dark",
      windowDecoration: "markdown",
      languageOverride: "javascript",
      theme: "catppuccin_macchiato",
      fontId: "jetbrains",
      pixelRatio: 2,
    },
  },
  {
    name: "Minimal chrome, centered filename, filename hidden in footer",
    draft: {
      background: "Ocean",
      windowDecoration: "minimal",
      header: { ...DEFAULT_HEADER_SETTINGS, filenamePosition: "center", showLanguage: true },
      footer: { ...DEFAULT_FOOTER_SETTINGS, enabled: true, alignment: "center" },
      fontId: "hack",
      fontSize: 20,
    },
  },
];

for (const { name, draft } of OPTION_CASES) {
  test(`options — ${name}: the published snippet looks the way it was composed`, async ({
    page,
  }) => {
    // A restored draft is how the composer resumes after sign-in, so it is a
    // real path into every option at once.
    await page.goto("/");
    await page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [
      DRAFT_KEY,
      JSON.stringify({
        code: CODE,
        filename: "greet.ts",
        windowDecorationSchema: 2,
        pixelRatio: 2,
        ...draft,
      }),
    ] as const);
    await page.reload();

    const { row } = await expectPublishedAsComposed(page);

    const expected = Object.fromEntries(
      Object.entries(draft).filter(
        ([key]) => !["theme", "fontId", "languageOverride"].includes(key),
      ),
    );
    expect(row.appearance).toMatchObject(expected);
    if (draft.theme) expect(row.theme).toBe(draft.theme);
    if (draft.fontId) expect(row.font_id).toBe(draft.fontId);
    expect(row.language).toBe(draft.languageOverride ?? "typescript");
    if (draft.aspectRatio === "16:9") {
      const png = pixels(await publishedPng(row.canonical_image_path));
      expect(png.width * 9).toBe(png.height * 16);
    }
  });
}

// ── The composer's controls ──────────────────────────────────────────────────

test("options set through the composer controls are published", async ({ page }) => {
  await page.goto("/compose");
  await page.locator("textarea").fill(CODE);
  await page.getByLabel("Filename").fill("greet.ts");

  await page.getByRole("button", { name: "None", exact: true }).click();
  await page.getByRole("button", { name: "Raindrop" }).click();
  await page.keyboard.press("Escape");
  const choose = async (label: string, option: string) => {
    await page.getByRole("combobox", { name: label, exact: true }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  };
  await choose("Scale", "2x");
  await choose("Font", "JetBrains Mono");
  await choose("Font size", "16px");
  await choose("Window", "Windows");
  await choose("Size", "16:9 (1600×900)");
  await page.getByRole("switch", { name: "Line numbers", exact: true }).click();
  await page.getByRole("switch", { name: "Ligatures", exact: true }).click();
  await page.getByRole("switch", { name: "Show footer", exact: true }).click();
  await page.getByRole("slider", { name: "Corner radius" }).focus();
  await page.keyboard.press("Home");
  await page.getByRole("slider", { name: "Outer padding" }).focus();
  await page.keyboard.press("End");

  const { row } = await expectPublishedAsComposed(page);
  expect(row.font_id).toBe("jetbrains");
  expect(row.appearance).toMatchObject({
    background: "Raindrop",
    fontSize: 16,
    windowDecoration: "windows",
    aspectRatio: "16:9",
    lineNumbers: true,
    ligatures: false,
    cornerRadius: 0,
    outerPadding: 128,
    footer: { enabled: true },
  });
});

// ── Saved view actions ───────────────────────────────────────────────────────

test("every saved view action works on a branded snippet", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.locator("textarea").fill(CODE);
  await page.getByLabel("Filename").fill("greet.ts");
  await page.getByRole("button", { name: "Brand", exact: true }).click();
  await page.getByPlaceholder("Search brands…").fill("Lumis Dark");
  await page.getByRole("option", { name: "Lumis Dark", exact: true }).click();
  await publish(page);
  const url = page.url();

  await page.getByRole("button", { name: "Copy code" }).click();
  await expect(page.getByRole("button", { name: "Copy code" })).toContainText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(CODE);

  await page.getByRole("button", { name: "Copy as rich text" }).click();
  await expect(page.getByRole("button", { name: "Copy as rich text" })).toContainText("Copied");
  const html = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    return (await item!.getType("text/html")).text();
  });
  expect(html).toContain("greet");

  // The export starts from the published appearance.
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Outer padding" })).toHaveAttribute(
    "aria-valuetext",
    "128 pixels",
  );
  await expect(page.getByRole("switch", { name: "Font ligatures" })).not.toBeChecked();
  await expect(page.getByRole("switch", { name: "16:9 canvas (1600×900)" })).toBeChecked();
  await expect(page.getByTitle("Lumis Dark", { exact: true })).toHaveClass(/ring-2/);
  const svg = await download(page, () => page.getByRole("button", { name: "Save as SVG" }).click());
  const [, svgWidth, svgHeight] = /<svg[^>]* width="([\d.]+)" height="([\d.]+)"/.exec(
    svg.toString(),
  )!;
  expect(Number(svgWidth) / Number(svgHeight)).toBeCloseTo(16 / 9, 2);
  const raw = await download(page, () =>
    page.getByRole("button", { name: "Download greet.ts" }).click(),
  );
  expect(raw.toString()).toBe(CODE);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Copy link" }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(url);

  // Reactions and comments still work inside the branded card.
  const firstLine = page.locator(".group\\/gutterline").first();
  await firstLine.hover();
  await firstLine.getByRole("button", { name: "Add a reaction" }).click();
  await page.getByRole("button", { name: "🔥" }).click();
  await expect(page.locator("[data-chip-emoji='🔥']")).toBeVisible();
  await firstLine.hover();
  await firstLine.getByRole("button", { name: "Add a comment" }).click();
  await page.keyboard.type("Looks right");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Looks right")).toBeVisible();

  // The published canvas holds on a phone too, without horizontal overflow.
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByTestId("snippet-canvas")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
