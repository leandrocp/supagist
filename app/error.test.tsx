// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GlobalError from "./error";

const originalError = console.error;

afterEach(() => {
  cleanup();
  console.error = originalError;
});

describe("GlobalError", () => {
  it("invokes reset when 'Try again' is clicked", async () => {
    console.error = vi.fn();
    const reset = vi.fn();
    render(<GlobalError error={Object.assign(new Error("boom"), {})} reset={reset} />);
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("surfaces the error digest when present", () => {
    console.error = vi.fn();
    const error = Object.assign(new Error("boom"), { digest: "abc123" });
    render(<GlobalError error={error} reset={() => {}} />);
    expect(screen.getByText(/Reference: abc123/)).toBeTruthy();
  });

  it("hides the digest line when no digest is present", () => {
    console.error = vi.fn();
    render(<GlobalError error={new Error("boom")} reset={() => {}} />);
    expect(screen.queryByText(/Reference:/)).toBeNull();
  });

  it("logs the error to console.error so it surfaces in dev tools", () => {
    const spy = vi.fn();
    console.error = spy;
    const error = new Error("boom");
    render(<GlobalError error={error} reset={() => {}} />);
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/route render error/), error);
  });
});
