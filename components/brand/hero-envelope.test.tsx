// @vitest-environment happy-dom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SendEnvelope } from "./hero-envelope";

const CODE = "const a = 1;\nconst b = 2;\nconst c = 3;\nconst d = 4;";

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query === "(prefers-reduced-motion: reduce)",
    media: query,
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("SendEnvelope", () => {
  it("inserts the snippet, seals the envelope and sends it once, then hands over", () => {
    stubReducedMotion(false);
    const onSent = vi.fn();
    render(<SendEnvelope file="greet.ts" lang="TypeScript" code={CODE} onSent={onSent} />);
    const scene = screen.getByTestId("send-envelope");

    // The card carries the published snippet's own name and first lines.
    expect(scene.querySelector(".hero-card-file")?.textContent).toBe("greet.ts");
    expect(scene.querySelector(".hero-card-lang")?.textContent).toBe("TypeScript");
    expect(scene.querySelector("pre")?.textContent).toBe(
      "const a = 1;\nconst b = 2;\nconst c = 3;",
    );

    const seen = [scene.dataset.phase];
    for (let t = 0; t < 3000; t += 10) {
      advance(10);
      if (seen.at(-1) !== scene.dataset.phase) seen.push(scene.dataset.phase);
      if (onSent.mock.calls.length) {
        // About 1.8 s from the publish to the snippet's page.
        expect(t).toBeGreaterThanOrEqual(1700);
        expect(t).toBeLessThanOrEqual(2000);
        break;
      }
    }
    expect(seen).toEqual(["reading", "insert", "close", "seal", "send"]);
    expect(onSent).toHaveBeenCalledTimes(1);

    // No loop: it stays sent.
    advance(10_000);
    expect(scene.dataset.phase).toBe("send");
    expect(onSent).toHaveBeenCalledTimes(1);
  });

  it("shows the sealed envelope still and hands over at once with reduced motion", () => {
    stubReducedMotion(true);
    const onSent = vi.fn();
    render(<SendEnvelope file="greet.ts" lang="TypeScript" code={CODE} onSent={onSent} />);
    expect(screen.getByTestId("send-envelope").dataset.phase).toBe("seal");
    expect(onSent).toHaveBeenCalledTimes(1);
    advance(10_000);
    expect(screen.getByTestId("send-envelope").dataset.phase).toBe("seal");
  });
});
