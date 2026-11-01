import type { ReactNode } from "react";

/** Heading block shared by every auth page: optional eyebrow, Fraunces title, muted line. */
export function AuthHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {eyebrow ? <p className="eyebrow mb-3 text-wax-text">{eyebrow}</p> : null}
      <h1 className="font-display text-[34px] leading-[1.05] text-foreground md:text-[44px]">
        {title}
      </h1>
      {children ? (
        <div className="text-[15px] text-muted-foreground md:text-base">{children}</div>
      ) : null}
    </div>
  );
}
