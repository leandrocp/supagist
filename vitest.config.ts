import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // Default: Node for server-side and utility tests
    environment: "node",
    // Component test files (.tsx) run in happy-dom for DOM support
    environmentMatchGlobs: [
      ["components/**/*.test.tsx", "happy-dom"],
      ["app/**/*.test.tsx", "happy-dom"],
    ],
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next", "e2e"],
    coverage: {
      provider: "v8",
      include: ["lib/**", "app/actions/**"],
      // Excluded: browser WASM singleton, thin Supabase wrappers, and publish
      // action (live-DB integration — covered by E2E)
      exclude: ["lib/supabase/**", "lib/lumis-client.ts", "app/actions/publish.ts"],
      thresholds: {
        lines: 80,
      },
    },
  },
});
