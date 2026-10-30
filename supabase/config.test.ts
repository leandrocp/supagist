import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = readFileSync("supabase/config.toml", "utf8");
const viewRpcMigration = readFileSync(
  "supabase/migrations/20260720224032_move_view_rpc_private.sql",
  "utf8",
);

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

  it("lets MCP OAuth discovery reach the function's own user auth gate", () => {
    const mcp = config.split("[functions.mcp]")[1];
    expect(mcp).toContain("verify_jwt = false");
    expect(mcp).toContain('static_files = ["./functions/mcp/assets/*"]');
    const oauth = config.split("[auth.oauth_server]")[1]?.split("[")[0];
    expect(oauth).toContain("enabled = true");
    expect(oauth).toContain('authorization_url_path = "/oauth/consent"');
    expect(oauth).toContain("allow_dynamic_registration = true");
  });

  it("pins local and CI CLI versions with MCP function-slug injection", () => {
    const mise = readFileSync("mise.toml", "utf8");
    const ci = readFileSync(".github/workflows/ci.yml", "utf8");
    expect(mise).toContain('supabase = "2.117.0"');
    // Every job that installs the CLI pins the same version as mise.
    const installs =
      ci.match(/supabase\/setup-cli@v\d+(?:\.\d+)*\n\s+with:\n\s+version: \S+/g) ?? [];
    expect(installs.length).toBe(ci.match(/supabase\/setup-cli@/g)?.length);
    expect(installs.length).toBeGreaterThanOrEqual(4);
    for (const install of installs) expect(install).toMatch(/version: 2\.117\.0$/);
    expect(ci).not.toContain("2.109.1");
  });

  it("keeps the public view RPC invoker-safe and its privileged implementation private", () => {
    expect(viewRpcMigration).toContain(
      "alter function public.record_snippet_view(uuid) set schema private",
    );
    expect(viewRpcMigration).toContain("security invoker");
    expect(viewRpcMigration).toContain("select private.record_snippet_view(p_snippet_id)");
  });
});
