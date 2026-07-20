// @vitest-environment happy-dom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Providers } from "./providers";

const authMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getSession: vi.fn(),
  signInAnonymously: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
  callback: undefined as undefined | ((event: string, session: object | null) => void),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: authMocks.createClient,
}));

beforeEach(() => {
  authMocks.createClient.mockReturnValue({
    auth: {
      getSession: authMocks.getSession,
      signInAnonymously: authMocks.signInAnonymously,
      onAuthStateChange: authMocks.onAuthStateChange,
    },
  });
  authMocks.getSession.mockResolvedValue({ data: { session: null } });
  authMocks.signInAnonymously.mockResolvedValue({ error: null });
  authMocks.onAuthStateChange.mockImplementation((callback) => {
    authMocks.callback = callback;
    return { data: { subscription: { unsubscribe: authMocks.unsubscribe } } };
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  authMocks.callback = undefined;
});

describe("Providers", () => {
  it("does not create a Supabase client when session bootstrapping is disabled", () => {
    render(
      <Providers enableSupabaseSession={false}>
        <div>child</div>
      </Providers>,
    );

    expect(authMocks.createClient).not.toHaveBeenCalled();
  });

  it("creates a Supabase client and bootstraps an anonymous visitor", async () => {
    render(
      <Providers>
        <div>child</div>
      </Providers>,
    );

    await waitFor(() => expect(authMocks.createClient).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(authMocks.signInAnonymously).toHaveBeenCalledTimes(1));
    expect(authMocks.onAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it("does not replace an existing session", async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });

    render(
      <Providers>
        <div>child</div>
      </Providers>,
    );

    await waitFor(() => expect(authMocks.getSession).toHaveBeenCalledTimes(1));
    expect(authMocks.signInAnonymously).not.toHaveBeenCalled();
  });

  it("re-establishes an anonymous session after logout", async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });

    render(
      <Providers>
        <div>child</div>
      </Providers>,
    );
    await waitFor(() => expect(authMocks.onAuthStateChange).toHaveBeenCalledTimes(1));

    authMocks.callback?.("SIGNED_OUT", null);

    await waitFor(() => expect(authMocks.signInAnonymously).toHaveBeenCalledTimes(1));
  });

  it("unsubscribes from auth changes on unmount", async () => {
    const rendered = render(
      <Providers>
        <div>child</div>
      </Providers>,
    );
    await waitFor(() => expect(authMocks.onAuthStateChange).toHaveBeenCalledTimes(1));

    rendered.unmount();

    expect(authMocks.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
