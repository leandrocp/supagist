// @vitest-environment happy-dom

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RootLayout from "./layout";

vi.mock("next/font/google", () => ({
  Geist: () => ({ className: "geist" }),
  Source_Code_Pro: () => ({ variable: "source-code-pro" }),
}));
vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("./providers", () => ({
  Providers: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/notifications-listener", () => ({
  NotificationsListener: () => null,
}));
vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => null,
}));
vi.mock("@vercel/analytics/next", () => ({
  Analytics: () => <script data-testid="vercel-analytics" />,
}));

const config = vi.hoisted(() => ({ hasEnvVars: false }));
vi.mock("@/lib/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/utils")>()),
  get hasEnvVars() {
    return config.hasEnvVars;
  },
}));

afterEach(cleanup);

describe("RootLayout", () => {
  it.each([false, true])("mounts analytics once with Supabase configured: %s", (hasEnvVars) => {
    config.hasEnvVars = hasEnvVars;
    render(
      <RootLayout>
        <main>Page content</main>
      </RootLayout>,
      { container: document },
    );

    expect(screen.getByRole("main").textContent).toBe("Page content");
    expect(screen.getAllByTestId("vercel-analytics")).toHaveLength(1);
    expect(document.body.contains(screen.getByTestId("vercel-analytics"))).toBe(true);
  });
});
