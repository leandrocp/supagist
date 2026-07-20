// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MySnippets } from "./my-snippets";

const { mockGetMySnippets } = vi.hoisted(() => ({
  mockGetMySnippets: vi.fn(),
}));

vi.mock("@/app/actions/get-my-snippets", () => ({
  getMySnippets: mockGetMySnippets,
}));
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/utils")>();
  return { ...actual, hasEnvVars: true };
});

afterEach(() => {
  cleanup();
  mockGetMySnippets.mockReset();
});

describe("MySnippets", () => {
  it("uses the Studio-style section hierarchy and semantic snippet surface", async () => {
    mockGetMySnippets.mockResolvedValue([
      {
        short_id: "abc123",
        slug: "hello-ts",
        filename: "hello.ts",
        language: "typescript",
        created_at: "2026-07-14T12:00:00.000Z",
        view_count: 42,
      },
    ]);

    const view = await MySnippets();
    render(view);

    expect(screen.getByRole("heading", { name: "Your snippets" })).toBeTruthy();
    expect(screen.getByText("Continue from your recent work.")).toBeTruthy();
    expect(screen.getByText("typescript")).toBeTruthy();

    const link = screen.getByRole("link", { name: /hello\.ts/i });
    expect(link.className).toContain("bg-surface-100");
    expect(link.className).toContain("hover:border-brand/30");
  });
});
