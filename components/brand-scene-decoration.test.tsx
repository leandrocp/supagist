// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createAmbientBrandScene, type BrandSceneGuide } from "../lib/brand-scenes";
import { EXPORT_BRAND_BACKGROUNDS } from "../lib/export-utils";
import { BrandSceneDecoration, backgroundFrameShadow } from "./brand-scene-decoration";

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

describe("backgroundFrameShadow", () => {
  it("draws a layered canvas card flat unless its frame asks for a drop shadow", () => {
    const bg = (id: string) => EXPORT_BRAND_BACKGROUNDS.find((b) => b.brandId === id)!;
    // The export's feDropShadow stdDeviation is half the CSS blur radius.
    expect(backgroundFrameShadow(bg("inertia"))).toBe(
      "0 0 0 1px #4D5057, 0 4px 9px color-mix(in srgb, #000000 22%, transparent)",
    );
    expect(backgroundFrameShadow(bg("mdex-purple"))).toBe("0 0 0 1px #E7E5E4");
  });
});
