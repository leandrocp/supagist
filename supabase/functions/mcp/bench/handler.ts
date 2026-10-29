export type WorkerMemory = Record<
  string,
  {
    servicePath: string;
    stats: { usedHeapSize: number; externalMemory: number } | null;
  }
>;

export interface BenchRuntime {
  applySupabaseTag(source: Request, target: Request): void;
  userWorkers: {
    create(options: Record<string, unknown>): Promise<{
      key: string;
      fetch(request: Request): Promise<Response>;
    }>;
    memStats(): Promise<WorkerMemory>;
    tryCleanupIdleWorkers(timeoutMs: number): Promise<number>;
  };
}

export function createBenchHandler(
  runtime: BenchRuntime,
  env: Record<string, string>,
  log: (record: Record<string, unknown>) => void,
) {
  const cpuTimeHardLimitMs = Number(env.BENCH_CPU_LIMIT_MS ?? "2000");
  if (
    !Number.isSafeInteger(cpuTimeHardLimitMs) ||
    cpuTimeHardLimitMs < 2000 ||
    cpuTimeHardLimitMs > 400_000
  ) {
    throw new Error("BENCH_CPU_LIMIT_MS must be an integer between 2000 and 400000");
  }
  const diagnostic = cpuTimeHardLimitMs > 2000;
  // Only diagnostic runs may raise memory, to observe a warm render after a
  // workload that the real 256 MiB budget would retire. Never a passing result.
  const memoryLimitMb = diagnostic ? Number(env.BENCH_MEMORY_LIMIT_MB ?? "256") : 256;
  if (![256, 512].includes(memoryLimitMb))
    throw new Error("Diagnostic memory must be 256 or 512 MiB");
  const cpuConfig = {
    mode: diagnostic ? "diagnostic-not-edge-limit" : "edge-cpu-limits",
    cpuTimeHardLimitMs,
    cpuTimeSoftLimitMs: diagnostic ? cpuTimeHardLimitMs : 1000,
    memoryLimitMb,
  };
  const emit = (record: Record<string, unknown>) => log({ ...record, ...cpuConfig });
  let busy = false;
  const requestsByWorker = new Map<string, string[]>();
  let sequence = 0;
  const runId = crypto.randomUUID();
  emit({ kind: "bench.config", runId });
  const root = env.BENCH_FUNCTION_ROOT ?? "/functions/mcp";
  // Explicit allowlist: never pass host credentials, admin keys, or caller JWTs.
  const userEnv = Object.entries({
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_PUBLIC_URL: env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEYS: env.SUPABASE_PUBLISHABLE_KEYS,
    SUPABASE_JWKS: env.SUPABASE_JWKS,
    SUPABASE_FUNCTION_SLUG: "mcp",
  }).filter((entry): entry is [string, string] => typeof entry[1] === "string");

  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    if (url.pathname === "/__bench/health" && req.method === "GET") {
      return Response.json({ ready: true, runId, policy: env.BENCH_POLICY, ...cpuConfig });
    }
    if (busy) return new Response("Sequential benchmark requests only", { status: 409 });
    if (url.pathname === "/__bench/stats" && req.method === "GET") {
      return Response.json({
        kind: "bench.memory-check-snapshot",
        workers: await runtime.userWorkers.memStats(),
        // This is the runtime's most recent memory check, NOT a peak or a fresh V8 sample.
        requestsByWorker: Object.fromEntries(requestsByWorker),
      });
    }
    if (url.pathname === "/__bench/reset" && req.method === "POST") {
      busy = true;
      try {
        const workers = await runtime.userWorkers.memStats();
        const requested = await runtime.userWorkers.tryCleanupIdleWorkers(1000);
        // Cleanup acknowledgement precedes the Shutdown event and pool removal.
        for (let attempt = 0; attempt < 100; attempt++) {
          if (Object.keys(await runtime.userWorkers.memStats()).length === 0) {
            const record = {
              kind: "bench.group-end",
              runId,
              requested,
              workers,
              requestsByWorker: Object.fromEntries(requestsByWorker),
              ...cpuConfig,
            };
            emit(record);
            requestsByWorker.clear();
            return Response.json(record);
          }
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        return new Response(
          "Workers did not retire; stop this run, do not label the next request cold",
          {
            status: 503,
          },
        );
      } finally {
        busy = false;
      }
    }
    if (url.pathname !== "/functions/v1/mcp") return new Response("Not found", { status: 404 });
    if (req.method !== "POST") return new Response("POST required", { status: 405 });

    busy = true;
    const requestId = `${runId}:${++sequence}`;
    try {
      const worker = await runtime.userWorkers.create({
        servicePath: root,
        maybeEntrypoint: `file://${root}/index.ts`,
        importMapPath: `${root}/deno.json`,
        memoryLimitMb,
        workerTimeoutMs: 400_000,
        cpuTimeSoftLimitMs: cpuConfig.cpuTimeSoftLimitMs,
        cpuTimeHardLimitMs,
        noModuleCache: false,
        noNpm: true,
        forceCreate: false,
        customModuleRoot: "",
        decoratorType: "tc39",
        context: { useReadSyncFileAPI: true },
        staticPatterns: [`${root}/assets/**/*`],
        envVars: userEnv,
      });
      const prior = requestsByWorker.get(worker.key) ?? [];
      const temperature = prior.length === 0 ? "isolate-cold" : "same-isolate-warm";
      requestsByWorker.set(worker.key, [...prior, requestId]);
      emit({ kind: "bench.request-start", runId, requestId, workerId: worker.key, temperature });
      const forwarded = new Request(req);
      forwarded.headers.set("x-bench-request-id", requestId);
      runtime.applySupabaseTag(req, forwarded);
      const response = await worker.fetch(forwarded);
      // Fully drain SSE before allowing the next request/reset. This buffering is main-worker
      // overhead, included in container memory and wall latency, not user-worker CPU.
      const body = await response.arrayBuffer();
      const headers = new Headers(response.headers);
      headers.set("x-bench-request-id", requestId);
      headers.set("x-bench-worker-id", worker.key);
      headers.set("x-bench-temperature", temperature);
      headers.set("x-bench-mode", cpuConfig.mode);
      headers.set("x-bench-cpu-limit-ms", String(cpuTimeHardLimitMs));
      emit({
        kind: "bench.request-end",
        runId,
        requestId,
        workerId: worker.key,
        temperature,
        status: response.status,
        responseBytes: body.byteLength,
      });
      return new Response([204, 205, 304].includes(response.status) ? null : body, {
        status: response.status,
        headers,
      });
    } catch {
      // Do not log error objects from auth/transports: they can contain caller credentials.
      emit({ kind: "bench.request-failed", runId, requestId });
      return new Response("User worker failed; inspect lifecycle events", { status: 502 });
    } finally {
      busy = false;
    }
  };
}
