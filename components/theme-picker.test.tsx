// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemePicker } from "./theme-picker";

afterEach(cleanup);

describe("ThemePicker", () => {
  it("constrains the long option list to the available popover viewport", () => {
    render(
      <ThemePicker
        value="github_dark"
        onChange={vi.fn()}
        themes={[
          { id: "github_dark", label: "github_dark" },
          { id: "github_light", label: "github_light" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Theme" }));

    const list = document.querySelector('[data-slot="command-list"]') as HTMLElement;
    const popover = document.querySelector('[data-slot="popover-content"]') as HTMLElement;

    expect(list.style.maxHeight).toBe(
      "min(70vh, calc(var(--radix-popover-content-available-height) - 3rem))",
    );
    expect(popover.className).toContain("max-h-(--radix-popover-content-available-height)");
    expect(popover.className).toContain("overflow-hidden");
    expect(screen.getByPlaceholderText("Search themes…")).toBeTruthy();
    expect(screen.getByText("Lumis themes")).toBeTruthy();
    expect(screen.queryByText("Brands")).toBeNull();
  });

  it("only emits supplied Lumis theme ids", () => {
    const onChange = vi.fn();
    render(
      <ThemePicker
        value="github_dark"
        onChange={onChange}
        themes={[
          { id: "github_dark", label: "github_dark" },
          { id: "github_light", label: "github_light" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Theme" }));
    fireEvent.click(screen.getByText("github_light"));

    expect(onChange).toHaveBeenCalledWith("github_light");
  });
});
