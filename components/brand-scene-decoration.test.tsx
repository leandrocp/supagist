// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createAmbientBrandScene, type BrandSceneGuide } from "../lib/brand-scenes";
import { BrandSceneDecoration } from "./brand-scene-decoration";

afterEach(cleanup);

describe("BrandSceneDecoration", () => {
  it.each<BrandSceneGuide>([
    "crosshair",
    "registration",
    "studio",
    "stripe-planes",
    "halo",
    "beam",
  ])("renders the %s scene behind the editor", (guide) => {
    const base = createAmbientBrandScene("dark", "#3ECF8E");
    render(<BrandSceneDecoration scene={{ ...base, guide }} />);

    const scene = screen.getByTestId("preview-brand-decoration");
    expect(scene.getAttribute("data-scene-guide")).toBe(guide);
    expect(scene.className).toContain("z-0");
    expect(scene.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders no overlay for ambient-only scenes", () => {
    render(<BrandSceneDecoration scene={createAmbientBrandScene("dark", "#3ECF8E")} />);
    expect(screen.queryByTestId("preview-brand-decoration")).toBeNull();
  });
});
