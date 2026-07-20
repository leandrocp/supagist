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

  it("keeps the public view RPC invoker-safe and its privileged implementation private", () => {
    expect(viewRpcMigration).toContain(
      "alter function public.record_snippet_view(uuid) set schema private",
    );
    expect(viewRpcMigration).toContain("security invoker");
    expect(viewRpcMigration).toContain("select private.record_snippet_view(p_snippet_id)");
  });
});
