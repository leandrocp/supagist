// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "./page";

vi.mock("@/components/home-composer", () => ({
  HomeComposer: () => <section>Composer</section>,
}));
vi.mock("@/components/my-snippets", () => ({
  MySnippets: () => null,
}));
vi.mock("@/components/theme-switcher", () => ({
  ThemeSwitcher: () => <button type="button">Theme</button>,
}));
vi.mock("@/components/auth-button", () => ({
  AuthButton: () => null,
}));
vi.mock("@/components/env-var-warning", () => ({
  EnvVarWarning: () => null,
}));

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/utils")>();
  return { ...actual, hasEnvVars: false };
});

afterEach(cleanup);

describe("Home", () => {
  it("keeps Supabase attribution concise and credits ray.so as inspiration", () => {
    render(<Home />);

    // The "Built on Supabase" badge is gone — the credit line says the same
    // thing and names Lumis and ray.so besides.
    expect(screen.queryByText("Built on Supabase")).toBeNull();
    expect(screen.queryByText("A Supabase-native collaboration demo")).toBeNull();

    const footer = screen.getByRole("contentinfo");
    expect(footer.textContent).toContain("Inspired by ray.so");
    expect(footer.textContent).not.toContain("Backgrounds by ray.so");
  });

  it("opens editor first: a one-line headline, the intro envelope and no extra call to action", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Code worth sharing.");
    expect(screen.getByTestId("intro-envelope").getAttribute("aria-hidden")).toBe("true");
    // The card is the call to action; the big looping envelope is gone.
    expect(screen.queryByRole("link", { name: "Create a snippet" })).toBeNull();
    expect(screen.queryByTestId("hero-envelope")).toBeNull();
  });

  it("sends both agent links to the on-site /agents quickstart", () => {
    render(<Home />);
    const links = [
      screen.getByRole("link", { name: /get the skill/i }),
      screen.getByRole("link", { name: /render it from your agent/i }),
    ];
    for (const link of links) {
      expect(link.getAttribute("href")).toBe("/agents");
      expect(link.getAttribute("target")).toBeNull();
    }
  });
});
