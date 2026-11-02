import { useId } from "react";
import type { BrandDecorationLayer } from "@/lib/brand-presets";
import {
  createBrandCanvasBackground,
  createBrandFrameShadow,
  type BrandScenePreset,
} from "@/lib/brand-scenes";
import { renderBrandLayers, type ExportBackground } from "@/lib/export-utils";

/** The canvas behind the card, as the composer preview paints it. The home
 *  composer and the saved snippet view share it so both look the same. */
export function backgroundCanvasStyle(
  background: ExportBackground,
  padding: string | number,
): React.CSSProperties {
  return {
    backgroundImage: background.scene
      ? createBrandCanvasBackground(
          background.scene,
          background.from,
          background.to,
          background.patternUrl,
        )
      : `linear-gradient(135deg, ${background.from}, ${background.to})`,
    backgroundSize: background.patternUrl ? "cover" : undefined,
    backgroundPosition: "center",
    borderRadius: background.scene?.canvasRadius,
    boxShadow: background.scene
      ? `inset 0 0 0 1px ${background.scene.canvasBorder}, 0 24px 64px -36px rgba(0,0,0,0.62)`
      : undefined,
    padding,
  };
}

/** The card's rim and drop shadow on a background canvas. */
export function backgroundFrameShadow(background: ExportBackground | null): string | undefined {
  if (background?.scene) return createBrandFrameShadow(background.scene);
  if (!background?.frame) return undefined;
  const border = background.frame.cardBorder;
  if (!border) return "0 25px 50px -12px rgba(0,0,0,0.42)";
  // Layered brand canvases draw a flat card unless the frame asks for a drop
  // shadow, as the export does. CSS blur is twice the SVG stdDeviation.
  const drop = background.frame.cardShadow;
  const shadow = background.decoration
    ? drop
      ? `, 0 ${drop.y}px ${drop.blur}px color-mix(in srgb, ${drop.color} ${Math.round(drop.opacity * 100)}%, transparent)`
      : ""
    : ", 0 25px 50px -12px rgba(0,0,0,0.42)";
  return `0 0 0 ${border.width}px ${border.color}${shadow}`;
}

/** A background's scene guides or brand layers, over a `width`×`height` canvas. */
export function BackgroundDecoration({
  background,
  width,
  height,
  fontFamily,
}: {
  background: ExportBackground;
  width: number;
  height: number;
  fontFamily?: string;
}) {
  return (
    <>
      {background.scene ? <BrandSceneDecoration scene={background.scene} /> : null}
      {background.decoration ? (
        <BrandDecorationLayers
          layers={background.decoration.layers}
          width={width}
          height={height}
          fontFamily={fontFamily}
        />
      ) : null}
    </>
  );
}

function FadedLine({ className }: { className: string }) {
  return (
    <span
      className={`${className} absolute bg-current opacity-100 mask-[linear-gradient(to_right,transparent,black_4rem,black_calc(100%-4rem),transparent)]`}
    />
  );
}

