// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomePresence } from "./home-presence";

const { mockChannel, mockGetUser } = vi.hoisted(() => {
  const state: Record<string, Array<{ online_at: string; name: string; avatar_url?: string }>> = {};
  const handlers: Array<() => void> = [];
  return {
    mockChannel: {
      state,
      handlers,
      on: vi.fn(function (this: unknown, _type: string, _filter: unknown, cb: () => void) {
        handlers.push(cb);
        return this;
      }),
      subscribe: vi.fn(async (cb: (status: string) => void) => {
        await cb("SUBSCRIBED");
      }),
      track: vi.fn(async () => undefined),
      untrack: vi.fn(async () => undefined),
      presenceState: () => state,
    },
    mockGetUser: vi.fn(async () => ({ data: { user: null } })),
  };
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    channel: () => mockChannel,
    removeChannel: vi.fn(async () => undefined),
  }),
}));

afterEach(() => {
  cleanup();
  for (const key of Object.keys(mockChannel.state)) delete mockChannel.state[key];
  mockChannel.handlers.length = 0;
});

function seed(names: string[]) {
  names.forEach((name, i) => {
    mockChannel.state[`key-${i}`] = [{ online_at: new Date().toISOString(), name }];
  });
  mockChannel.handlers.forEach((cb) => cb());
}

describe("HomePresence in the app nav", () => {
  it("renders nothing until someone is present", () => {
    const { container } = render(<HomePresence />);
    expect(container.textContent).toBe("");
  });

  it("lays out as a single nav row rather than a stacked header block", async () => {
    render(<HomePresence />);
    await waitFor(() => expect(mockChannel.subscribe).toHaveBeenCalled());
    seed(["ada"]);

    const root = await screen.findByTestId("home-presence");
    // A nav cell centres on the row and must not add its own top offset.
    expect(root.className).toContain("items-center");
    expect(root.className).not.toContain("pt-1");
    expect(root.className).not.toContain("justify-center");
  });

  it("keeps avatars but drops the sentence on narrow viewports", async () => {
    render(<HomePresence />);
    await waitFor(() => expect(mockChannel.subscribe).toHaveBeenCalled());
    seed(["ada", "grace"]);

    const label = (await screen.findByTestId("home-presence")).querySelector("span.truncate");
    expect(label?.className).toContain("hidden");
    expect(label?.className).toContain("md:inline");
    expect(label?.textContent).toContain("and 1 other are writing snippets");
  });
});
