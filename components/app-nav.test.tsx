// @vitest-environment happy-dom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppNav } from "./app-nav";

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/utils")>();
  return { ...actual, hasEnvVars: true };
});

// Server components that hit Supabase — the nav only needs to place them.
vi.mock("@/components/auth-button", () => ({ AuthButton: () => <button>account</button> }));
vi.mock("@/components/home-presence", () => ({
  HomePresence: () => <div data-testid="home-presence" />,
}));
vi.mock("@/components/theme-switcher", () => ({ ThemeSwitcher: () => <button>Theme</button> }));

afterEach(cleanup);

describe("AppNav", () => {
  it("puts brand and destinations on the left, account on the right", () => {
    render(<AppNav />);

    const nav = screen.getByTestId("app-nav");
    const [left, right] = Array.from(nav.children) as HTMLElement[];

    expect(
      within(left)
        .getByRole("link", { name: /Supagist/ })
        .getAttribute("href"),
    ).toBe("/");
    expect(within(left).getByRole("link", { name: "New" }).getAttribute("href")).toBe("/");
    expect(within(left).getByRole("link", { name: "Snippets" }).getAttribute("href")).toBe(
      "/snippets",
    );
    expect(within(right).getByRole("button", { name: "account" })).toBeTruthy();
  });

  it("offers an explicit New link rather than relying on the wordmark", () => {
    render(<AppNav />);

    // Two routes to "/" is the point: the wordmark is branding, New is a verb.
    const homeLinks = screen
      .getAllByRole("link")
      .filter((l) => l.getAttribute("href") === "/")
      .map((l) => l.textContent);
    expect(homeLinks).toContain("New");
  });

  it("does not carry the Built on Supabase badge — that moved to the footer", () => {
    render(<AppNav />);

    expect(screen.queryByText("Built on Supabase")).toBeNull();
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
