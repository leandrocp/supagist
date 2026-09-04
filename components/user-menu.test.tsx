// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UserMenu } from "./user-menu";

const { mockSignOut, mockPush, mockSetTheme } = vi.hoisted(() => ({
  mockSignOut: vi.fn(async () => undefined),
  mockPush: vi.fn(),
  mockSetTheme: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: mockSignOut } }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));
vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark", setTheme: mockSetTheme }),
}));

afterEach(() => {
  cleanup();
  mockSignOut.mockClear();
  mockPush.mockClear();
  mockSetTheme.mockClear();
});

function open() {
  render(<UserMenu username="leandrocp" avatarUrl={null} />);
  // Radix opens a DropdownMenu on pointerdown, which `fireEvent.click` does not
  // synthesise; the keyboard path is equivalent and works under happy-dom.
  fireEvent.keyDown(screen.getByRole("button", { name: "Account menu for leandrocp" }), {
    key: "Enter",
  });
}

describe("UserMenu", () => {
  it("collapses identity, theme and sign-out behind one avatar trigger", () => {
    render(<UserMenu username="leandrocp" avatarUrl={null} />);

    // Exactly one nav control, not three separate widgets.
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Account menu for leandrocp" })).toBeTruthy();
    // The bare name and a standalone Logout button are gone from the bar.
    expect(screen.queryByText(/^Hey/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Logout" })).toBeNull();
  });

  it("names the signed-in user inside the menu", async () => {
    open();
    await waitFor(() => expect(screen.getByText("leandrocp")).toBeTruthy());
  });

  it("changes the theme from the menu", async () => {
    open();
    const light = await screen.findByRole("menuitemradio", { name: /Light/ });
    fireEvent.click(light);

    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("marks the active theme as checked", async () => {
    open();
    const dark = await screen.findByRole("menuitemradio", { name: /Dark/ });
    expect(dark.getAttribute("aria-checked")).toBe("true");
  });

  it("signs out and returns to the home page", async () => {
    open();
    fireEvent.click(await screen.findByRole("menuitem", { name: /Log out/ }));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"));
  });
});
