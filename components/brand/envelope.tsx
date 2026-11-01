import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Envelope B, the "sealed envelope object" (site spec §6): a 660×400 envelope
 * back with the flap closed, its R3 wax seal pressed on the flap tip. One per
 * screen; never outlined, never animated.
 *
 * The art is two SVGs (Paper and Night) swapped by the next-themes class, so
 * it follows the site toggle rather than the OS. Sizes scale with the box: set
 * the width with `className` and the height follows the 660:400 ratio.
 */
export function Envelope({
  className,
  rotate = -2.2,
  seal = 120 / 660,
  sealOffset = [6, -6],
  children,
}: {
  className?: string;
  /** Degrees. The hero leans −2.2°, the 404 −3°. */
  rotate?: number;
  /** Seal diameter as a fraction of the envelope width, or null for no seal. */
  seal?: number | null;
  /** Nudge from the flap tip, in 660-wide envelope units (hero: +6, −6). */
  sealOffset?: [number, number];
  /** Laid on top of the envelope, e.g. the hero's code card. */
  children?: ReactNode;
}) {
  return (
    <div
      className={cn("relative aspect-[660/400]", className)}
      style={{ "--envelope-rotate": `${rotate}deg` } as CSSProperties}
    >
      <div
        className="absolute inset-0 overflow-hidden rounded-[6px] shadow-[0_40px_70px_-30px_hsl(var(--shadow-tint)/0.32),0_6px_16px_-6px_hsl(var(--shadow-tint)/0.18)] dark:shadow-[0_40px_70px_-30px_rgb(0_0_0/0.8),0_6px_16px_-6px_rgb(0_0_0/0.6)]"
        style={{ transform: "rotate(var(--envelope-rotate))" }}
      >
        <img
          src="/brand/envelope-b.svg"
          alt=""
          width={660}
          height={400}
          decoding="async"
          className="block size-full dark:hidden"
        />
        <img
          src="/brand/envelope-b-dark.svg"
          alt=""
          width={660}
          height={400}
          decoding="async"
          className="hidden size-full dark:block"
        />
      </div>
      {seal ? (
        <Seal
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{
            width: `${seal * 100}%`,
            // The flap tip sits at 60% of the height, on the centre line.
            left: `calc(50% + ${(sealOffset[0] / 660) * 100}%)`,
            top: `calc(60% + ${(sealOffset[1] / 400) * 100}%)`,
          }}
        />
      ) : null}
      {children}
    </div>
  );
}

/**
 * The R3 photoreal seal with its CSS contact shadow: a blurred radial pool
 * plus one tight shadow, no extra drop shadows. Rotated −10°, never mirrored.
 */
export function Seal({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div aria-hidden="true" className={cn("relative aspect-square", className)} style={style}>
      <div className="absolute top-[14%] left-[8%] size-[86%] rounded-full bg-[radial-gradient(closest-side,rgb(0_0_0/0.3),rgb(0_0_0/0))] blur-[7px]" />
      <div className="absolute top-[12%] left-[14%] h-[80%] w-[76%] rounded-full shadow-[0_2.4px_3.6px_rgb(0_0_0/0.28)]" />
      <img
        src="/brand/seal-r3-240.png"
        alt=""
        width={240}
        height={240}
        decoding="async"
        className="absolute inset-0 size-full -rotate-10"
      />
    </div>
  );
}
