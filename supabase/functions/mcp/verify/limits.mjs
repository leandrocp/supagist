// Collect outcomes under the ACTUAL CLI serve limits, including failed renders.
// This is an experiment, not a test that declares over-budget rendering a pass.
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { localSession, fixtures, rpc } from "./local.mjs";

const { config, token } = await localSession();
const output = process.argv[2] ?? ".amp/in/artifacts/mcp-m0";
await mkdir(output, { recursive: true });
const since = new Date().toISOString();
const rows = [];
for (const fixture of fixtures) {
  for (const pixelRatio of [1, 2]) {
    for (const format of ["svg", "png"]) {
      const start = performance.now();
      let row;
      try {
        const result = await rpc(`${config.API_URL}/functions/v1/mcp`, token, "tools/call", {
          name: "render_snippet",
          arguments: {
            ...fixture,
            language: "javascript",
            theme: "github_dark",
            pixelRatio,
            format,
          },
        });
        row = {
          status: result.response.status,
          success: result.response.ok && !result.data.error && !result.data.result?.isError,
        };
      } catch (error) {
        // An isolate killed mid-SSE closes the stream rather than returning JSON.
        row = { success: false, error: error.message, cause: error.cause?.code };
      }
      row = {
        fixture: fixture.fixture,
        pixelRatio,
        format,
        wallMs: performance.now() - start,
        ...row,
      };
      rows.push(row);
      console.log(JSON.stringify(row));
    }
  }
}
const logs = spawnSync(
  "docker",
  ["logs", "--timestamps", "--since", since, "supabase_edge_runtime_zivpihasridowvzrgiix"],
  { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
);
if (logs.status !== 0) throw new Error("Could not capture CLI runtime logs");
await writeFile(`${output}/cli-limits.json`, JSON.stringify(rows, null, 2));
await writeFile(`${output}/cli-limits.log`, logs.stdout + logs.stderr);
console.log(
  `${rows.filter((row) => row.success).length}/12 renders completed under CLI Edge limits. Read the failures before deciding viability.`,
);
