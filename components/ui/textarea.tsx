import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-xl bg-surf2 px-3.5 py-2.5 text-base text-foreground transition-colors placeholder:text-faint focus-visible:focus-ring aria-invalid:shadow-[inset_0_0_0_1.5px_hsl(var(--wax-text))] disabled:cursor-not-allowed disabled:opacity-40 md:text-[15px]",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
