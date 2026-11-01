import { strict as assert } from "node:assert";
import { searchThemes, searchThemesInput, themeCatalog } from "./themes.ts";
import { supportedThemes } from "./render.ts";

const ids = (result: ReturnType<typeof searchThemes>) => result.themes.map((theme) => theme.id);

Deno.test("the catalog covers exactly the renderable themes, each dark or light", () => {
  assert.deepEqual(themeCatalog.map((theme) => theme.id).sort(), [...supportedThemes].sort());
  for (const theme of themeCatalog) assert.ok(["dark", "light"].includes(theme.appearance));
  // Appearance comes from the theme data itself, not its name.
  const byId = Object.fromEntries(themeCatalog.map((theme) => [theme.id, theme]));
  assert.equal(byId.catppuccin_latte.appearance, "light");
  assert.equal(byId.nord.appearance, "dark");
  assert.equal(byId.dayfox.family, "EdenEast/nightfox.nvim");
  assert.deepEqual(byId["supabase-light"], {
    id: "supabase-light",
    appearance: "light",
    family: "supabase",
    kind: "brand",
  });
});

Deno.test("query, family and appearance filters combine", () => {
  assert.deepEqual(ids(searchThemes({ query: "catppuccin" })), [
    "catppuccin_frappe",
    "catppuccin_latte",
    "catppuccin_macchiato",
    "catppuccin_mocha",
  ]);
  assert.deepEqual(ids(searchThemes({ query: "catppuccin", appearance: "light" })), [
    "catppuccin_latte",
  ]);
  // A family groups themes whose ids share no word (dayfox, terafox, ...).
  assert.deepEqual(ids(searchThemes({ family: "NIGHTFOX" })), [
    "carbonfox",
    "dawnfox",
    "dayfox",
    "duskfox",
    "nightfox",
    "nordfox",
    "terafox",
  ]);
  assert.deepEqual(ids(searchThemes({ family: "nightfox", appearance: "light" })), [
    "dawnfox",
    "dayfox",
  ]);
  assert.deepEqual(ids(searchThemes({ family: "supabase" })), ["supabase-dark", "supabase-light"]);
  // Every word must match; - and _ separate words.
  for (const theme of searchThemes({ query: "github dark", limit: 100 }).themes)
    assert.ok(theme.id.includes("github") && theme.id.includes("dark"), theme.id);
  assert.deepEqual(ids(searchThemes({ query: "supabase-dark" })), ["supabase-dark"]);
  assert.equal(searchThemes({ query: "no such theme" }).total, 0);
});

Deno.test("exact and prefix id matches rank before other matches", () => {
  const result = ids(searchThemes({ query: "nord" }));
  assert.equal(result[0], "nord");
  assert.deepEqual(result.slice(1, 5), ["nordbones", "nordern", "nordfox", "nordic"]);
  assert.ok(result.includes("onenord_dark"));
});

Deno.test("pages through every match without gaps or repeats", () => {
  const all = searchThemes({ appearance: "dark", limit: 100 }).total;
  const seen: string[] = [];
  let offset: number | null = 0;
  while (offset !== null) {
    const page: ReturnType<typeof searchThemes> = searchThemes({
      appearance: "dark",
      limit: 7,
      offset,
    });
    assert.equal(page.total, all);
    assert.equal(page.offset, offset);
    assert.ok(page.themes.length <= 7);
    seen.push(...ids(page));
    offset = page.nextOffset;
  }
  assert.equal(seen.length, all);
  assert.equal(new Set(seen).size, all);
  const past = searchThemes({ offset: 10_000 });
  assert.deepEqual([past.themes, past.nextOffset], [[], null]);
  assert.equal(searchThemes({}).themes.length, 25);
});

Deno.test("rejects out-of-range paging and unknown fields", () => {
  for (const invalid of [
    { limit: 0 },
    { limit: 101 },
    { limit: 1.5 },
    { offset: -1 },
    { appearance: "dim" },
    { family: "" },
    { name: "dracula" },
  ])
    assert.ok(!searchThemesInput.safeParse(invalid).success, JSON.stringify(invalid));
});
