// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SnippetList } from "./snippet-list";

afterEach(cleanup);

const snippet = {
  id: "00000000-0000-4000-8000-000000000001",
  short_id: "abc123",
  slug: "hello-ts",
  filename: "hello.ts",
  title: null,
  language: "typescript",
  created_at: "2026-07-14T12:00:00.000Z",
  view_count: 42,
  visibility: "public" as const,
  thumbnail_url: "https://cdn.test/snippet-images/u/snippets/s/canonical.png",
};

describe("SnippetList", () => {
  it("links each card to the snippet's slug-shortid path", () => {
    render(<SnippetList snippets={[snippet]} />);

    const link = screen.getByRole("link", { name: /hello\.ts/i });
    expect(link.getAttribute("href")).toBe("/hello-ts-abc123");
    // The thumbnail is the snippet's own stored render.
    expect(link.querySelector("img")?.getAttribute("src")).toBe(snippet.thumbnail_url);
  });

  it("shows language, date and view count", () => {
    render(<SnippetList snippets={[snippet]} />);

    expect(screen.getByText("TypeScript")).toBeTruthy();
    expect(screen.getByText(/Jul 14/)).toBeTruthy();
    expect(screen.getByText(/42 views/)).toBeTruthy();
  });

  it("marks only private snippets, so the author can tell them apart", () => {
    render(
      <SnippetList
        snippets={[
          snippet,
          {
            ...snippet,
            id: "s2",
            short_id: "def456",
            filename: "secret.ts",
            visibility: "private",
          },
        ]}
      />,
    );

    const [pub, priv] = screen.getAllByRole("listitem");
    expect(pub!.textContent).not.toContain("Private");
    expect(priv!.textContent).toContain("Private");
  });

  it("omits the view count when nothing has viewed the snippet yet", () => {
    render(<SnippetList snippets={[{ ...snippet, view_count: 0 }]} />);

    expect(screen.queryByText(/views/)).toBeNull();
  });

  it("omits the language badge when the snippet has none", () => {
    render(<SnippetList snippets={[{ ...snippet, language: null }]} />);

    expect(screen.queryByText("TypeScript")).toBeNull();
    expect(screen.getByRole("link", { name: /hello\.ts/i })).toBeTruthy();
  });

  it("renders an empty list without crashing so the page can own the empty state", () => {
    const { container } = render(<SnippetList snippets={[]} />);

    expect(container.querySelectorAll("li")).toHaveLength(0);
    expect(container.querySelector("ul")).toBeTruthy();
  });
});