export function BrandSceneDecoration({ scene }: { scene: BrandScenePreset }) {
  if (scene.guide === "none") return null;

  return (
    <div
      aria-hidden
      data-testid="preview-brand-decoration"
      data-scene-guide={scene.guide}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
      style={{ color: scene.guideColor }}
    >
      {scene.guide === "crosshair" ? (
        <>
          <FadedLine className="left-0 right-0 top-[max(8px,calc(var(--preview-outer-padding)-24px))] h-px" />
          <FadedLine className="bottom-[max(8px,calc(var(--preview-outer-padding)-24px))] left-0 right-0 h-px" />
          <span className="absolute bottom-0 left-[max(12px,calc(var(--preview-outer-padding)-64px))] top-0 w-px bg-current mask-[linear-gradient(to_bottom,transparent,black_4rem,black_calc(100%-4rem),transparent)]" />
          <span className="absolute bottom-0 right-[max(12px,calc(var(--preview-outer-padding)-64px))] top-0 w-px bg-current mask-[linear-gradient(to_bottom,transparent,black_4rem,black_calc(100%-4rem),transparent)]" />
        </>
      ) : null}

      {scene.guide === "registration" ? (
        <>
          <FadedLine className="left-0 right-0 top-(--preview-outer-padding) h-px" />
          <FadedLine className="bottom-(--preview-outer-padding) left-0 right-0 h-px" />
          <span className="absolute bottom-0 left-(--preview-outer-padding) top-0 w-px bg-current opacity-70" />
          <span className="absolute bottom-0 right-(--preview-outer-padding) top-0 w-px bg-current opacity-70" />
          <span className="absolute left-[calc(var(--preview-outer-padding)-18px)] top-(--preview-outer-padding) h-px w-9 bg-current" />
          <span className="absolute left-(--preview-outer-padding) top-[calc(var(--preview-outer-padding)-18px)] h-9 w-px bg-current" />
          <span className="absolute bottom-(--preview-outer-padding) right-[calc(var(--preview-outer-padding)-18px)] h-px w-9 bg-current" />
          <span className="absolute bottom-[calc(var(--preview-outer-padding)-18px)] right-(--preview-outer-padding) h-9 w-px bg-current" />
          <span className="absolute left-0 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
          <span className="absolute right-0 top-1/2 size-1.5 translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        </>
      ) : null}

      {scene.guide === "studio" ? (
        <>
          <FadedLine className="left-0 right-0 top-[calc(var(--preview-outer-padding)-18px)] h-px" />
          <FadedLine className="bottom-[calc(var(--preview-outer-padding)-18px)] left-0 right-0 h-px" />
          <span className="absolute bottom-0 left-[18%] top-0 w-px bg-current opacity-45" />
          <span className="absolute right-[8%] top-[12%] size-24 rounded-full border border-current opacity-35" />
          <span className="absolute right-[13%] top-[20%] size-12 rounded-full border border-current opacity-50" />
        </>
      ) : null}

      {scene.guide === "stripe-planes" ? (
        <div className="absolute inset-0 opacity-70">
          <span className="absolute bottom-[-12%] right-[-8%] h-[42%] w-[72%] -rotate-6 bg-[#f6f9ff] [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)]" />
          <span className="absolute bottom-[6%] right-[-4%] h-[10%] w-[58%] -rotate-6 bg-[#11efe3]" />
          <span className="absolute bottom-[1%] right-[-10%] h-[8%] w-[52%] -rotate-6 bg-[#9966ff]" />
        </div>
      ) : null}

      {scene.guide === "halo" ? (
        <>
          <span className="absolute left-1/2 top-1/2 size-[118%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-current opacity-40" />
          <span className="absolute left-1/2 top-1/2 size-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-current opacity-55" />
          <span className="absolute left-[14%] top-[22%] size-2 rounded-full bg-current" />
          <span className="absolute bottom-[18%] right-[12%] size-1.5 rounded-full bg-current" />
        </>
      ) : null}

      {scene.guide === "beam" ? (
        <div className="absolute inset-0 opacity-70">
          <span className="absolute right-[-10%] top-[-20%] h-[160%] w-[70%] rotate-28 bg-linear-to-r from-transparent via-current/70 to-transparent blur-xl" />
          <span className="absolute left-0 right-0 top-[24%] h-px bg-current opacity-45" />
          <span className="absolute bottom-[18%] left-0 right-0 h-px bg-current opacity-30" />
        </div>
      ) : null}
    </div>
  );
}

/** The export's brand canvas layers, drawn over a `width`×`height` canvas
 *  that covers the element (the same viewport-relative geometry). */
export function BrandDecorationLayers({
  layers,
  width,
  height,
  fontFamily = "'JetBrains Mono',ui-monospace,monospace",
}: {
  layers: readonly BrandDecorationLayer[];
  width: number;
  height: number;
  fontFamily?: string;
}) {
  const id = `brand-layer-${useId().replaceAll(":", "")}`;
  return (
    <svg
      aria-hidden
      data-testid="preview-brand-layers"
      className="pointer-events-none absolute inset-0 z-0 size-full"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      // Markup comes from preset constants, never user input.
      dangerouslySetInnerHTML={{
        __html: renderBrandLayers(layers, { left: 0, top: 0, width, height }, fontFamily, id),
      }}
    />
  );
}
