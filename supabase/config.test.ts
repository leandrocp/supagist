import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = readFileSync("supabase/config.toml", "utf8");

describe("local Supabase configuration", () => {
  it("uses the current local SMTP section", () => {
    expect(config).toContain("[local_smtp]");
    expect(config).not.toContain("[inbucket]");
  });

  it("allows both documented local application hosts for Auth callbacks", () => {
    expect(config).toContain('site_url = "http://127.0.0.1:3000"');
    expect(config).toContain('"http://localhost:3000/**"');
    expect(config).toContain('"http://127.0.0.1:3000/**"');
  });
});
