import { describe, expect, it, vi } from "vitest";
import { createBenchHandler, type BenchRuntime } from "./handler";

function setup(cpuLimit = "2000", memoryLimit = "256") {
  const fetchWorker = vi.fn<(request: Request) => Promise<Response>>(
    async () =>
      new Response('data: {"result":{}}\n\n', {
        headers: { "content-type": "text/event-stream" },
      }),
  );
  const runtime: BenchRuntime = {
    applySupabaseTag: vi.fn(),
    userWorkers: {
      create: vi.fn(async () => ({ key: "worker-a", fetch: fetchWorker })),
      memStats: vi.fn(async () => ({})),
      tryCleanupIdleWorkers: vi.fn(async () => 1),
    },
  };
  const records: Record<string, unknown>[] = [];
  const handler = createBenchHandler(
    runtime,
    {
      BENCH_CPU_LIMIT_MS: cpuLimit,
      BENCH_MEMORY_LIMIT_MB: memoryLimit,
      SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_JWKS: '{"keys":[]}',
      SUPABASE_PUBLISHABLE_KEYS: '{"default":"sb_publishable_local"}',
      SUPABASE_SECRET_KEY: "must-not-forward",
      TOKEN: "must-not-forward",
    },
    (record) => records.push(record),
  );
  const call = () =>
    handler(
      new Request("http://localhost/functions/v1/mcp", {
        method: "POST",
        headers: { authorization: "Bearer private-user-jwt" },
        body: '{"jsonrpc":"2.0","id":1}',
      }),
    );
  return { handler, call, runtime, records, fetchWorker };
}

describe("Edge benchmark request attribution", () => {
  it("keeps the actual default CPU limits and labels them", async () => {
    const { call, runtime, records } = setup();
    const response = await call();
    expect(response.headers.get("x-bench-mode")).toBe("edge-cpu-limits");
    expect(vi.mocked(runtime.userWorkers.create).mock.calls[0][0]).toMatchObject({
      cpuTimeSoftLimitMs: 1000,
      cpuTimeHardLimitMs: 2000,
    });
    expect(records[0]).toMatchObject({ kind: "bench.config", mode: "edge-cpu-limits" });
  });

  it("raises both limits only in clearly labelled diagnostic mode", async () => {
    const { call, handler, runtime, records } = setup("60000");
    const response = await call();
    expect(response.headers.get("x-bench-mode")).toBe("diagnostic-not-edge-limit");
    expect(response.headers.get("x-bench-cpu-limit-ms")).toBe("60000");
    expect(vi.mocked(runtime.userWorkers.create).mock.calls[0][0]).toMatchObject({
      cpuTimeSoftLimitMs: 60000,
      cpuTimeHardLimitMs: 60000,
      memoryLimitMb: 256,
    });
    const health = await handler(new Request("http://localhost/__bench/health"));
    expect(await health.json()).toMatchObject({ mode: "diagnostic-not-edge-limit" });
    expect(records.every((record) => record.mode === "diagnostic-not-edge-limit")).toBe(true);
  });

  it("only permits extra memory in explicitly diagnostic runs", async () => {
    for (const [cpu, expected] of [
      ["2000", 256],
      ["60000", 512],
    ] as const) {
      const { handler } = setup(cpu, "512");
      const health = await handler(new Request("http://localhost/__bench/health"));
      expect(await health.json()).toMatchObject({ memoryLimitMb: expected });
    }
    expect(() => setup("60000", "1024")).toThrow("Diagnostic memory");
  });

  it.each(["0", "1999", "2000.5", "bad", "Infinity", "400001"])(
    "rejects invalid diagnostic CPU limit %s",
    (value) => expect(() => setup(value)).toThrow("BENCH_CPU_LIMIT_MS"),
  );

  it("marks cold/warm by actual worker ID and preserves authenticated SSE payloads", async () => {
    const { call, records, fetchWorker, runtime } = setup();
    const first = await call();
    const second = await call();
    expect(first.headers.get("x-bench-temperature")).toBe("isolate-cold");
    expect(second.headers.get("x-bench-temperature")).toBe("same-isolate-warm");
    expect(first.headers.get("x-bench-request-id")).not.toBe(
      second.headers.get("x-bench-request-id"),
    );
    expect(await second.text()).toBe('data: {"result":{}}\n\n');
    expect(fetchWorker.mock.calls[0]?.[0].headers.get("authorization")).toBe(
      "Bearer private-user-jwt",
    );
    expect(runtime.applySupabaseTag).toHaveBeenCalledTimes(2);
    const options = vi.mocked(runtime.userWorkers.create).mock.calls[0][0];
    expect(options).toMatchObject({
      memoryLimitMb: 256,
      cpuTimeHardLimitMs: 2000,
      forceCreate: false,
      staticPatterns: ["/functions/mcp/assets/**/*"],
    });
    expect(JSON.stringify(options)).not.toContain("must-not-forward");
    expect(JSON.stringify(records)).not.toContain("private-user-jwt");
    expect(JSON.stringify(records)).not.toContain("cpu_time_used");
  });

  it("does not mislabel a replacement worker as warm", async () => {
    const { call, runtime, fetchWorker } = setup();
    await call();
    vi.mocked(runtime.userWorkers.create).mockResolvedValueOnce({
      key: "worker-b",
      fetch: fetchWorker,
    });
    expect((await call()).headers.get("x-bench-temperature")).toBe("isolate-cold");
  });

  it("blocks overlap and restores the handler after a failed worker request", async () => {
    const { call, fetchWorker } = setup();
    let fail!: (error: Error) => void;
    fetchWorker.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          fail = reject;
        }),
    );
    const pending = call();
    await vi.waitFor(() => expect(fetchWorker).toHaveBeenCalledOnce());
    expect((await call()).status).toBe(409);
    fail(new Error("contains-private-user-jwt"));
    expect((await pending).status).toBe(502);
    expect((await call()).status).toBe(200);
  });

  it("ends a group without fabricating per-request CPU from a worker total", async () => {
    const { handler, call, runtime } = setup();
    await call();
    await call();
    const reset = await handler(new Request("http://localhost/__bench/reset", { method: "POST" }));
    const result = await reset.json();
    expect(result.requestsByWorker["worker-a"]).toHaveLength(2);
    expect(result.kind).toBe("bench.group-end");
    expect(runtime.userWorkers.tryCleanupIdleWorkers).toHaveBeenCalledWith(1000);
    expect(result.cpuMs).toBeUndefined();
  });

  it("preserves no-body statuses and rejects unknown routes", async () => {
    const { handler, call, fetchWorker } = setup();
    fetchWorker.mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect((await call()).status).toBe(204);
    expect((await handler(new Request("http://localhost/unknown"))).status).toBe(404);
  });
});
