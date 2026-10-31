// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import DataHelpPage from "./help/data/page";
import PrivacyPage from "./privacy/page";
import TermsPage from "./terms/page";

afterEach(cleanup);

const contact = () =>
  screen.getAllByRole("link", { name: "supagist@leandro.io" }).map((a) => a.getAttribute("href"));

describe("legal pages", () => {
  it("terms keep the original clauses and add acceptable use, removal and contact", () => {
    render(<TermsPage />);
    for (const clause of [
      "Supagist is open source.",
      "No data is sold or shared with third parties.",
      "Inactive snippets may be deleted after 6 months.",
      "Acceptable use.",
      "Your content and our right to remove it.",
      "No warranty and limited liability.",
      "Changes to these terms.",
    ])
      expect(screen.getByText(clause)).toBeTruthy();
    expect(screen.getByText(/otherwise objectionable content/)).toBeTruthy();
    expect(screen.getByText(/illegal content/)).toBeTruthy();
    expect(contact()).toContain("mailto:supagist@leandro.io");
  });

  it("privacy names the processors, the six-month deletion and no sale or ads", () => {
    render(<PrivacyPage />);
    for (const processor of ["Supabase", "Vercel", "GitHub"])
      expect(screen.getAllByText(processor).length).toBeGreaterThan(0);
    expect(screen.getByText(/not been viewed for six months are deleted/)).toBeTruthy();
    expect(screen.getByText(/We do not sell your data, we do not show ads/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Managing your data" }).getAttribute("href")).toBe(
      "/help/data",
    );
    expect(contact()).toContain("mailto:supagist@leandro.io");
  });

  it("data help points to the snippets list and to email for deletion that is not self-serve", () => {
    render(<DataHelpPage />);
    expect(screen.getByRole("link", { name: "Your snippets" }).getAttribute("href")).toBe(
      "/snippets",
    );
    expect(screen.getByText(/no self-serve account deletion yet/)).toBeTruthy();
    expect(screen.getByText(/There is no delete button yet/)).toBeTruthy();
    expect(contact()).toContain("mailto:supagist@leandro.io");
  });
});
