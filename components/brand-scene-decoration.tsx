import type { BrandScenePreset } from "@/lib/brand-scenes";

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
