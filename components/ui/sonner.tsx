"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        // The toast is ink on paper, so its icons take the other theme's
        // tint to stay legible: Night ok/wax on the dark ink toast in light
        // mode, Paper ok/wax on the cream one in dark mode.
        success: <CircleCheckIcon className="size-4 text-[#7FC08A] dark:text-[#2F6B3A]" />,
        info: <InfoIcon className="size-4 text-[#8FB0E0] dark:text-[#24477A]" />,
        warning: <TriangleAlertIcon className="size-4 text-[#F07A63] dark:text-[#A82A20]" />,
        error: <OctagonXIcon className="size-4 text-[#F07A63] dark:text-[#A82A20]" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          // shadcn theme tokens hold HSL *components* (e.g. "0 0% 100%"),
          // not full color values. Sonner consumes these as raw
          // `background:` / `color:` declarations, so they must be wrapped
          // with hsl() — otherwise the toast renders with no background
          // and bleeds into whatever sits underneath.
          // Site spec §4: the toast is ink on bg, with no border.
          "--normal-bg": "hsl(var(--ink))",
          "--normal-text": "hsl(var(--paper))",
          "--normal-border": "transparent",
          "--border-radius": "14px",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
