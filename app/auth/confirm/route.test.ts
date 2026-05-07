import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { mockCreateClient, mockRedirect } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockRedirect: vi.fn((url: string) => {
    // Mirror next/navigation's behavior of throwing to halt execution.
    const err = new Error(`NEXT_REDIRECT:${url}`);
    (err as Error & { __redirect: string }).__redirect = url;
    throw err;
  }),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mockCreateClient }));
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));

import { GET } from "./route";

function makeRequest(url: string): NextRequest {
  return { url } as NextRequest;
}

function makeAuth({
  exchangeError = null as { message: string } | null,
  verifyError = null as { message: string } | null,
} = {}) {
  return {
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ data: null, error: exchangeError }),
      verifyOtp: vi.fn().mockResolvedValue({ data: null, error: verifyError }),
    },
  };
}

async function runAndCaptureRedirect(req: NextRequest): Promise<string> {
  try {
    await GET(req);
  } catch (e) {
    return (e as Error & { __redirect: string }).__redirect;
  }
  throw new Error("expected redirect to be called");
}

describe("/auth/confirm GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exchanges PKCE code and redirects to next", async () => {
    const supa = makeAuth();
    mockCreateClient.mockResolvedValueOnce(supa);

    const target = await runAndCaptureRedirect(
      makeRequest("https://supagist.app/auth/confirm?code=abc123&next=/profile"),
    );

    expect(supa.auth.exchangeCodeForSession).toHaveBeenCalledWith("abc123");
    expect(supa.auth.verifyOtp).not.toHaveBeenCalled();
    expect(target).toBe("/profile");
  });

  it("redirects PKCE code to / when next is missing", async () => {
    mockCreateClient.mockResolvedValueOnce(makeAuth());
    const target = await runAndCaptureRedirect(
      makeRequest("https://supagist.app/auth/confirm?code=abc123"),
    );
    expect(target).toBe("/");
  });

  it("redirects to /auth/error when PKCE exchange fails", async () => {
    mockCreateClient.mockResolvedValueOnce(makeAuth({ exchangeError: { message: "bad code" } }));
    const target = await runAndCaptureRedirect(
      makeRequest("https://supagist.app/auth/confirm?code=abc123"),
    );
    expect(target).toBe("/auth/error?error=bad%20code");
  });

  it("verifies OTP token_hash + type and redirects", async () => {
    const supa = makeAuth();
    mockCreateClient.mockResolvedValueOnce(supa);

    const target = await runAndCaptureRedirect(
      makeRequest("https://supagist.app/auth/confirm?token_hash=hash123&type=signup&next=/welcome"),
    );

    expect(supa.auth.verifyOtp).toHaveBeenCalledWith({ type: "signup", token_hash: "hash123" });
    expect(supa.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(target).toBe("/welcome");
  });

  it("redirects to /auth/error when OTP verify fails", async () => {
    mockCreateClient.mockResolvedValueOnce(makeAuth({ verifyError: { message: "expired" } }));
    const target = await runAndCaptureRedirect(
      makeRequest("https://supagist.app/auth/confirm?token_hash=hash123&type=signup"),
    );
    expect(target).toBe("/auth/error?error=expired");
  });

  it("redirects to error page when neither code nor token_hash/type are present", async () => {
    mockCreateClient.mockResolvedValueOnce(makeAuth());
    const target = await runAndCaptureRedirect(makeRequest("https://supagist.app/auth/confirm"));
    expect(target).toBe("/auth/error?error=No%20token%20hash%20or%20type");
  });
});
