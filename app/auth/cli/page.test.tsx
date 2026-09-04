// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockCreateServerClient, mockCreateBrowserClient, mockRedirect } = vi.hoisted(() => ({
  mockCreateServerClient: vi.fn(),
  mockCreateBrowserClient: vi.fn(),
  mockRedirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mockCreateServerClient }));
vi.mock("@/lib/supabase/client", () => ({ createClient: mockCreateBrowserClient }));
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));

import Page from "./page";
import { CliAuthorizeForm } from "./cli-authorize-form";

const STATE = "s".repeat(43);

function serverClient(claims: Record<string, unknown> | null) {
  return { auth: { getClaims: vi.fn().mockResolvedValue({ data: claims ? { claims } : null }) } };
}

async function renderPage(params: { port?: string; state?: string }) {
  const ui = await Page({ searchParams: Promise.resolve(params) });
  render(ui);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateServerClient.mockResolvedValue(
    serverClient({ sub: "user-1", is_anonymous: false, user_metadata: { user_name: "leandrocp" } }),
  );
});

// Auto-cleanup only runs when Vitest globals are enabled, which this project
// does not use — without this every render stacks in the same document.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("/auth/cli — request validation", () => {
  it("refuses a missing port or state instead of rendering a consent button", async () => {
    await renderPage({});
    expect(screen.getByText("Invalid CLI request")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Authorize/ })).toBeNull();
  });

  it("refuses a privileged port", async () => {
    await renderPage({ port: "80", state: STATE });
    expect(screen.getByText("Invalid CLI request")).toBeTruthy();
  });

  it("refuses a state with characters outside base64url", async () => {
    await renderPage({ port: "51234", state: `${"a".repeat(20)}<img>` });
    expect(screen.getByText("Invalid CLI request")).toBeTruthy();
  });

  it("does not reach Supabase for an invalid request", async () => {
    await renderPage({ port: "0", state: STATE });
    expect(mockCreateServerClient).not.toHaveBeenCalled();
  });
});

describe("/auth/cli — authentication gate", () => {
  it("sends a logged-out visitor to login, preserving the CLI round-trip", async () => {
    mockCreateServerClient.mockResolvedValue(serverClient(null));
    await expect(renderPage({ port: "51234", state: STATE })).rejects.toThrow(
      `REDIRECT:/auth/login?next=${encodeURIComponent(`/auth/cli?port=51234&state=${STATE}`)}`,
    );
  });

  it("treats an anonymous session as logged out", async () => {
    // Every visitor gets an anonymous session on load; only a persistent
    // account may authorize a CLI that can publish.
    mockCreateServerClient.mockResolvedValue(serverClient({ sub: "guest", is_anonymous: true }));
    await expect(renderPage({ port: "51234", state: STATE })).rejects.toThrow(/REDIRECT:/);
  });

  it("shows the account the CLI would act as", async () => {
    await renderPage({ port: "51234", state: STATE });
    expect(screen.getByText("leandrocp")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Authorize CLI/ })).toBeTruthy();
  });

  it("falls back to the email when there is no GitHub handle", async () => {
    mockCreateServerClient.mockResolvedValue(
      serverClient({ sub: "user-1", is_anonymous: false, email: "dev@example.com" }),
    );
    await renderPage({ port: "51234", state: STATE });
    expect(screen.getByText("dev@example.com")).toBeTruthy();
  });
});

describe("CliAuthorizeForm", () => {
  const session = {
    access_token: "access",
    refresh_token: "refresh",
    expires_at: 1_700_000_000,
  };

  beforeEach(() => {
    mockCreateBrowserClient.mockReturnValue({
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session } }) },
    });
  });

  it("posts the session to the loopback listener with the echoed state", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<CliAuthorizeForm port={51234} state={STATE} username="leandrocp" />);
    await userEvent.click(screen.getByRole("button", { name: /Authorize CLI/ }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:51234/callback");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      state: STATE,
      accessToken: "access",
      refreshToken: "refresh",
      expiresAt: 1_700_000_000,
      username: "leandrocp",
    });
  });

  it("confirms success and tells the user to return to the terminal", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

    render(<CliAuthorizeForm port={51234} state={STATE} username="leandrocp" />);
    await userEvent.click(screen.getByRole("button", { name: /Authorize CLI/ }));

    expect(await screen.findByText(/Return to your terminal/)).toBeTruthy();
  });

  it("explains the failure when the listener is gone", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    render(<CliAuthorizeForm port={51234} state={STATE} username="leandrocp" />);
    await userEvent.click(screen.getByRole("button", { name: /Authorize CLI/ }));

    expect(await screen.findByText(/Could not reach the CLI/)).toBeTruthy();
  });

  it("does not send anything when the session has gone", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mockCreateBrowserClient.mockReturnValue({
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    });

    render(<CliAuthorizeForm port={51234} state={STATE} username="leandrocp" />);
    await userEvent.click(screen.getByRole("button", { name: /Authorize CLI/ }));

    expect(await screen.findByText(/session expired/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces a non-2xx callback as a failure rather than a silent success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 400 })));

    render(<CliAuthorizeForm port={51234} state={STATE} username="leandrocp" />);
    await userEvent.click(screen.getByRole("button", { name: /Authorize CLI/ }));

    expect(await screen.findByText(/Could not reach the CLI/)).toBeTruthy();
  });
});
