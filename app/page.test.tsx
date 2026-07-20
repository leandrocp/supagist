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

    expect(screen.getByText("Built on Supabase")).toBeTruthy();
    expect(screen.queryByText("A Supabase-native collaboration demo")).toBeNull();

    const footer = screen.getByRole("contentinfo");
    expect(footer.className).toContain("py-4");
    expect(screen.getByText("Composer").parentElement?.className).toContain("pb-0");
    expect(footer.textContent).toContain("Inspired by ray.so");
    expect(footer.textContent).not.toContain("Backgrounds by ray.so");
  });
});
