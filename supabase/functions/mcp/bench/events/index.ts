export interface WorkerEvent {
  event_type: string;
  event: Record<string, unknown>;
  metadata: { execution_id?: string; service_path?: string };
}

declare const EventManager: new () => AsyncIterable<WorkerEvent>;

for await (const entry of new EventManager()) {
  // Never relay application console logs, which may contain user inputs or tokens.
  if (["Boot", "Shutdown", "BootFailure", "UncaughtException"].includes(entry.event_type)) {
    console.log(
      JSON.stringify({
        kind: "bench.worker",
        eventType: entry.event_type,
        workerId: entry.metadata.execution_id,
        servicePath: entry.metadata.service_path,
        ...(entry.event_type === "Boot" || entry.event_type === "Shutdown"
          ? { event: entry.event }
          : { failed: true }),
      }),
    );
  }
}
