# Local Edge Runtime measurement harness

This directory is a local-only benchmark harness, not a deployable function.
The caller owns fixtures, authentication and response/timing collection. The
harness never creates users, saves snippets, migrates or contacts hosted APIs.

## Start

Requires the local Supabase stack, Docker and the MCP function's `index.ts`,
`deno.json` and `assets/`. `runtime.sh` inspects
`supabase_edge_runtime_zivpihasridowvzrgiix` and uses its **immutable image ID**.
CLI 2.117.0 currently runs `ghcr.io/supabase/edge-runtime:v1.74.3`.
Override the source container with `SUPABASE_EDGE_CONTAINER` if necessary.

Set these in the supervised service's environment (no JWT/admin key is needed):

- `SUPABASE_URL=http://127.0.0.1:54321` (host-network reachable, local only).
- `SUPABASE_PUBLISHABLE_KEYS`: JSON `{ "default": "<local publishable key>" }`.
- `SUPABASE_JWKS`: public JSON from the local Auth JWKS endpoint.

Run the foreground process through the orb service supervisor:

```bash
amp orb service start mcp-bench --port 9000 --command \
  'bash supabase/functions/mcp/bench/runtime.sh serve'
```

The service command must supply the environment variables above; do not assume
that exported variables in an unrelated terminal reach the supervisor. Never put
user JWTs into the service command. The caller sends its real local user JWT in
the HTTP Authorization header instead. The harness bypasses the CLI gateway,
but the unmodified function middleware still verifies every user request.

The harness binds to loopback, is not exposed through a portal, and its control
routes are unauthenticated local developer controls. Runtime `SB_EXECUTION_ID`
is injected automatically for each user worker, and the harness supplies
`SUPABASE_FUNCTION_SLUG=mcp`. `SUPABASE_PUBLIC_URL` points at the local Supabase
stack so middleware discovery uses local Auth, not a Docker-internal hostname.
This harness measures execution, not the gateway's OAuth discovery routing.

## Caller interface

- `GET /__bench/health`: readiness without warming a user worker.
- `POST /functions/v1/mcp`: forwards the exact JSON/SSE request and bearer token.
  Reads the full user-worker response before returning it. Extra headers:
  `x-bench-request-id`, `x-bench-worker-id`, `x-bench-temperature`.
- `GET /__bench/stats`: most recent runtime memory-check snapshot, by worker ID,
  plus the requests attributed to each worker. It does not force a fresh V8 sample.
- `POST /__bench/reset`: retire idle workers and wait for pool removal. Returns
  the group-to-worker mapping and last memory-check snapshots; a failed reset is
  503, not a successful cold reset. Wait for matching Shutdown log events too.
- Concurrent work/reset is refused with 409. Run one caller, sequentially.

Read logs with `bash supabase/functions/mcp/bench/runtime.sh logs`. JSON records:
`bench.request-start`, `bench.request-end`, `bench.request-failed`,
`bench.group-end`, and `bench.worker`. Join `bench.worker.workerId` to the
request's `x-bench-worker-id`. Event delivery can lag the response/reset. Log
records contain no request bodies, JWTs, keys or application console messages.

## Cold, warm, CPU: do not conflate these

The default policy is `per_worker`, allowing real reuse and idle cleanup.
The first request to an actual worker ID is `isolate-cold`; subsequent requests
on that **same ID** are `same-isolate-warm`. A replacement worker is labeled cold,
not silently counted warm. A call to `list_options` or auth smoke on the same
worker warms it: reset before a measured cold render. Dependency/download cache
is retained within the container; isolate-cold does NOT mean download-cold.
Starting a fresh container discards its Deno cache and resets container peak.

1. **Cold CPU sample:** reset; send exactly one measured render; reset; collect
   that worker's Shutdown `event.cpu_time_used` (milliseconds). This is actual
   runtime-measured CPU for the one-request worker lifetime, including boot and
   shutdown work, not tool-callback-only CPU.
2. **Cold/warm pair:** reset; send a render; send the same render and verify the
   same worker ID; reset; collect the single Shutdown total for the pair.
   Report cold/warm wall latency individually and **CPU for the entire pair**.
   Do not divide the CPU by two or subtract totals from different isolates and
   present that as measured warm-request CPU.
3. `BENCH_POLICY=oneshot` provides CLI-like one-worker-per-request controls.
   It cannot produce same-isolate warm samples. Restart the supervised service
   and container when switching policy.

