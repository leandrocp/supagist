import { describe, expect, it } from "vitest";
import {
  createAmbientBrandScene,
  createBrandCanvasBackground,
  createBrandFrameShadow,
} from "./brand-presets";

describe("brand scene primitives", () => {
  it("builds layered premium scenes for dark and light brands", () => {
    const dark = createAmbientBrandScene("dark", "#3ECF8E");
    const light = createAmbientBrandScene("light", "#635BFF");

    expect(dark.glows).toHaveLength(3);
    expect(dark.canvasBorder).toContain("255,255,255");
    expect(dark.frame.shadow.opacity).toBeGreaterThan(0.3);
    expect(light.canvasBorder).toContain("15,23,42");
    expect(light.frame.shadow.opacity).toBeLessThan(dark.frame.shadow.opacity);
  });

  it("serializes mesh glows, artwork, vignette, and base gradient in paint order", () => {
    const scene = createAmbientBrandScene("dark", "#3ECF8E");
    const background = createBrandCanvasBackground(
      scene,
      "#121212",
      "#0B241A",
      "/brands/artwork.png",
    );

    expect(background).toContain("url(/brands/artwork.png)");
    expect(background.match(/radial-gradient/g)?.length).toBeGreaterThanOrEqual(4);
    expect(background).toContain("linear-gradient(135deg, #121212, #0B241A)");
  });

  it("creates a layered frame rim instead of a generic single shadow", () => {
    const scene = createAmbientBrandScene("dark", "#8A8F98");
    const shadow = createBrandFrameShadow(scene);

    expect(shadow).toContain("inset 0 1px 0");
    expect(shadow).toContain("0 0 0 1px");
    expect(shadow.split(",").length).toBeGreaterThan(5);
  });
});
