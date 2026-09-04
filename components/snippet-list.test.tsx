// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SnippetList } from "./snippet-list";

afterEach(cleanup);

const snippet = {
  short_id: "abc123",
  slug: "hello-ts",
  filename: "hello.ts",
  language: "typescript",
  created_at: "2026-07-14T12:00:00.000Z",
  view_count: 42,
};

describe("SnippetList", () => {
  it("links each card to the snippet's slug-shortid path", () => {
    render(<SnippetList snippets={[snippet]} />);

    const link = screen.getByRole("link", { name: /hello\.ts/i });
    expect(link.getAttribute("href")).toBe("/hello-ts-abc123");
    expect(link.className).toContain("bg-surface-100");
    expect(link.className).toContain("hover:border-brand/30");
  });

  it("shows language, date and view count", () => {
    render(<SnippetList snippets={[snippet]} />);

    expect(screen.getByText("typescript")).toBeTruthy();
    expect(screen.getByText("Jul 14, 2026")).toBeTruthy();
    expect(screen.getByText("42 views")).toBeTruthy();
  });

  it("omits the view count when nothing has viewed the snippet yet", () => {
    render(<SnippetList snippets={[{ ...snippet, view_count: 0 }]} />);

    expect(screen.queryByText(/views/)).toBeNull();
  });

  it("omits the language badge when the snippet has none", () => {
    render(<SnippetList snippets={[{ ...snippet, language: null }]} />);

    expect(screen.queryByText("typescript")).toBeNull();
    expect(screen.getByRole("link", { name: /hello\.ts/i })).toBeTruthy();
  });

  it("renders an empty list without crashing so the page can own the empty state", () => {
    const { container } = render(<SnippetList snippets={[]} />);

    expect(container.querySelectorAll("li")).toHaveLength(0);
    expect(container.querySelector("ul")).toBeTruthy();
  });
});
