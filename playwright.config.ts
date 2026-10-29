import { defineConfig, devices } from "@playwright/test";

const production = process.env.PLAYWRIGHT_PRODUCTION === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "dot" : "html",

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    // Auth setup — run once to save session state (see e2e/auth.setup.ts)
    { name: "setup", testMatch: /auth\.setup\.ts/ },

    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /auth\.(test|setup)\.ts/,
    },

    // Authenticated flows reuse the saved session
    {
      name: "chromium-auth",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
      testMatch: /auth\.test\.ts/,
    },
  ],

  webServer: {
    command: production ? "npm start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI && !production,
    timeout: 120_000,
  },
});
