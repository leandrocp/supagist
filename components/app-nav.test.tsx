// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppNav } from "./app-nav";

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/utils")>();
  return { ...actual, hasEnvVars: true };
});

// Server components that hit Supabase — the nav only needs to place them.
vi.mock("@/components/auth-button", () => ({ AuthButton: () => <button>Log in</button> }));
vi.mock("@/components/home-presence", () => ({
  HomePresence: () => <div data-testid="home-presence" />,
}));
vi.mock("@/components/theme-switcher", () => ({ ThemeSwitcher: () => <button>Theme</button> }));

afterEach(cleanup);

describe("AppNav", () => {
  it("links to the snippets listing so it is reachable from every page", () => {
    render(<AppNav />);

    const link = screen.getByRole("link", { name: "Snippets" });
    expect(link.getAttribute("href")).toBe("/snippets");
  });

  it("keeps the brand as a link home", () => {
    render(<AppNav />);

    expect(screen.getByRole("link", { name: /Supagist/ }).getAttribute("href")).toBe("/");
  });

  it("shows lobby presence only where it is asked for", () => {
    const { unmount } = render(<AppNav />);
    expect(screen.queryByTestId("home-presence")).toBeNull();
    unmount();

    render(<AppNav showPresence />);
    expect(screen.getByTestId("home-presence")).toBeTruthy();
  });

  it("pads itself only when rendered full-bleed", () => {
    const { unmount } = render(<AppNav fullBleed />);
    expect(screen.getByTestId("app-nav").className).toContain("px-5");
    unmount();

    render(<AppNav />);
    expect(screen.getByTestId("app-nav").className).not.toContain("px-5");
  });
});
