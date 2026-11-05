// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeroEnvelope } from "./hero-envelope";

const TSX = "export function Render() {\n  return <h1>Hello, Supagist!</h1>;\n}\n";
const ELIXIR = "defmodule Gist do\n  def share(code), do: seal(code)\nend\n";

let onScreen = true;

function stubEnvironment({ reducedMotion = false } = {}) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("no-preference") ? !reducedMotion : reducedMotion,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private callback: IntersectionObserverCallback) {}
      observe() {
        this.callback(
          [{ isIntersecting: onScreen } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }
      disconnect() {}
    },
  );
}

beforeEach(() => {
  onScreen = true;
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderScene() {
  render(<HeroEnvelope />);
  const scene = screen.getByTestId("hero-envelope");
  // A 400×200 box at (100, 50), so the centre is (300, 150).
  scene.getBoundingClientRect = () => ({ left: 100, top: 50, width: 400, height: 200 }) as DOMRect;
  return {
    scene,
    phase: () => scene.dataset.phase,
    code: () => scene.querySelector("pre")?.textContent,
    file: () => scene.querySelector(".hero-card-file")?.textContent,
  };
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** One character per 30ms tick; each tick schedules the next after render. */
function type(characters: number) {
  for (let i = 0; i < characters; i++) advance(30);
}

describe("HeroEnvelope", () => {
  it("seals and sends the letter, then opens the next snippet and types it out", () => {
    stubEnvironment();
    const { phase, code, file } = renderScene();

    // First frame: the TSX card is out of the open envelope, fully written.
    expect(phase()).toBe("reading");
    expect(file()).toBe("snippet.tsx");
    expect(code()).toBe(TSX);

    const seen: string[] = [];
    for (let i = 0; i < 11; i++) {
      // Each phase holds under 2s; step until the phase changes.
      const before = phase();
      for (let t = 0; t < 2000 && phase() === before; t += 10) advance(10);
      seen.push(phase()!);
    }
    expect(seen).toEqual([
      "insert",
      "close",
      "seal",
      "post",
      "send",
      "away",
      "arrive",
      "crack",
      "open",
      "rise",
      "reading",
    ]);

    // The arrived letter holds the next snippet, which types itself out.
    expect(file()).toBe("gist.ex");
    expect(code()).toBe("\n\n\n");
    type(10);
    expect(code()).toBe("defmodule \n\n\n");
    type(ELIXIR.length);
    expect(code()).toBe(ELIXIR);
  });

  it("keeps the first frame when reduced motion is on", () => {
    stubEnvironment({ reducedMotion: true });
    const { phase, code } = renderScene();
    advance(60_000);
    expect(phase()).toBe("reading");
    expect(code()).toBe(TSX);
  });

  it("does not run while the hero is off screen", () => {
    onScreen = false;
    stubEnvironment();
    const { phase } = renderScene();
    advance(60_000);
    expect(phase()).toBe("reading");
  });

  it("tilts toward a mouse pointer, ignores touch, and recentres on leave", () => {
    stubEnvironment();
    const { scene } = renderScene();

    fireEvent.pointerMove(scene, { pointerType: "touch", clientX: 400, clientY: 100 });
    expect(scene.style.getPropertyValue("--px")).toBe("");

    fireEvent.pointerMove(scene, { pointerType: "mouse", clientX: 400, clientY: 100 });
    expect(scene.style.getPropertyValue("--px")).toBe("0.500");
    expect(scene.style.getPropertyValue("--py")).toBe("-0.500");

    // Past the edge clamps to ±1 rather than over-tilting.
    fireEvent.pointerMove(scene, { pointerType: "mouse", clientX: 900, clientY: 0 });
    expect(scene.style.getPropertyValue("--px")).toBe("1.000");
    expect(scene.style.getPropertyValue("--py")).toBe("-1.000");

    fireEvent.pointerLeave(scene);
    expect(scene.style.getPropertyValue("--px")).toBe("0");
  });
});
