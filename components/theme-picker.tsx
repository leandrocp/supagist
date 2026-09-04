"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type ThemeOption = {
  /** Stable official Lumis theme id. */
  id: string;
  /** User-facing label rendered in the picker. */
  label: string;
};

type Props = {
  value: string;
  onChange: (next: string) => void;
  /** Official Lumis themes (everforest_light, github_dark, etc.). */
  themes: ThemeOption[];
  /** Inline styles forwarded to the trigger so it can pick up the editor palette. */
  triggerStyle?: React.CSSProperties;
  /** Class forwarded to the trigger for layout / sizing. */
  triggerClassName?: string;
  /** Inline color for the chevron + check ticks (matches surrounding chrome). */
  iconColor?: string;
  /** Editor palette — when supplied, the popover surface inherits the editor's
   *  bg/border/text so the dropdown blends with the active theme instead of
   *  flashing the app's default popover white on a dark editor. */
  popoverPalette?: {
    bg: string;
    text: string;
    border: string;
    headerText: string;
    /** Background for the hovered/selected item — usually the editor's
     *  gutter colour, a subtle variation of bg. */
    hoverBg: string;
  };
};

/** Searchable picker for official Lumis syntax colorschemes only. */
export function ThemePicker({
  value,
  onChange,
  themes,
  triggerStyle,
  triggerClassName,
  iconColor,
  popoverPalette,
}: Props) {
  const [open, setOpen] = useState(false);

  const activeLabel = themes.find((theme) => theme.id === value)?.label ?? value;

  // Inline style helpers used to neutralize shadcn/CommandGroup's hardcoded
  // text-foreground / text-muted-foreground / bg-accent classes when the
  // popover is themed against the editor palette. Each piece is plumbed via
  // a CSS variable so we can use Tailwind's arbitrary-value syntax for the
  // [data-selected] hover state without writing per-item inline styles for
  // both states.
  const itemStyle = popoverPalette ? { color: popoverPalette.text } : undefined;
  const headingClass = popoverPalette
    ? "**:[[cmdk-group-heading]]:text-(--cmd-heading-color)!"
    : "";
  // Override the hover/selected bg and text — bg-accent (default light grey)
  // looks washed out on a dark editor popover. We pick the gutter colour for
  // hover bg since it's already a subtle variation of the editor bg.
  const itemHoverClass = popoverPalette
    ? "data-[selected=true]:bg-(--cmd-hover-bg)! data-[selected=true]:text-(--cmd-hover-text)!"
    : "";
  const listStyle = {
    ...(popoverPalette
      ? {
          "--cmd-heading-color": popoverPalette.headerText,
          "--cmd-hover-bg": popoverPalette.hoverBg,
          "--cmd-hover-text": popoverPalette.text,
          color: popoverPalette.text,
        }
      : {}),
    // Keep the search input and every list edge inside the collision-aware
    // Popover viewport. Inline style wins over CommandList's built-in 300px
    // max-height utility and avoids class-order conflicts.
    maxHeight: "min(70vh, calc(var(--radix-popover-content-available-height) - 3rem))",
  } as React.CSSProperties;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Theme"
          aria-expanded={open}
          className={cn(
            "flex h-full w-full items-center gap-2 bg-transparent pl-2 pr-2 text-sm outline-hidden",
            triggerClassName,
          )}
          style={triggerStyle}
        >
          <span className="truncate">{activeLabel}</span>
          <ChevronsUpDown
            className="ml-auto size-3.5 shrink-0 opacity-60"
            style={iconColor ? { color: iconColor } : undefined}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-(--radix-popover-content-available-height) w-[260px] overflow-hidden p-0"
        align="start"
        side="top"
        sideOffset={6}
        collisionPadding={12}
        style={
          popoverPalette
            ? {
                backgroundColor: popoverPalette.bg,
                color: popoverPalette.text,
                borderColor: popoverPalette.border,
              }
            : undefined
        }
      >
        <Command
          style={
            popoverPalette
              ? { backgroundColor: popoverPalette.bg, color: popoverPalette.text }
              : undefined
          }
        >
          {/* The default CommandInput inherits the browser's :focus-visible
              ring inside a Popover, which on Chrome/Brave shows up as a
              thick blue rounded outline. Override with explicit none. */}
          <CommandInput
            placeholder="Search themes…"
            className="border-0 outline-hidden focus:ring-0 focus-visible:outline-hidden focus-visible:ring-0"
            style={
              popoverPalette
                ? {
                    color: popoverPalette.text,
                    borderColor: popoverPalette.border,
                  }
                : undefined
            }
          />
          {/* Override the default 300px cap — we have ~50 Lumis themes plus
              9 brand entries, and 300px barely shows half of them after
              scroll. ~70vh keeps the list scannable on laptops without
              overflowing tiny viewports. */}
          {/* shadcn's CommandGroup applies `text-foreground` and headings get
              `text-muted-foreground` — both pull from the app's CSS variables,
              not the popover's inline `color`, so a dark editor's popover
              ended up with the app-light foreground (or vice versa) bleeding
              through. We override the heading + item text via inline styles
              on each element. */}
          <CommandList style={listStyle}>
            <CommandEmpty>No themes match.</CommandEmpty>
            <CommandGroup heading="Lumis themes" className={headingClass}>
              {themes.map((t) => (
                <CommandItem
                  key={t.id}
                  value={t.label}
                  onSelect={() => {
                    onChange(t.id);
                    setOpen(false);
                  }}
                  className={itemHoverClass}
                  style={itemStyle}
                >
                  <span>{t.label}</span>
                  <Check
                    className={cn("ml-auto size-4", value === t.id ? "opacity-100" : "opacity-0")}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
