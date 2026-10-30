// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ConsentForm } from "./consent-form";

const { router, auth } = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  auth: {
    getClaims: vi.fn(),
    oauth: {
      getAuthorizationDetails: vi.fn(),
      approveAuthorization: vi.fn(),
      denyAuthorization: vi.fn(),
    },
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth }) }));

const details = {
  authorization_id: "request-123",
  client: { id: "client-456", name: "Example MCP client", uri: "", logo_uri: "" },
  user: { id: "user-789", email: "test@example.com" },
  redirect_uri: "https://client.example/callback",
  scope: "openid email profile",
};
beforeEach(() => {
  vi.resetAllMocks();
  auth.getClaims.mockResolvedValue({ data: { claims: { sub: "user-789" } }, error: null });
  auth.oauth.getAuthorizationDetails.mockResolvedValue({ data: details, error: null });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it.each([null, { sub: "anonymous", is_anonymous: true }])(
  "requires persistent sign-in and preserves the consent request",
  async (claims) => {
    auth.getClaims.mockResolvedValue({ data: { claims }, error: null });
    render(<ConsentForm authorizationId="request-123" />);
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        "/auth/login?next=%2Foauth%2Fconsent%3Fauthorization_id%3Drequest-123",
      ),
    );
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
  },
);

it.each(["Approve", "Deny"])(
  "shows the requested permissions and sends an explicit %s decision",
  async (decision) => {
    const navigate = vi.spyOn(window.location, "assign").mockImplementation(() => {});
    auth.oauth.approveAuthorization.mockResolvedValue({
      data: { redirect_url: "https://client.example/callback?code=approved" },
      error: null,
    });
    auth.oauth.denyAuthorization.mockResolvedValue({
      data: { redirect_url: "https://client.example/callback?error=access_denied" },
      error: null,
    });
    render(<ConsentForm authorizationId="request-123" />);
    const button = await screen.findByRole("button", { name: decision });
    expect(screen.getByText("test@example.com")).toBeTruthy();
    expect(screen.getByText("client-456")).toBeTruthy();
    expect(screen.getByText("https://client.example/callback")).toBeTruthy();
    for (const scope of ["openid", "email", "profile"])
      expect(screen.getByText(scope)).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        `https://client.example/callback?${decision === "Approve" ? "code=approved" : "error=access_denied"}`,
      ),
    );
  },
);

it("handles existing consent without another decision", async () => {
  const navigate = vi.spyOn(window.location, "assign").mockImplementation(() => {});
  auth.oauth.getAuthorizationDetails.mockResolvedValue({
    data: { redirect_url: "https://client.example/callback?code=existing" },
    error: null,
  });
  render(<ConsentForm authorizationId="request-123" />);
  await waitFor(() =>
    expect(navigate).toHaveBeenCalledWith("https://client.example/callback?code=existing"),
  );
  expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
});

it("rejects missing and expired requests without offering approval", async () => {
  const { unmount } = render(<ConsentForm authorizationId="" />);
  expect(screen.getByRole("alert").textContent).toContain("Missing authorization request");
  unmount();
  auth.oauth.getAuthorizationDetails.mockResolvedValue({
    data: null,
    error: { message: "expired" },
  });
  render(<ConsentForm authorizationId="expired" />);
  expect((await screen.findByRole("alert")).textContent).toContain("invalid or expired");
  expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
});

it("disables both decisions while saving and lets the user retry a failed decision", async () => {
  let finish!: (value: unknown) => void;
  auth.oauth.approveAuthorization.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  render(<ConsentForm authorizationId="request-123" />);
  fireEvent.click(await screen.findByRole("button", { name: "Approve" }));
  expect((screen.getByRole("button", { name: "Deny" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: /Approve/ }) as HTMLButtonElement).disabled).toBe(
    true,
  );
  finish({ data: null, error: { message: "network error" } });
  expect((await screen.findByRole("alert")).textContent).toContain("could not be saved");
  expect((screen.getByRole("button", { name: "Deny" }) as HTMLButtonElement).disabled).toBe(false);
});
