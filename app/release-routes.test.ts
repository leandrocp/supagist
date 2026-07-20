import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("release route surface", () => {
  it("does not ship the Supabase starter protected tutorial", () => {
    expect(existsSync("app/protected")).toBe(false);
    expect(existsSync("components/tutorial")).toBe(false);
    expect(existsSync("components/hero.tsx")).toBe(false);
    expect(existsSync("components/sign-up-form.tsx")).toBe(false);
    expect(existsSync("components/update-password-form.tsx")).toBe(false);
    expect(readFileSync("lib/supabase/proxy.ts", "utf8")).not.toContain('"/protected"');
  });
});
