import type { ThemeData } from "@lumis-sh/themes";

/**
 * Brand themes wrap a curated syntax palette + an outer-chrome gradient under
 * a single id, so picking "supabase-dark" sets BOTH the editor's syntax
 * colours and the page background framing the editor card. The palette shape
 * mirrors ray.so's partner-themes spec so we can adopt their colour choices
 * without re-deriving them; the shape they call `partner` we call `brand`.
 *
 * We map the brand's ~10 named keys to Lumis's full scope graph in
 * `buildLumisThemeFromBrand` — Lumis has ~150 scopes but most cluster into a
 * small set of categories (keyword.*, string.*, function.*, etc.), so a
 * compact palette gets us close to the look ray.so ships with.
 */

export type BrandPalette = {
  /** Default foreground for unstyled text and the line numbers / chrome. */
  foreground: string;
  /** Background for the editor card itself. The chrome behind it uses `gradient`. */
  editorBg: string;
  comment: string;
  string: string;
  number: string;
  constant: string;
  keyword: string;
  function: string;
  parameter: string;
  punctuation: string;
  property: string;
};

export type BrandTheme = {
  /** Stable id used in the snippets.theme column and in URLs. */
  id: string;
  /** Brand-level grouping key, shared across light/dark variants. */
  brand: string;
  /** User-facing name shown in the theme picker. */
  name: string;
  appearance: "light" | "dark";
  /** Outer-chrome gradient — drives the page bg on home + saved view, and the
   *  outer canvas in the export. */
  gradient: { from: string; to: string };
  palette: BrandPalette;
  /** Public path of the brand SVG logo. */
  logoUrl: string;
};

// ── Registry ─────────────────────────────────────────────────────────────────
//
// One entry per id. Stripe is dark-only on ray.so and we mirror that — there's
// no "stripe-light" entry. The light variants for Supabase, Vercel, Tailwind,
// and Resend reuse the palettes ray.so publishes; gradients are picked to
// keep each brand recognisable while staying readable behind the editor card.

