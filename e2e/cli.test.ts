import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";

// The real CLI against the app's /api routes and the local `render` Edge
// Function (`supabase functions serve render`). Anonymous renders share one
// local IP quota of 3 per minute, so this file renders exactly twice.
test.describe.configure({ mode: "serial" });

const cli = promisify(execFile);
const host = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
let dir: string;

test.beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "supagist-cli-e2e-"));
  const lines = Array.from({ length: 40 }, (_, i) => `export const line${i + 1} = ${i + 1};`);
  await writeFile(join(dir, "auth.ts"), `${lines.join("\n")}\n`);
});
test.afterAll(() => rm(dir, { recursive: true, force: true }));

const supagist = (...args: string[]) =>
  cli(process.execPath, ["packages/cli", ...args], {
    env: { ...process.env, SUPAGIST_HOST: host },
  }).then(
    ({ stdout }) => ({ code: 0, stdout }),
    (error: { code: number; stdout: string }) => ({ code: error.code, stdout: error.stdout }),
  );

test("CLI lists the server's options", async () => {
  const { code, stdout } = await supagist("options", "--json");
  expect(code).toBe(0);
  const options = JSON.parse(stdout);
  const brands = options.brands.map((brand: { id: string }) => brand.id);
  expect(brands).toContain("supabase");
  expect(brands).toContain("inertia");
  expect(options.themes).toContain("dracula");
  expect(options.languages).toContain("typescript");
  expect(options.formats).toEqual(["svg", "png"]);
});

test("CLI renders a line range to SVG with a brand and no account", async () => {
  const out = join(dir, "auth.svg");
  const { code, stdout } = await supagist(
    join(dir, "auth.ts"),
    "--lines",
    "12-20",
    "--brand",
    "supabase",
    "--out",
    out,
    "--json",
  );
  expect(code).toBe(0);
  const result = JSON.parse(stdout);
  expect(result).toMatchObject({ ok: true, path: out, format: "svg" });
  const svg = await readFile(out, "utf8");
  expect(svg.startsWith("<svg ")).toBe(true);
  expect(result.bytes).toBe(Buffer.byteLength(svg));
  // Supabase brand canvas, embedded font, the cropped lines only.
  expect(svg).toContain("#3ECF8E");
  expect(svg).toContain("data:font/ttf;base64,");
  expect(svg).toContain("line12");
  expect(svg).toContain("line20");
  expect(svg).not.toContain("line21");
  expect(svg).not.toContain("line11");
});

test("CLI reports a server-rejected option as a usage error in JSON", async () => {
  const { code, stdout } = await supagist(
    join(dir, "auth.ts"),
    "--lines",
    "1-2",
    "--brand",
    "nope",
    "--json",
  );
  expect(code).toBe(2);
  const { ok, error } = JSON.parse(stdout);
  expect(ok).toBe(false);
  expect(error).toMatchObject({ code: "INVALID_INPUT", status: 400 });
  expect(error.message).toContain("brand");
});
