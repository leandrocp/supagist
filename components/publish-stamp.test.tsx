// @vitest-environment happy-dom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markJustPublished } from "@/lib/motion";
import { PublishStamp } from "./publish-stamp";

const PATH = "/greet-ts-abc123";
const URL_ = `https://supagist.app${PATH}`;

function setReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: reduce && query === "(prefers-reduced-motion: reduce)",
    media: query,
  })) as unknown as typeof window.matchMedia;
}

/** The page's canvas the seal is pressed onto, plus the stamp itself. */
function renderStamp(visibility: "public" | "private" = "public") {
  return render(
    <>
      <div data-testid="snippet-canvas" />
      <PublishStamp visibility={visibility} url={URL_} />
    </>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState(null, "", PATH);
  setReducedMotion(false);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.sessionStorage.clear();
});

describe("PublishStamp", () => {
  it("renders nothing on an ordinary visit", () => {
    renderStamp();
    act(() => vi.advanceTimersByTime(2000));

    expect(screen.queryByTestId("publish-stamp")).toBeNull();
    expect(screen.queryByTestId("publish-link")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("presses the wax seal onto the canvas, then reveals the copied link", () => {
    markJustPublished(PATH, true);
    renderStamp();

    const stamp = screen.getByTestId("publish-stamp");
    expect(stamp.dataset.variant).toBe("public");
    expect(stamp.dataset.motion).toBe("full");
    // Pressed onto the canvas, and decorative only.
    expect(stamp.parentElement?.dataset.testid).toBe("snippet-canvas");
    expect(stamp.getAttribute("aria-hidden")).toBe("true");
    expect(stamp.querySelector('img[src="/brand/seal-r3-240.png"]')).not.toBeNull();
    expect(screen.getByRole("status").textContent).toBe("Published. Link copied.");

    // The link waits for the impact, so it doesn't compete with the seal.
    expect(screen.queryByTestId("publish-link")).toBeNull();
    act(() => vi.advanceTimersByTime(700));
    const link = screen.getByTestId("publish-link");
    expect(link.querySelector("a")?.getAttribute("href")).toBe(URL_);
    expect(link.textContent).toContain("supagist.app/greet-ts-abc123");
    expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();
  });

  it("uses the flat one-colour seal for private snippets", () => {
    markJustPublished(PATH, false);
    renderStamp("private");

    const stamp = screen.getByTestId("publish-stamp");
    expect(stamp.dataset.variant).toBe("private");
    expect(stamp.querySelector('img[src="/brand/seal-a-wax.svg"]')).not.toBeNull();
    expect(stamp.querySelector('img[src="/brand/seal-r3-240.png"]')).toBeNull();
    // The clipboard write failed, so the link offers to copy instead.
    act(() => vi.advanceTimersByTime(700));
    expect(screen.getByRole("button", { name: "Copy link" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Published.");
  });

  it("falls back to a fade and shows the link at once with reduced motion", () => {
    setReducedMotion(true);
    markJustPublished(PATH, true);
    renderStamp();

    expect(screen.getByTestId("publish-stamp").dataset.motion).toBe("reduced");
    act(() => vi.advanceTimersByTime(0));
    expect(screen.getByTestId("publish-link")).toBeTruthy();
  });

  it("plays once: a second visit to the page shows nothing", () => {
    markJustPublished(PATH, true);
    renderStamp();
    expect(screen.getByTestId("publish-stamp")).toBeTruthy();
    cleanup();

    renderStamp();
    expect(screen.queryByTestId("publish-stamp")).toBeNull();
  });

  it("doesn't stamp a different snippet than the one just published", () => {
    markJustPublished("/other-ts-zzz999", true);
    renderStamp();
    expect(screen.queryByTestId("publish-stamp")).toBeNull();
  });

  it("lets the link be dismissed and hides it on its own later", () => {
    markJustPublished(PATH, true);
    renderStamp();
    act(() => vi.advanceTimersByTime(700));

    act(() => screen.getByRole("button", { name: "Dismiss" }).click());
    expect(screen.queryByTestId("publish-link")).toBeNull();

    cleanup();
    markJustPublished(PATH, true);
    renderStamp();
    act(() => vi.advanceTimersByTime(12_100));
    expect(screen.queryByTestId("publish-link")).toBeNull();
  });
});
