import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { localSession, fixtures, rpc } from "./local.mjs";

const origin = "http://127.0.0.1:9000";
const output = process.argv[2] ?? ".amp/in/artifacts/mcp-m0";
await mkdir(output, { recursive: true });
const { token } = await localSession();
let cgroup;
const cpu = async () =>
  Number((await readFile(`${cgroup}/cpu.stat`, "utf8")).match(/^usage_usec (\d+)/m)[1]);
const peak = async () => Number(await readFile(`${cgroup}/memory.peak`, "utf8"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function reset() {
  const response = await fetch(`${origin}/__bench/reset`, { method: "POST" });
  assert.equal(response.status, 200, await response.text());
  await sleep(150);
}
const rows = [];
const runs = [];
let logs = "";
// Each pair uses a fresh isolate; only its second request is labelled warm.
// Container CPU includes main/event workers and bundling, not just user CPU.
for (const fixture of fixtures) {
  for (const pixelRatio of [1, 2]) {
    for (const format of ["svg", "png"]) {
      // Fresh container gives an independent real kernel high-water mark for
      // this case, rather than carrying a previous case's peak into the table.
      execFileSync("amp", ["orb", "service", "restart", "mcp-bench"], { stdio: "ignore" });
      let health;
      for (let attempt = 0; attempt < 100; attempt++) {
        try {
          health = await (await fetch(`${origin}/__bench/health`)).json();
          if (!runs.some((run) => run.runId === health.runId)) break;
        } catch {
          /* runtime is starting */
        }
        await sleep(200);
      }
      assert.equal(health?.mode, "diagnostic-not-edge-limit");
      runs.push(health);
      const pid = execFileSync(
        "docker",
        ["inspect", "supagist-mcp-bench", "--format", "{{.State.Pid}}"],
        { encoding: "utf8" },
      ).trim();
      cgroup =
        "/sys/fs/cgroup" + (await readFile(`/proc/${pid}/cgroup`, "utf8")).trim().split("::")[1];
      await reset();
      let coldWorker;
      for (const temperature of ["cold", "warm"]) {
        const beforeCpu = await cpu();
        const result = await rpc(`${origin}/functions/v1/mcp`, token, "tools/call", {
          name: "render_snippet",
          arguments: {
            ...fixture,
            language: "javascript",
            theme: "github_dark",
            pixelRatio,
            format,
          },
        });
        const containerCpuMs = ((await cpu()) - beforeCpu) / 1000;
        assert.equal(result.response.status, 200, JSON.stringify(result.data));
        assert.ok(!result.data.error && !result.data.result?.isError, JSON.stringify(result.data));
        const worker = result.response.headers.get("x-bench-worker-id");
        if (temperature === "cold") coldWorker = worker;
        else assert.equal(worker, coldWorker, "Replacement isolate is not warm");
        const stats = await (await fetch(`${origin}/__bench/stats`)).json();
        const item = result.data.result.content[0];
        const bytes = format === "png" ? Buffer.from(item.data, "base64") : Buffer.from(item.text);
        await writeFile(`${output}/${fixture.fixture}-${pixelRatio}x.${format}`, bytes);
        const row = {
          fixture: fixture.fixture,
          pixelRatio,
          format,
          temperature,
          worker,
          requestId: result.response.headers.get("x-bench-request-id"),
          wallMs: result.wallMs,
          containerCpuMs,
          memorySnapshot: stats.workers[worker]?.stats ?? null,
          containerLifetimePeakBytes: await peak(),
          bytes: bytes.length,
        };
        rows.push(row);
        console.log(JSON.stringify(row));
      }
      await reset();
      // One additional cold-only worker makes its Shutdown CPU an unambiguous
      // single-request lifecycle measurement. The pair's CPU remains a total.
      const single = await rpc(`${origin}/functions/v1/mcp`, token, "tools/call", {
        name: "render_snippet",
        arguments: { ...fixture, language: "javascript", theme: "github_dark", pixelRatio, format },
      });
      assert.equal(single.response.status, 200);
      assert.ok(!single.data.error && !single.data.result?.isError);
      const singleWorker = single.response.headers.get("x-bench-worker-id");
      await reset();
      await sleep(300);
      const runLogs = execFileSync("docker", ["logs", "supagist-mcp-bench"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 16 * 1024 * 1024,
      });
      logs += runLogs;
      const events = runLogs
        .split("\n")
        .filter((line) => line.startsWith("{"))
        .map((line) => JSON.parse(line));
      const shutdown = events.find(
        (event) =>
          event.kind === "bench.worker" &&
          event.eventType === "Shutdown" &&
          event.workerId === singleWorker,
      );
      const pairShutdown = events.find(
        (event) =>
          event.kind === "bench.worker" &&
          event.eventType === "Shutdown" &&
          event.workerId === coldWorker,
      );
      assert.ok(shutdown && pairShutdown, "Missing runtime CPU lifecycle event");
      for (const row of rows.slice(-2)) {
        row.coldOnlyWorkerCpuMs = shutdown.event.cpu_time_used;
        row.pairWorkerCpuMs = pairShutdown.event.cpu_time_used;
        row.coldOnlyShutdownMemory = shutdown.event.memory_used;
      }
      await writeFile(`${output}/measurements.json`, JSON.stringify({ runs, rows }, null, 2));
      await writeFile(`${output}/runtime-events.log`, logs);
    }
  }
}
console.log(
  "Saved 24 cold/warm renders + 12 single-request CPU controls. Diagnostic limits are not a hosted pass.",
);
