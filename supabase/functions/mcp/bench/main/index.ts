import { createBenchHandler, type BenchRuntime } from "../handler.ts";

declare const EdgeRuntime: BenchRuntime;

Deno.serve(
  createBenchHandler(EdgeRuntime, Deno.env.toObject(), (record) =>
    console.log(JSON.stringify(record)),
  ),
);
