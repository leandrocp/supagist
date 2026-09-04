// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SiteFooter } from "./site-footer";

afterEach(cleanup);

describe("SiteFooter", () => {
  it("carries the Built on Supabase badge that used to crowd the nav", () => {
    render(<SiteFooter />);

    expect(screen.getByText("Built on Supabase")).toBeTruthy();
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

  it("opens outbound links safely and keeps internal ones in place", () => {
    render(<SiteFooter />);

    const github = screen.getByRole("link", { name: "GitHub" });
    expect(github.getAttribute("target")).toBe("_blank");
    expect(github.getAttribute("rel")).toContain("noopener");

    expect(screen.getByRole("link", { name: "Terms" }).getAttribute("target")).toBeNull();
  });
});
