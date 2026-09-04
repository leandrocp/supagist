import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Tailwind v4 is CSS-first: there is no `tailwind.config.ts` any more, so the
// theme tokens that used to live there are now the `@theme` block below the
// `:root`/`.dark` custom properties in this same stylesheet.
const globalsCss = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

describe("Supabase design-system tokens", () => {
  it("defines semantic surface and foreground tiers for light and dark themes", () => {
    expect(globalsCss).toContain("--surface-100:");
    expect(globalsCss).toContain("--surface-200:");
    expect(globalsCss).toContain("--surface-300:");
    expect(globalsCss).toContain("--foreground-light:");
    expect(globalsCss).toContain("--foreground-lighter:");
    expect(globalsCss).toContain("--foreground-muted:");
    expect(globalsCss).toContain("--brand: 153.1 60.2% 52.7%;");
  });

  it("clips viewport breakout art without creating horizontal page scroll", () => {
    expect(globalsCss.match(/overflow-x-clip/g)).toHaveLength(2);
  });

  it("keeps the viewport gutter stable while modal selects lock body scrolling", () => {
    expect(globalsCss).toContain("scrollbar-gutter: stable");
    expect(globalsCss).toContain('body[data-scroll-locked="1"]');
    expect(globalsCss).toContain("margin-right: 0 !important");
  });

  it("exposes semantic tokens through Tailwind utilities", () => {
    expect(globalsCss).toContain("--color-surface-100: hsl(var(--surface-100));");
    expect(globalsCss).toContain("--color-foreground-light: hsl(var(--foreground-light));");
    expect(globalsCss).toContain("--color-border-control: hsl(var(--border-control));");
    expect(globalsCss).toContain("--color-brand-subtle: hsl(var(--brand-subtle));");
  });

  it("declares the export @font-face rules at the top level, not inside a layer", () => {
    // The v4 upgrade wrapped these in `@layer utilities`. Nesting depth is the
    // real assertion, so walk braces rather than pattern-matching blocks.
    // Strip comments first so prose mentioning `@font-face` is not counted.
    const css = globalsCss.replace(/\/\*[\s\S]*?\*\//g, "");
    const depths: number[] = [];
    let depth = 0;
    for (let i = 0; i < css.length; i += 1) {
      if (/^@font-face\s*\{/.test(css.slice(i, i + 20))) depths.push(depth);
      if (css[i] === "{") depth += 1;
      else if (css[i] === "}") depth -= 1;
    }
    expect(depths).toHaveLength(4);
    expect(depths.every((d) => d === 0)).toBe(true);
  });

  it("pins the default border colour to the semantic token, pseudo-elements included", () => {
    const borderRule =
      /\*,\s*::after,\s*::before,\s*::backdrop,\s*::file-selector-button\s*\{([^}]*)\}/.exec(
        globalsCss,
      )?.[1];
    expect(borderRule).toBeDefined();
    // v4 defaults borders to `currentcolor`, and the upgrade tool's fallback
    // reached for a gray scale this theme never defines.
    expect(borderRule).toContain("border-border");
    expect(borderRule).not.toContain("gray");
    expect(borderRule).not.toContain("currentcolor");
  });

  it("registers the theme tokens in a v4 @theme block driven by the raw variables", () => {
    const themeBlock = /@theme\s*\{([\s\S]*?)\n\}/.exec(globalsCss)?.[1];
    expect(themeBlock).toBeDefined();
    // Every colour token must indirect through a `--<name>` variable so the
    // `.dark` overrides above keep working; a hard-coded hsl() would freeze
    // the palette to the light theme.
    for (const [, value] of themeBlock!.matchAll(/--color-[\w-]+:\s*([^;]+);/g)) {
      expect(value.trim()).toMatch(/^hsl\(var\(--[\w-]+\)\)$/);
    }
  });
});
