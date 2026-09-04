// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SiteFooter } from "./site-footer";

afterEach(cleanup);

describe("SiteFooter", () => {
  it("credits the stack once, without a duplicate Built on Supabase badge", () => {
    render(<SiteFooter />);

    // The badge said strictly less than the credit line beside it.
    expect(screen.queryByText("Built on Supabase")).toBeNull();
    expect(screen.getByText(/Built with/)).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Supabase" })).toHaveLength(1);
  });

  it("keeps the project and credit links", () => {
    render(<SiteFooter />);

    expect(screen.getByRole("link", { name: "Terms" }).getAttribute("href")).toBe("/terms");
    expect(screen.getByRole("link", { name: "GitHub" }).getAttribute("href")).toBe(
      "https://github.com/leandrocp/supagist",
    );
    expect(screen.getByRole("link", { name: "Supabase" }).getAttribute("href")).toBe(
      "https://supabase.com",
    );
    expect(screen.getByRole("link", { name: "Lumis" }).getAttribute("href")).toBe(
      "https://lumis.sh",
    );
  });

  it("pads itself only when rendered full-bleed, matching AppNav", () => {
    // On the home page the nav and composer span the viewport. A footer rule
    // confined to the centred column stopped short at both ends.
    const { unmount } = render(<SiteFooter fullBleed />);
    expect(screen.getByTestId("site-footer").className).toContain("px-5");
    unmount();

    render(<SiteFooter />);
    expect(screen.getByTestId("site-footer").className).not.toContain("px-5");
  });

  it("always carries the top divider", () => {
    render(<SiteFooter />);
    expect(screen.getByTestId("site-footer").className).toContain("border-t");
  });

  it("opens outbound links safely and keeps internal ones in place", () => {
    render(<SiteFooter />);

    const github = screen.getByRole("link", { name: "GitHub" });
    expect(github.getAttribute("target")).toBe("_blank");
    expect(github.getAttribute("rel")).toContain("noopener");

    expect(screen.getByRole("link", { name: "Terms" }).getAttribute("target")).toBeNull();
  });
});
