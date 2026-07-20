import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const tailwindConfig = readFileSync(new URL("../tailwind.config.ts", import.meta.url), "utf8");

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
    expect(tailwindConfig).toContain('100: "hsl(var(--surface-100))"');
    expect(tailwindConfig).toContain('light: "hsl(var(--foreground-light))"');
    expect(tailwindConfig).toContain('control: "hsl(var(--border-control))"');
    expect(tailwindConfig).toContain('subtle: "hsl(var(--brand-subtle))"');
  });
});
