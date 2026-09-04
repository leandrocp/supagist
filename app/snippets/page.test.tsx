// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetMySnippets, mockGetClaims } = vi.hoisted(() => ({
  mockGetMySnippets: vi.fn(),
  mockGetClaims: vi.fn(),
}));

vi.mock("@/app/actions/get-my-snippets", () => ({ getMySnippets: mockGetMySnippets }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims: mockGetClaims } }),
}));
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/utils")>();
  return { ...actual, hasEnvVars: true };
});
vi.mock("@/components/app-nav", () => ({ AppNav: () => <nav data-testid="app-nav" /> }));

import SnippetsPage from "./page";

const snippet = {
  short_id: "abc123",
  slug: "hello-ts",
  filename: "hello.ts",
  language: "typescript",
  created_at: "2026-07-14T12:00:00.000Z",
  view_count: 3,
};

beforeEach(() => {
  mockGetMySnippets.mockReset();
  mockGetClaims.mockReset();
});
afterEach(cleanup);

function signedIn() {
  mockGetClaims.mockResolvedValue({ data: { claims: { sub: "user-1", is_anonymous: false } } });
}

describe("/snippets", () => {
  it("lists the signed-in user's snippets", async () => {
    signedIn();
    mockGetMySnippets.mockResolvedValue([snippet]);

    render(await SnippetsPage());

    expect(screen.getByRole("heading", { name: "Your snippets" })).toBeTruthy();
    expect(screen.getByText("1 published snippet, newest first.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /hello\.ts/i }).getAttribute("href")).toBe(
      "/hello-ts-abc123",
    );
  });

  it("pluralizes the summary line", async () => {
    signedIn();
    mockGetMySnippets.mockResolvedValue([snippet, { ...snippet, short_id: "def456" }]);

    render(await SnippetsPage());

    expect(screen.getByText("2 published snippets, newest first.")).toBeTruthy();
  });

  it("prompts an empty account to create its first snippet", async () => {
    signedIn();
    mockGetMySnippets.mockResolvedValue([]);

    render(await SnippetsPage());

    expect(screen.getByTestId("snippets-empty")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Create a snippet" }).getAttribute("href")).toBe("/");
  });

  it("asks signed-out visitors to log in without querying for snippets", async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: null } });

    render(await SnippetsPage());

    expect(screen.getByTestId("snippets-signed-out")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toBe("/auth/login");
    expect(mockGetMySnippets).not.toHaveBeenCalled();
  });

  it("treats an anonymous session as signed out — it owns no snippets", async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: "anon-1", is_anonymous: true } } });

    render(await SnippetsPage());

    expect(screen.getByTestId("snippets-signed-out")).toBeTruthy();
    expect(mockGetMySnippets).not.toHaveBeenCalled();
  });
});
