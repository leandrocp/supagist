#!/usr/bin/env node
// Release planning for the supagist npm package, run by the release workflows.
//
//   node packages/cli/scripts/release.mjs plan [--bump patch|minor|major]
//   node packages/cli/scripts/release.mjs prepare [--bump patch|minor|major]
//
// `plan` prints JSON: {"status":"none"} when nothing shipped changed since the
// last cli/v* tag, {"status":"pending"} when package.json already declares a
// version that has no tag yet (a merged release waiting to be tagged), or
// {"status":"release","version":"…","notes":"…"}. `prepare` does the same plan,
// writes the new version and changelog entry, and prints the notes.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const TAG_PREFIX = "cli/v";
const BUMPS = ["patch", "minor", "major"];
const REPO_URL = "https://github.com/leandrocp/supagist";
// Only what ships in the tarball (package.json "files") makes a release.
export const RELEASE_PATHS = [
  "packages/cli/bin",
  "packages/cli/src",
  "packages/cli/README.md",
  "packages/cli/LICENSE",
  "packages/cli/CHANGELOG.md",
  "packages/cli/package.json",
  ":(exclude)packages/cli/src/*.test.*",
];

/** @param {string} version @param {string} bump */
export function nextVersion(version, bump) {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || !parts.every(Number.isSafeInteger)) {
    throw new Error(`Not a plain x.y.z version: ${version}`);
  }
  const [major, minor, patch] = parts;
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  if (bump === "patch") return `${major}.${minor}.${patch + 1}`;
  throw new Error(`--bump must be one of ${BUMPS.join(", ")}, got ${bump}`);
}

/**
 * @param {string} version
 * @param {string} date YYYY-MM-DD
 * @param {{ sha: string, subject: string }[]} commits oldest first
 */
export function releaseNotes(version, date, commits) {
  const lines = commits.map(
    ({ sha, subject }) => `- ${subject} ([${sha.slice(0, 7)}](${REPO_URL}/commit/${sha}))`,
  );
  return `## ${version} (${date})\n\n${lines.join("\n")}\n`;
}

/** @param {string} changelog @param {string} notes */
export function prependChangelog(changelog, notes) {
  const header = "# Changelog\n";
  const body = changelog.startsWith(header)
    ? changelog.slice(header.length).trimStart()
    : changelog;
  return `${header}\n${notes}${body ? `\n${body}` : ""}`;
}

/**
 * @param {{ declared: string, tags: string[], commits: { sha: string, subject: string }[], bump: string, date: string }} input
 *   tags are versions without the prefix; commits touch shipped files since the latest tag, oldest first.
 */
export function plan({ declared, tags, commits, bump, date }) {
  const latest = tags[0];
  if (!latest) throw new Error(`No ${TAG_PREFIX}* tag yet. Tag the last published release first.`);
  if (declared !== latest) return { status: "pending", version: declared };
  const changes = commits.filter(({ subject }) => !subject.startsWith("chore(release):"));
  if (changes.length === 0) return { status: "none" };
  const version = nextVersion(declared, bump);
  return { status: "release", version, notes: releaseNotes(version, date, changes) };
}

/** @param {string[]} args */
function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function readPlan(/** @type {string} */ bump) {
  const pkgPath = new URL("../package.json", import.meta.url);
  const declared = JSON.parse(readFileSync(pkgPath, "utf8")).version;
  const tags = git("tag", "--list", `${TAG_PREFIX}*`, "--sort=-version:refname")
    .split("\n")
    .filter(Boolean)
    .map((tag) => tag.slice(TAG_PREFIX.length));
  const range = tags[0] ? [`${TAG_PREFIX}${tags[0]}..HEAD`] : [];
  const commits = git(
    "log",
    "--reverse",
    "--no-merges",
    "--format=%H%x09%s",
    ...range,
    "--",
    ...RELEASE_PATHS,
  )
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, ...subject] = line.split("\t");
      return { sha, subject: subject.join("\t") };
    });
  const date = new Date().toISOString().slice(0, 10);
  return { pkgPath, result: plan({ declared, tags, commits, bump, date }) };
}

function main(/** @type {string[]} */ argv) {
  const [command, flag, bump = "patch"] = argv;
  if (!["plan", "prepare"].includes(command) || (flag !== undefined && flag !== "--bump")) {
    throw new Error("Usage: release.mjs plan|prepare [--bump patch|minor|major]");
  }
  nextVersion("0.0.0", bump);
  const { pkgPath, result } = readPlan(bump);
  if (command === "plan") {
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  if (result.status !== "release") throw new Error(`Nothing to prepare (${result.status}).`);
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  writeFileSync(pkgPath, `${JSON.stringify({ ...pkg, version: result.version }, null, 2)}\n`);
  const changelogPath = new URL("../CHANGELOG.md", import.meta.url);
  let changelog = "";
  try {
    changelog = readFileSync(changelogPath, "utf8");
  } catch {}
  writeFileSync(changelogPath, prependChangelog(changelog, result.notes));
  process.stdout.write(result.notes);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
