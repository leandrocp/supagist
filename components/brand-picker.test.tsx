// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BrandPicker } from "./brand-picker";

afterEach(cleanup);

describe("BrandPicker", () => {
  it("searches the complete brand catalog and applies a preset", () => {
    const onChange = vi.fn();
    render(<BrandPicker value={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Brand" }));
    expect(screen.getByPlaceholderText("Search brands…")).toBeTruthy();
    expect(screen.getByText("Supabase")).toBeTruthy();
    expect(screen.getByText("Anthropic")).toBeTruthy();
    expect(screen.getByText("Cursor")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("Search brands…"), {
      target: { value: "cloudflare" },
    });
    fireEvent.click(screen.getByText("Cloudflare"));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: "cloudflare" }));
  });

  it("shows Custom when the current controls no longer match a brand", () => {
    render(<BrandPicker value={null} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Brand" }).textContent).toContain("Custom");
  });

  it("falls back to an accent dot for a brand with no sourceable mark", () => {
    render(<BrandPicker value="plz" onChange={vi.fn()} />);

    // `plz` has no logo upstream, so its swatch must render the dot rather
    // than a masked <span> pointing at a file that does not exist.
    const trigger = screen.getByRole("button", { name: "Brand" });
    const fallback = trigger.querySelector("[data-testid='brand-logo-fallback']");
    expect(fallback).toBeTruthy();
    expect((fallback as HTMLElement).style.backgroundColor).toBeTruthy();
  });

  it("masks the brand mark for a brand that ships one", () => {
    render(<BrandPicker value="flue" onChange={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Brand" });
    expect(trigger.querySelector("[data-testid='brand-logo-fallback']")).toBeNull();
    expect(trigger.innerHTML).toContain("/brands/flue.svg");
  });
});
