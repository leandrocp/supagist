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
  CommandSeparator,
} from "@/components/ui/command";
import { BRAND_THEMES, type BrandTheme } from "@/lib/brand-themes";

export type ThemeOption = {
  /** Stable id matching either a Lumis theme name or a brand id (e.g. "vercel-dark"). */
  id: string;
  /** User-facing label rendered in the picker. */
  label: string;
};

type Props = {
  value: string;
  onChange: (next: string) => void;
  /** Lumis themes (everforest_light, etc.) — Brands are pulled from BRAND_THEMES. */
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

/**
 * Theme picker with two groups (Brands, Themes) and a fuzzy search input —
 * cmdk under the hood handles filtering across both groups simultaneously.
 * Brand entries also render a tiny logo so the row reads at a glance.
 *
 * The native <select> + <optgroup> we shipped first didn't allow searching;
 * once Brands shipped (5 brands × 2 variants = 9 entries) sitting on top of
 * ~50 Lumis themes, scanning the dropdown for a name was painful. cmdk's
 * search feels right for that scale.
 */
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

  const brandById = new Map(BRAND_THEMES.map((b) => [b.id, b] as const));
  const activeBrand = brandById.get(value);
  const activeLabel = activeBrand
    ? `${activeBrand.name} (${activeBrand.appearance})`
    : (themes.find((t) => t.id === value)?.label ?? value);

  // Inline style helpers used to neutralize shadcn/CommandGroup's hardcoded
  // text-foreground / text-muted-foreground / bg-accent classes when the
  // popover is themed against the editor palette. Each piece is plumbed via
  // a CSS variable so we can use Tailwind's arbitrary-value syntax for the
  // [data-selected] hover state without writing per-item inline styles for
  // both states.
  const itemStyle = popoverPalette ? { color: popoverPalette.text } : undefined;
  const headingClass = popoverPalette
    ? "[&_[cmdk-group-heading]]:!text-[var(--cmd-heading-color)]"
    : "";
  // Override the hover/selected bg and text — bg-accent (default light grey)
  // looks washed out on a dark editor popover. We pick the gutter colour for
  // hover bg since it's already a subtle variation of the editor bg.
  const itemHoverClass = popoverPalette
    ? "data-[selected=true]:!bg-[var(--cmd-hover-bg)] data-[selected=true]:!text-[var(--cmd-hover-text)]"
    : "";
  const listStyle = popoverPalette
    ? ({
        "--cmd-heading-color": popoverPalette.headerText,
        "--cmd-hover-bg": popoverPalette.hoverBg,
        "--cmd-hover-text": popoverPalette.text,
        color: popoverPalette.text,
      } as React.CSSProperties)
    : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Theme"
          aria-expanded={open}
          className={cn(
            "flex h-full w-full items-center gap-2 bg-transparent pl-2 pr-2 text-sm outline-none",
            triggerClassName,
          )}
          style={triggerStyle}
        >
          {activeBrand ? <BrandLogo brand={activeBrand} size={14} /> : null}
          <span className="truncate">{activeLabel}</span>
          <ChevronsUpDown
            className="ml-auto size-3.5 shrink-0 opacity-60"
            style={iconColor ? { color: iconColor } : undefined}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[260px] p-0"
        align="start"
        sideOffset={6}
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
            className="border-0 outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
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
          <CommandList className="max-h-[70vh]" style={listStyle}>
            <CommandEmpty>No themes match.</CommandEmpty>
            <CommandGroup heading="Brands" className={headingClass}>
              {BRAND_THEMES.map((b) => (
                <CommandItem
                  key={b.id}
                  // value is what cmdk filters against — include both the
                  // brand name and appearance so "supabase dark" matches.
                  value={`${b.name} ${b.appearance} ${b.id}`}
                  onSelect={() => {
                    onChange(b.id);
                    setOpen(false);
                  }}
                  className={itemHoverClass}
                  style={itemStyle}
                >
                  <BrandLogo brand={b} size={16} className="mr-2" />
                  <span>{b.name}</span>
                  <span
                    className="ml-1 text-xs"
                    style={popoverPalette ? { color: popoverPalette.headerText } : undefined}
                  >
                    ({b.appearance})
                  </span>
                  <Check
                    className={cn("ml-auto size-4", value === b.id ? "opacity-100" : "opacity-0")}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Themes" className={headingClass}>
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

// Small inline brand logo via <img>. We use an <img> rather than next/image
// because the picker mounts inside a popover and we don't need the Image
// optimisation pipeline for ~14px icons.
function BrandLogo({
  brand,
  size,
  className,
}: {
  brand: BrandTheme;
  size: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={brand.logoUrl}
      alt=""
      width={size}
      height={size}
      className={cn("inline-block shrink-0", className)}
      style={{ width: size, height: size }}
    />
  );
}
