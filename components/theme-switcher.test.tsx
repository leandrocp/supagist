// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeSwitcher } from "./theme-switcher";

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

describe("ThemeSwitcher", () => {
  it("exposes an accessible 44px theme trigger", async () => {
    render(<ThemeSwitcher />);

    const trigger = await screen.findByRole("button", { name: "Choose color theme" });

    expect(trigger.className).toContain("size-11");
  });
});
