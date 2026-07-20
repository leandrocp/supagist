import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/[snippet]/snippet-annotations-view.tsx", "utf8");

describe("saved-snippet Realtime trust boundary", () => {
  it("subscribes to RLS-backed Postgres Changes for reactions and comments", () => {
    expect(source).toContain('"postgres_changes"');
    expect(source).toContain('table: "snippet_line_reactions"');
    expect(source).toContain('table: "snippet_comments"');
  });

  it("does not consume or send forgeable annotation broadcasts", () => {
    expect(source).not.toContain('.on("broadcast"');
    expect(source).not.toContain(".httpSend(");
  });

  it("bounds comment input in the browser as well as the database", () => {
    expect(source).toContain("maxLength={2000}");
  });
});
