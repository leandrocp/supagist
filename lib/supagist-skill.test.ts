import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND_PRESETS } from "@/lib/brand-presets";
import { APPEARANCE_FLAGS, UsageError, parseArgs } from "@/packages/cli/src/args.js";

// The agent skill teaches brand ids and CLI flags; these checks keep it from
// drifting away from lib/brand-presets.ts and the CLI's argument parser.
const SKILL_DIR = join(__dirname, "..", "skills", "supagist");
const docs = [
  "SKILL.md",
  ...readdirSync(join(SKILL_DIR, "reference")).map((file) => `reference/${file}`),
];
const read = (file: string) => readFileSync(join(SKILL_DIR, file), "utf8");

function frontmatter(text: string) {
  const [, block = ""] = text.split("---\n");
  return Object.fromEntries(
    block
      .trim()
      .split("\n")
      .map((line) => [line.slice(0, line.indexOf(":")), line.slice(line.indexOf(":") + 1).trim()]),
  );
}

/** Rows of the brands.md table: [id, name, look]. */
function brandRows() {
  return read("reference/brands.md")
    .split("\n")
    .filter((line) => line.startsWith("| `"))
    .map((line) =>
      line
        .split("|")
        .slice(1, 4)
        .map((cell) => cell.trim().replaceAll("`", "")),
    );
}

describe("supagist skill", () => {
  it("has valid frontmatter whose name matches its directory", () => {
    const meta = frontmatter(read("SKILL.md"));
    expect(meta.name).toBe("supagist");
    expect([...meta.name].every((c) => "abcdefghijklmnopqrstuvwxyz0123456789-".includes(c))).toBe(
      true,
    );
    expect(meta.description.length).toBeGreaterThan(0);
    expect(meta.description.length).toBeLessThanOrEqual(1024);
    expect(meta.compatibility.length).toBeLessThanOrEqual(500);
    expect(meta.license).toBe("MIT");
  });

  it("lists every brand preset in brands.md with its name and appearance", () => {
    expect(brandRows()).toEqual(
      BRAND_PRESETS.map((preset) => [preset.id, preset.name, preset.appearance]),
    );
  });

  it("only mentions brand ids that exist", () => {
    const ids = new Set<string>(BRAND_PRESETS.map((preset) => preset.id));
    const mentioned = docs.flatMap((file) =>
      [...read(file).matchAll(/--brand ([a-z0-9-]+)|"?brand"?: "([a-z0-9-]+)"/g)].map(
        (match) => match[1] ?? match[2],
      ),
    );
    expect(mentioned.length).toBeGreaterThan(5);
    expect(mentioned.filter((id) => !ids.has(id))).toEqual([]);
  });

  it("only mentions CLI flags the parser accepts", () => {
    const flags = new Set(
      docs.flatMap((file) =>
        [...read(file).matchAll(/--(\[no-\])?([a-z][a-z0-9-]*)/g)].flatMap(([, no, name]) =>
          no ? [name, `no-${name}`] : [name],
        ),
      ),
    );
    expect(flags.size).toBeGreaterThan(20);
    const unknown = [...flags].filter((name) => {
      // MCP and other tools' flags quoted in the skill, not the supagist CLI.
      if (
        [
          "transport",
          "scope",
          "prefix",
          "package-lock",
          "no-audit",
          "no-fund",
          "width",
          "test",
          "url",
          "skill",
        ].includes(name)
      )
        return false;
      for (const argv of [
        ["a.ts", `--${name}`],
        ["a.ts", `--${name}`, "1"],
      ]) {
        try {
          parseArgs(argv);
          return false;
        } catch (error) {
          if (!(error instanceof UsageError)) throw error;
          if (!error.message.startsWith("Unknown option")) return false;
        }
      }
      return true;
    });
    expect(unknown).toEqual([]);
  });

  it("documents every appearance flag in reference/cli.md", () => {
    const cli = read("reference/cli.md");
    const undocumented = Object.keys(APPEARANCE_FLAGS).filter(
      (name) => !cli.includes(`--${name}`) && !cli.includes(`--[no-]${name}`),
    );
    expect(undocumented).toEqual([]);
  });

  it("names every MCP tool the server registers", () => {
    const server = readFileSync(join(__dirname, "..", "supabase/functions/mcp/server.ts"), "utf8");
    const tools = server
      .split("registerTool(")
      .slice(1)
      .map((rest) => rest.split('"')[1]);
    expect(tools.length).toBeGreaterThanOrEqual(4);
    const skill = read("SKILL.md");
    expect(tools.filter((tool) => !skill.includes(`\`${tool}\``))).toEqual([]);
  });

  it("links only to files that exist", () => {
    expect(brokenLinks(SKILL_DIR, docs)).toEqual([]);
  });
});

describe("supagist-add-brand skill", () => {
  const dir = join(__dirname, "..", "skills", "supagist-add-brand");
  const skill = readFileSync(join(dir, "SKILL.md"), "utf8");

  it("has valid frontmatter whose name matches its directory", () => {
    const meta = frontmatter(skill);
    expect(meta.name).toBe("supagist-add-brand");
    expect(meta.description.length).toBeGreaterThan(0);
    expect(meta.description.length).toBeLessThanOrEqual(1024);
    expect(meta.compatibility.length).toBeLessThanOrEqual(500);
    expect(meta.license).toBe("MIT");
  });

  it("links only to files that exist, and its scripts and commands are real", () => {
    expect(brokenLinks(dir, ["SKILL.md"])).toEqual([]);
    for (const path of [
      "lib/brand-presets.ts",
      "lib/brand-presets.test.ts",
      "public/brands/README.md",
      "skills/supagist/scripts/convert-png.mjs",
      "skills/supagist-add-brand/scripts/render-sample.mjs",
      "supabase/functions/mcp/spike/prepare-render.mjs",
      "supabase/functions/mcp/spike/render.deno.ts",
      "supabase/functions/mcp/deno.json",
    ]) {
      expect(skill, path).toContain(path);
      expect(existsSync(join(__dirname, "..", path)), path).toBe(true);
    }
  });

  it("names the digest test that pins the shipped presets", () => {
    const tests = readFileSync(join(__dirname, "brand-presets.test.ts"), "utf8");
    const name = "leaves the shipped presets exactly as they were";
    expect(skill).toContain(name);
    expect(tests).toContain(`it("${name}"`);
  });
});

function brokenLinks(dir: string, files: string[]) {
  return files.flatMap((file) =>
    [...readFileSync(join(dir, file), "utf8").matchAll(/\]\(([^)#:]+)(#[^)]*)?\)/g)]
      .map(([, target]) => target)
      .filter((target) => !existsSync(join(dir, dirname(file), target)))
      .map((target) => `${file} -> ${target}`),
  );
}
