import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

// Supagist chrome buttons (site spec §4): primary wax, secondary on the quiet
// panel tone, ghost and link in postal blue. Pills everywhere (radius 999), no
// borders, and the brand focus ring.
const buttonVariants = cva(
  "press inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors outline-hidden focus-visible:focus-ring disabled:pointer-events-none disabled:opacity-40 aria-invalid:shadow-[inset_0_0_0_1.5px_hsl(var(--wax-text))] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-wax text-on-wax hover:bg-wax-hover active:bg-wax-hover",
        destructive: "bg-wax-text text-on-wax hover:bg-wax-hover",
        outline: "bg-surf2 text-foreground hover:bg-surf3",
        secondary: "bg-surf2 text-foreground hover:bg-surf3",
        ghost: "text-foreground hover:bg-surf2",
        link: "rounded-md text-postal underline-offset-4 hover:underline",
        pill: "bg-wax text-on-wax hover:bg-wax-hover active:bg-wax-hover",
        "pill-secondary": "bg-surf2 text-foreground hover:bg-surf3",
        /** Near-black ink pill: "Continue with GitHub". */
        ink: "bg-ink text-paper hover:bg-ink/90",
      },
      size: {
        default: "h-10 px-5 text-[15px] has-[>svg]:px-4",
        xs: "h-7 gap-1 px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-12 px-7 text-[17px] has-[>svg]:px-6",
        pill: "h-10 px-6 text-[15px] has-[>svg]:px-5",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
