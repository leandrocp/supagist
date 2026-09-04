import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // An explicit alias rather than `resolve.tsconfigPaths`/`vite-tsconfig-paths`.
    // Both of those resolve `@/...` late enough that `vi.mock("@/lib/...")`
    // registers a different module id than the importer requests, so mocks
    // silently miss and server-action tests hit real Supabase and Next.
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)).replace(/\/$/, ""),
    },
  },
  test: {
    // Default: Node for server-side and utility tests. Component tests opt into
    // happy-dom with a `// @vitest-environment happy-dom` pragma on line 1 —
    // every `*.test.tsx` carries one, so the deprecated `environmentMatchGlobs`
    // is no longer needed.
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next", "e2e"],
    setupFiles: ["./vitest.setup.ts"],
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