export const BRAND_THEMES: BrandTheme[] = [
  // ── Supabase ─────────────────────────────────────────────────────────────
  {
    id: "supabase-dark",
    brand: "supabase",
    name: "Supabase",
    appearance: "dark",
    gradient: { from: "#1a1a1a", to: "#121212" },
    palette: {
      foreground: "#ffffff",
      editorBg: "#1c1c1c",
      comment: "#7e7e7e",
      string: "#ffcda1",
      number: "#ededed",
      constant: "#3ecf8e",
      keyword: "#bda4ff",
      function: "#3ecf8e",
      parameter: "#ffffff",
      punctuation: "#ffffff",
      property: "#3ecf8e",
    },
    logoUrl: "/brands/supabase.svg",
  },
  {
    id: "supabase-light",
    brand: "supabase",
    name: "Supabase",
    appearance: "light",
    gradient: { from: "#f5f5f5", to: "#ebebeb" },
    palette: {
      foreground: "#525252",
      editorBg: "#ffffff",
      comment: "#7e7e7e",
      string: "#f1a10d",
      number: "#525252",
      constant: "#15593b",
      keyword: "#6b35dc",
      function: "#15593b",
      parameter: "#525252",
      punctuation: "#a0a0a0",
      property: "#15593b",
    },
    logoUrl: "/brands/supabase.svg",
  },

  // ── Vercel ───────────────────────────────────────────────────────────────
  // Vercel's palette uses oklch; these are the closest sRGB hex approximations
  // (visually checked against ray.so's preview).
  {
    id: "vercel-dark",
    brand: "vercel",
    name: "Vercel",
    appearance: "dark",
    gradient: { from: "#232323", to: "#1f1f1f" },
    palette: {
      foreground: "#ededed",
      editorBg: "#0a0a0a",
      comment: "#a1a1a1",
      string: "#62c073",
      number: "#ffffff",
      constant: "#52a8ff",
      keyword: "#ff6e9f",
      function: "#bf7af0",
      parameter: "#ffaf69",
      punctuation: "#ededed",
      property: "#52a8ff",
    },
    logoUrl: "/brands/vercel.svg",
  },
  {
    id: "vercel-light",
    brand: "vercel",
    name: "Vercel",
    appearance: "light",
    gradient: { from: "#fafafa", to: "#f0f0f0" },
    palette: {
      foreground: "#171717",
      editorBg: "#ffffff",
      comment: "#666666",
      string: "#1a7f37",
      number: "#111111",
      constant: "#0070f3",
      keyword: "#d12d6e",
      function: "#7a3aed",
      parameter: "#b85e2a",
      punctuation: "#171717",
      property: "#0070f3",
    },
    logoUrl: "/brands/vercel.svg",
  },

  // ── Tailwind ─────────────────────────────────────────────────────────────
  // ray.so's Tailwind theme defines ONLY foreground; we fill the rest with
  // shades of Tailwind's brand cyan so the syntax has some life.
  {
    id: "tailwind-dark",
    brand: "tailwind",
    name: "Tailwind",
    appearance: "dark",
    gradient: { from: "#0c4a6e", to: "#0e7490" },
    palette: {
      foreground: "#ffffff",
      editorBg: "#0b3a55",
      comment: "#7dd3fc",
      string: "#fde68a",
      number: "#fef3c7",
      constant: "#67e8f9",
      keyword: "#c1b2f9",
      function: "#5eead4",
      parameter: "#fdba74",
      punctuation: "#cffafe",
      property: "#67e8f9",
    },
    logoUrl: "/brands/tailwind.svg",
  },
  {
    id: "tailwind-light",
    brand: "tailwind",
    name: "Tailwind",
    appearance: "light",
    gradient: { from: "#36b6f0", to: "#0ea5e9" },
    palette: {
      foreground: "#0f172a",
      editorBg: "#ffffff",
      comment: "#64748b",
      string: "#b45309",
      number: "#0f172a",
      constant: "#0e7490",
      keyword: "#7c3aed",
      function: "#0284c7",
      parameter: "#c2410c",
      punctuation: "#0f172a",
      property: "#0e7490",
    },
    logoUrl: "/brands/tailwind.svg",
  },

  // ── Resend ───────────────────────────────────────────────────────────────
  {
    id: "resend-dark",
    brand: "resend",
    name: "Resend",
    appearance: "dark",
    gradient: { from: "#3a3a3a", to: "#181818" },
    palette: {
      foreground: "#ffffff",
      editorBg: "#181818",
      comment: "#666666",
      string: "#a7a7a7",
      number: "#ffffff",
      constant: "#a7a7a7",
      keyword: "#a7a7a7",
      function: "#ffffff",
      parameter: "#a7a7a7",
      punctuation: "#a7a7a7",
      property: "#a7a7a7",
    },
    logoUrl: "/brands/resend.svg",
  },
  {
    id: "resend-light",
    brand: "resend",
    name: "Resend",
    appearance: "light",
    gradient: { from: "#fafafa", to: "#e5e5e5" },
    palette: {
      foreground: "#111111",
      editorBg: "#ffffff",
      comment: "#999999",
      string: "#666666",
      number: "#111111",
      constant: "#666666",
      keyword: "#666666",
      function: "#111111",
      parameter: "#666666",
      punctuation: "#666666",
      property: "#666666",
    },
    logoUrl: "/brands/resend.svg",
  },

  // ── Stripe (dark only — matches ray.so) ──────────────────────────────────
  {
    id: "stripe-dark",
    brand: "stripe",
    name: "Stripe",
    appearance: "dark",
    gradient: { from: "#0a2540", to: "#06182d" },
    palette: {
      foreground: "#ffffff",
      editorBg: "#0a2540",
      comment: "#a9bcce",
      string: "#ffa956",
      number: "#ffa956",
      constant: "#ffffff",
      keyword: "#8095ff",
      function: "#00d4ff",
      parameter: "#ff6b35",
      punctuation: "#ffffff",
      property: "#1abdc0",
    },
    logoUrl: "/brands/stripe.svg",
  },
];

// ── Lookups ──────────────────────────────────────────────────────────────────

const BRAND_THEME_BY_ID = new Map(BRAND_THEMES.map((t) => [t.id, t]));

export function getBrandTheme(id: string): BrandTheme | null {
  return BRAND_THEME_BY_ID.get(id) ?? null;
}

export function isBrandThemeId(id: string): boolean {
  return BRAND_THEME_BY_ID.has(id);
}

// ── Lumis-shaped theme builder ───────────────────────────────────────────────

