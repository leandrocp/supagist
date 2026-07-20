export type BrandSceneAppearance = "light" | "dark";
export type BrandSceneGuide =
  | "none"
  | "crosshair"
  | "registration"
  | "studio"
  | "stripe-planes"
  | "halo"
  | "beam";

export type BrandSceneGlow = {
  x: number;
  y: number;
  radius: number;
  color: string;
  opacity: number;
};

export type BrandScenePreset = {
  appearance: BrandSceneAppearance;
  glows: readonly BrandSceneGlow[];
  vignette: { color: string; opacity: number };
  canvasBorder: string;
  canvasRadius: number;
  guide: BrandSceneGuide;
  guideColor: string;
  frame: {
    rimFrom: string;
    rimTo: string;
    innerStroke: string;
    highlight: string;
    shadow: {
      color: string;
      opacity: number;
      y: number;
      blur: number;
    };
  };
};

export function createAmbientBrandScene(
  appearance: BrandSceneAppearance,
  accent: string,
  secondary = accent,
): BrandScenePreset {
  const dark = appearance === "dark";
  return {
    appearance,
    glows: [
      { x: 12, y: 4, radius: 58, color: accent, opacity: dark ? 0.22 : 0.17 },
      { x: 92, y: 88, radius: 68, color: secondary, opacity: dark ? 0.16 : 0.12 },
      {
        x: 52,
        y: 38,
        radius: 52,
        color: dark ? "#FFFFFF" : "#FFFFFF",
        opacity: dark ? 0.045 : 0.32,
      },
    ],
    vignette: {
      color: dark ? "#000000" : accent,
      opacity: dark ? 0.42 : 0.07,
    },
    canvasBorder: dark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.16)",
    canvasRadius: 12,
    guide: "none",
    guideColor: dark ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.13)",
    frame: {
      rimFrom: accent,
      rimTo: secondary,
      innerStroke: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.82)",
      highlight: dark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.95)",
      shadow: {
        color: dark ? "#000000" : accent,
        opacity: dark ? 0.54 : 0.22,
        y: dark ? 14 : 12,
        blur: dark ? 28 : 24,
      },
    },
  };
}

function colorMix(color: string, opacity: number) {
  return `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent)`;
}

export function createBrandCanvasBackground(
  scene: BrandScenePreset,
  from: string,
  to: string,
  patternUrl?: string,
): string {
  const layers: string[] = [];
  if (patternUrl) layers.push(`url(${patternUrl})`);
  layers.push(
    ...scene.glows.map(
      (glow) =>
        `radial-gradient(circle at ${glow.x}% ${glow.y}%, ${colorMix(glow.color, glow.opacity)} 0%, transparent ${glow.radius}%)`,
    ),
  );
  layers.push(
    `radial-gradient(ellipse at 50% 42%, transparent 34%, ${colorMix(scene.vignette.color, scene.vignette.opacity)} 100%)`,
  );
  layers.push(`linear-gradient(135deg, ${from}, ${to})`);
  return layers.join(", ");
}

export function createBrandFrameShadow(scene: BrandScenePreset): string {
  const { frame } = scene;
  const shadowColor = colorMix(frame.shadow.color, frame.shadow.opacity);
  return [
    `inset 0 1px 0 ${frame.highlight}`,
    `inset 0 -1px 0 ${frame.innerStroke}`,
    `0 0 0 1px ${frame.rimFrom}`,
    `0 ${frame.shadow.y}px ${frame.shadow.blur}px -12px ${shadowColor}`,
    `0 6px 14px -8px ${shadowColor}`,
  ].join(", ");
}