The runtime limits match CLI 2.117.0: 256 MiB memory, 1,000 ms soft CPU,
2,000 ms hard CPU, 400 s lifetime. With `per_worker`, CPU limits are cumulative
over the worker lifetime; large pairs can be retired before their warm request.
Check worker IDs, Shutdown reason, HTTP status AND JSON-RPC `isError`.

### Diagnostic runs above the Edge CPU limit

For output collection after a genuine CPU-limit failure, set
`BENCH_CPU_LIMIT_MS=60000` in the supervised service command before `runtime.sh
serve`. Restart with a fresh container. Default behavior remains hard 2000 ms /
soft 1000 ms. Values above 2000 set **both** soft and hard limits to the override
so a warm pair can survive. Memory defaults to 256 MiB; diagnostic mode alone
also accepts `BENCH_MEMORY_LIMIT_MB=512`. This lets an over-budget render retain
its isolate for a genuine warm measurement. The regular mode always enforces
256 MiB even if that variable is set. Lifetime stays 400 s. Accepted CPU values
are integers from 2000 through 400000; memory accepts only 256 or 512.

Startup `bench.config`, request/group logs, health, and `x-bench-mode` explicitly
say `diagnostic-not-edge-limit`; `x-bench-cpu-limit-ms` reports the hard limit.
Keep diagnostic outputs separate from the default-limit failure evidence.
Successful diagnostic output is **not** proof it fits Edge limits. The CPU event
still measures the worker's whole lifetime, not each warm request. A caller may
also record cgroup `cpu.stat` `usage_usec` deltas, but these are **container-wide
CPU proxies** including main/event/native work, not exact user-isolate CPU.

**Exact warm per-request CPU is unavailable in the stock v1.74.3 APIs.** Shutdown
is emitted once per worker. `process.cpuUsage()` is an unimplemented polyfill
returning zero, and `beforeunload` exposes a reason, not a CPU counter. True
per-request isolate CPU would need runtime instrumentation, not wall-clock
timers. This harness deliberately does not fabricate it.

## Memory

```bash
bash supabase/functions/mcp/bench/runtime.sh peak
```

This reads cgroup-v2 `memory.peak`: **real container-lifetime peak bytes**, including
main and event workers, native runtime, module/bundle cache, response buffering
and user worker. It is not a per-request or per-isolate peak. Read it before stop;
it fails explicitly if unavailable. Restart a fresh container for an independent
peak measurement; `/__bench/reset` does not reset this high-water mark.

Shutdown `event.memory_used.total` is **shutdown heap-used + external snapshot**.
`mem_check_captured.current` and `/__bench/stats` are the last memory check, not
peaks. `peakMallocedMemory` covers only V8 malloced memory, not total memory.
Do not compare container peak directly with the 256 MiB per-user-worker limit.
The main worker's full-response buffering adds container memory and wall time,
but not user-worker CPU. Sampling/logging also has overhead; hold it constant.

## Local ESZIP with assets, no deployment

```bash
bash supabase/functions/mcp/bench/runtime.sh bundle /tmp/supagist-m0-eszip
```

This writes `mcp.eszip` and `runtime-image.txt`, and prints byte length and SHA-256.
It mounts the function sources read-only, includes `assets/**/*`, verifies every
asset's bytes occur in the archive, and uses the same runtime image ID as CLI
serve. The trailing `*` matters: the runtime's Rust glob treats `assets/**` as
directories only, silently omitting fonts and images. npm/JSR downloads are allowed; no
Supabase management/deploy operation occurs. The runtime discovers the function's
`deno.json`. Record the function lockfile hash alongside results. ESZIP bytes are
not compressed-upload bytes or RAM.

Stop with `bash supabase/functions/mcp/bench/runtime.sh stop`, then
`amp orb service stop mcp-bench`. Save logs before stopping (the container is
disposable and auto-removed).

## Source of measurement semantics (v1.74.3)

- [CPU is accumulated worker CPU](https://github.com/supabase/edge-runtime/blob/47d04fdd22e33ea3fd904576cf3248d963d903a9/crates/base/src/worker/supervisor/strategy_per_worker.rs#L338-L346).
- [Shutdown memory snapshot](https://github.com/supabase/edge-runtime/blob/47d04fdd22e33ea3fd904576cf3248d963d903a9/crates/base/src/worker/supervisor/mod.rs#L345-L380).
- [CPU polyfill returns zero](https://github.com/supabase/edge-runtime/blob/47d04fdd22e33ea3fd904576cf3248d963d903a9/ext/node/polyfills/process.ts#L442-L448).
- [Idle cleanup](https://github.com/supabase/edge-runtime/blob/47d04fdd22e33ea3fd904576cf3248d963d903a9/crates/base/src/worker/pool.rs#L702-L718).
