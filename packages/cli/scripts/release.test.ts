import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { nextVersion, plan, prependChangelog } from "./release.mjs";

const commit = (subject: string, sha = "a".repeat(40)) => ({ sha, subject });
const base = { declared: "0.1.0", tags: ["0.1.0"], bump: "patch", date: "2026-11-02" };

describe("nextVersion", () => {
  it("bumps each part and resets the lower ones", () => {
    expect(nextVersion("0.9.12", "patch")).toBe("0.9.13");
    expect(nextVersion("0.9.12", "minor")).toBe("0.10.0");
    expect(nextVersion("0.9.12", "major")).toBe("1.0.0");
  });

  it("rejects unknown bumps and prerelease versions", () => {
    expect(() => nextVersion("0.1.0", "huge")).toThrow("--bump");
    expect(() => nextVersion("0.1.0-beta.1", "patch")).toThrow("x.y.z");
  });
});

describe("plan", () => {
  it("proposes the next version with notes for shipped changes since the tag", () => {
    const result = plan({
      ...base,
      bump: "minor",
      commits: [commit("Add --open", "b".repeat(40)), commit("chore(release): cli 0.1.0")],
    });
    expect(result).toEqual({
      status: "release",
      version: "0.2.0",
      notes:
        "## 0.2.0 (2026-11-02)\n\n" +
        `- Add --open ([bbbbbbb](https://github.com/leandrocp/supagist/commit/${"b".repeat(40)}))\n`,
    });
  });

  it("does nothing when only release commits landed", () => {
    expect(plan({ ...base, commits: [commit("chore(release): cli 0.1.0")] })).toEqual({
      status: "none",
    });
  });

  // A merged release PR bumps package.json before its tag exists. Planning
  // another release on top of it would ship the same commits twice.
  it("waits while the declared version has no tag yet", () => {
    expect(plan({ ...base, declared: "0.1.1", commits: [commit("Fix logout")] })).toEqual({
      status: "pending",
      version: "0.1.1",
    });
  });

  it("refuses to guess without a baseline tag", () => {
    expect(() => plan({ ...base, tags: [], commits: [] })).toThrow("No cli/v* tag");
  });
});

describe("prependChangelog", () => {
  it("puts the newest entry first under the header", () => {
    expect(prependChangelog("# Changelog\n\n## 0.1.0\n\n- First\n", "## 0.1.1\n\n- Fix\n")).toBe(
      "# Changelog\n\n## 0.1.1\n\n- Fix\n\n## 0.1.0\n\n- First\n",
    );
    expect(prependChangelog("", "## 0.1.1\n\n- Fix\n")).toBe("# Changelog\n\n## 0.1.1\n\n- Fix\n");
  });
});

// The real script against a throwaway repository: tag, shipped and unshipped
// changes, then prepare writes the files the release PR commits.
describe("release.mjs in a repository", () => {
  let dir: string;
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("ignores tests and scripts, then prepares the bump and changelog", () => {
    dir = mkdtempSync(join(tmpdir(), "supagist-release-"));
    const cli = join(dir, "packages", "cli");
    cpSync(join(__dirname, ".."), cli, {
      recursive: true,
      filter: (path) => !path.includes("node_modules"),
    });
    const run = (cmd: string, ...args: string[]) =>
      execFileSync(cmd, args, { cwd: dir, encoding: "utf8" }).trim();
    const commitAll = (message: string) => {
      run("git", "add", "-A");
      run("git", "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", message);
    };
    const release = (...args: string[]) => run("node", "packages/cli/scripts/release.mjs", ...args);
    run("git", "init", "-q");
    commitAll("Initial");
    const version = JSON.parse(readFileSync(join(cli, "package.json"), "utf8")).version;
    run("git", "tag", `cli/v${version}`);

    writeFileSync(join(cli, "src", "cli.test.ts"), "// only a test\n");
    writeFileSync(join(cli, "scripts", "note.txt"), "tooling\n");
    commitAll("Touch tests and tooling");
    expect(JSON.parse(release("plan"))).toEqual({ status: "none" });

    writeFileSync(join(cli, "src", "cli.js"), "// changed\n", { flag: "a" });
    commitAll("Fix the help text");
    expect(JSON.parse(release("plan", "--bump", "minor"))).toMatchObject({
      status: "release",
      version: nextVersion(version, "minor"),
    });

    const notes = release("prepare", "--bump", "minor");
    expect(notes).toContain("- Fix the help text");
    expect(notes).not.toContain("Touch tests");
    const pkg = JSON.parse(readFileSync(join(cli, "package.json"), "utf8"));
    expect(pkg.version).toBe(nextVersion(version, "minor"));
    expect(readFileSync(join(cli, "CHANGELOG.md"), "utf8")).toMatch(
      new RegExp(`^# Changelog\\n\\n## ${pkg.version.replaceAll(".", "\\.")} `),
    );
    // Once that bump merges, the untagged version holds further planning.
    commitAll(`chore(release): cli ${pkg.version}`);
    expect(JSON.parse(release("plan"))).toEqual({ status: "pending", version: pkg.version });
  });
});
