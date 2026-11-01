// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { JUST_PUBLISHED_KEY, exitThen, markJustPublished, play, takeJustPublished } from "./motion";

function setReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: reduce && query === "(prefers-reduced-motion: reduce)",
    media: query,
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("just-published marker", () => {
  it("is read once, for the snippet that was published", () => {
    markJustPublished("/greet-ts-abc123", true);

    expect(takeJustPublished("/greet-ts-abc123")).toEqual({
      path: "/greet-ts-abc123",
      copied: true,
    });
    // A reload of the same page doesn't stamp again.
    expect(takeJustPublished("/greet-ts-abc123")).toBeNull();
  });

  it("leaves another snippet's marker for that snippet's page", () => {
    markJustPublished("/greet-ts-abc123", false);

    expect(takeJustPublished("/other-ts-zzz999")).toBeNull();
    expect(takeJustPublished("/greet-ts-abc123")).toEqual({
      path: "/greet-ts-abc123",
      copied: false,
    });
  });

  it("drops a stale marker, e.g. from a tab restored much later", () => {
    const publishedAt = Date.parse("2026-11-01T12:00:00Z");
    vi.spyOn(Date, "now").mockReturnValue(publishedAt);
    markJustPublished("/greet-ts-abc123", true);

    expect(takeJustPublished("/greet-ts-abc123", publishedAt + 61_000)).toBeNull();
    expect(window.sessionStorage.getItem(JUST_PUBLISHED_KEY)).toBeNull();
  });

  it("still plays within the first minute", () => {
    const publishedAt = Date.parse("2026-11-01T12:00:00Z");
    vi.spyOn(Date, "now").mockReturnValue(publishedAt);
    markJustPublished("/greet-ts-abc123", true);

    expect(takeJustPublished("/greet-ts-abc123", publishedAt + 59_000)).not.toBeNull();
  });

  it("ignores and clears a malformed marker", () => {
    window.sessionStorage.setItem(JUST_PUBLISHED_KEY, "{not json");
    expect(takeJustPublished("/greet-ts-abc123")).toBeNull();
    expect(window.sessionStorage.getItem(JUST_PUBLISHED_KEY)).toBeNull();

    window.sessionStorage.setItem(JUST_PUBLISHED_KEY, JSON.stringify({ path: "/greet-ts-abc123" }));
    expect(takeJustPublished("/greet-ts-abc123")).toBeNull();
  });
});

describe("play / exitThen", () => {
  it("plays nothing and acts at once when motion is reduced", () => {
    setReducedMotion(true);
    const element = document.createElement("span");
    const animate = vi.fn();
    element.animate = animate;
    const action = vi.fn();

    expect(play(element, [{ opacity: 0 }], { duration: 100 })).toBeNull();
    exitThen(element, action);

    expect(animate).not.toHaveBeenCalled();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("acts at once when there is nothing to animate", () => {
    setReducedMotion(false);
    const action = vi.fn();
    exitThen(null, action);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("acts only after the exit animation finishes", async () => {
    setReducedMotion(false);
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => (finish = resolve));
    const element = document.createElement("span");
    element.animate = vi.fn(() => ({ finished }) as unknown as Animation);
    const action = vi.fn();

    exitThen(element, action);
    await Promise.resolve();
    expect(action).not.toHaveBeenCalled();

    finish();
    await finished;
    await Promise.resolve();
    expect(action).toHaveBeenCalledTimes(1);
  });
});