/**
 * Build a Lumis-compatible `ThemeData` object from a brand's compact palette.
 * Maps each palette key to the cluster of Lumis scopes that share its colour
 * (e.g. `keyword.*`, `function.*`). Scopes outside the listed clusters fall
 * through to Lumis's `normal.fg` so the editor still renders them.
 *
 * Returning a Lumis-shaped object means the existing rendering pipeline —
 * `highlighter.highlightIter(code, lang, theme, callback)` — works without any
 * changes; the only addition is a thin loader (see `lib/theme-loader.ts`)
 * that picks between this and `import("@lumis-sh/themes/<name>")`.
 */
export function buildLumisThemeFromBrand(brand: BrandTheme): ThemeData {
  const p = brand.palette;
  const fg = (color: string) => ({ fg: color });
  const fgBold = (color: string) => ({ fg: color, bold: true });

  return {
    name: brand.id,
    appearance: brand.appearance,
    revision: "brand-theme-1",
    highlights: {
      // Defaults
      normal: { fg: p.foreground, bg: p.editorBg },

      // Comments
      comment: fg(p.comment),
      "comment.documentation": fg(p.comment),

      // Strings
      string: fg(p.string),
      "string.escape": fgBold(p.string),
      "string.regexp": fg(p.string),
      "string.special": fg(p.string),
      "string.special.path": fg(p.string),
      "string.special.symbol": fg(p.string),
      "string.special.url": { fg: p.string, italic: true, underline: "solid" },
      character: fg(p.string),

      // Numbers / booleans
      number: fg(p.number),
      "number.float": fg(p.number),
      boolean: fg(p.number),

      // Constants
      constant: fg(p.constant),
      "constant.builtin": fg(p.constant),
      "constant.macro": fg(p.constant),

      // Keywords
      keyword: fg(p.keyword),
      "keyword.conditional": fg(p.keyword),
      "keyword.coroutine": fg(p.keyword),
      "keyword.exception": fg(p.keyword),
      "keyword.export": fg(p.keyword),
      "keyword.function": fg(p.keyword),
      "keyword.import": fg(p.keyword),
      "keyword.modifier": fg(p.keyword),
      "keyword.operator": fg(p.keyword),
      "keyword.repeat": fg(p.keyword),
      "keyword.return": fg(p.keyword),
      "keyword.type": fg(p.keyword),
      "keyword.directive": fg(p.keyword),
      module: fg(p.keyword),
      "module.builtin": fg(p.keyword),

      // Functions
      function: fg(p.function),
      "function.builtin": fg(p.function),
      "function.call": fg(p.function),
      "function.macro": fg(p.function),
      "function.method": fg(p.function),
      "function.method.call": fg(p.function),
      constructor: fg(p.function),

      // Parameters / variables
      "variable.parameter": fg(p.parameter),
      "variable.parameter.builtin": fg(p.parameter),
      variable: fg(p.foreground),
      "variable.builtin": fg(p.constant),
      "variable.member": fg(p.property),

      // Operators / punctuation
      operator: fg(p.punctuation),
      "punctuation.bracket": fg(p.punctuation),
      "punctuation.delimiter": fg(p.punctuation),
      "punctuation.special": fg(p.punctuation),

      // Properties / attributes / tags
      property: fg(p.property),
      attribute: fg(p.property),
      "attribute.builtin": fg(p.property),
      tag: fg(p.property),
      "tag.attribute": fg(p.property),
      "tag.builtin": fg(p.property),
      label: fg(p.property),

      // Types
      type: fg(p.constant),
      "type.builtin": fg(p.keyword),
      "type.definition": fg(p.constant),

      // Markup (markdown headings/links/etc.)
      markup: fg(p.foreground),
      "markup.heading": fgBold(p.constant),
      "markup.heading.1": fgBold(p.constant),
      "markup.heading.2": fgBold(p.constant),
      "markup.heading.3": fgBold(p.constant),
      "markup.heading.4": fgBold(p.constant),
      "markup.heading.5": fgBold(p.constant),
      "markup.heading.6": fgBold(p.constant),
      "markup.italic": { fg: p.foreground, italic: true },
      "markup.strong": fgBold(p.foreground),
      "markup.link": { fg: p.string, underline: "solid" },
      "markup.link.label": fg(p.string),
      "markup.link.url": { fg: p.string, underline: "solid" },
      "markup.list": fg(p.constant),
      "markup.quote": fg(p.comment),
      "markup.raw": { fg: p.string, italic: true },
      "markup.raw.block": { fg: p.string, italic: true },
    },
  } as unknown as ThemeData;
}
