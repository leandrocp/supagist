"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  BRAND_PRESETS,
  resolveBrandScene,
  type BrandId,
  type BrandPreset,
} from "@/lib/brand-presets";
import { createBrandCanvasBackground } from "@/lib/brand-scenes";
import { cn } from "@/lib/utils";

type Props = {
  value: BrandId | null;
  onChange: (preset: BrandPreset) => void;
  className?: string;
};

function BrandLogo({ preset, className }: { preset: BrandPreset; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("size-4 shrink-0", className)}
      style={{
        backgroundColor: preset.accent,
        maskImage: `url(${preset.logoUrl})`,
        WebkitMaskImage: `url(${preset.logoUrl})`,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

function brandPreviewStyle(preset: BrandPreset): React.CSSProperties {
  const scene = resolveBrandScene(preset);
  return {
    backgroundImage: createBrandCanvasBackground(
      scene,
      preset.background.from,
      preset.background.to,
      "patternUrl" in preset.background ? preset.background.patternUrl : undefined,
    ),
    backgroundPosition: "center",
    backgroundSize: "cover",
    boxShadow: `inset 0 0 0 1px ${scene.canvasBorder}`,
  };
}

/** Applies a complete brand appearance preset; individual controls stay editable afterward. */
export function BrandPicker({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const active = BRAND_PRESETS.find((preset) => preset.id === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Brand"
          aria-expanded={open}
          className={cn(
            "flex h-11 min-w-0 items-center gap-2 rounded-md border border-border-control bg-surface-200 px-3 text-sm text-foreground outline-none transition hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring/50",
            className,
          )}
        >
          {active ? (
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-md border border-white/10"
              style={brandPreviewStyle(active)}
            >
              <BrandLogo preset={active} />
            </span>
          ) : (
            <span className="size-6 shrink-0 rounded-md border border-dashed border-border-strong" />
          )}
          <span className="truncate">{active?.name ?? "Custom"}</span>
          <ChevronsUpDown className="ml-auto size-3.5 shrink-0 text-foreground-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="max-h-[var(--radix-popover-content-available-height)] w-[min(92vw,380px)] overflow-hidden border-border bg-popover p-0 text-popover-foreground"
      >
        <Command>
          <CommandInput
            placeholder="Search brands…"
            className="border-0 outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
          />
          <CommandList
            className="p-1 [&_[cmdk-empty]]:col-span-2 [&_[cmdk-list-sizer]]:grid [&_[cmdk-list-sizer]]:grid-cols-2 [&_[cmdk-list-sizer]]:gap-1"
            style={{
              maxHeight: "min(70vh, calc(var(--radix-popover-content-available-height) - 3rem))",
            }}
          >
            <CommandEmpty className="col-span-2">No brands match.</CommandEmpty>
            {BRAND_PRESETS.map((preset) => (
              <CommandItem
                key={preset.id}
                value={`${preset.name} ${preset.id}`}
                onSelect={() => {
                  onChange(preset);
                  setOpen(false);
                }}
                className="h-16 min-w-0 cursor-pointer gap-2 rounded-md border border-transparent px-2 data-[selected=true]:border-border data-[selected=true]:bg-surface-200"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/10 shadow-sm"
                  style={brandPreviewStyle(preset)}
                >
                  <BrandLogo preset={preset} />
                </span>
                <span className="min-w-0 truncate text-xs font-medium">{preset.name}</span>
                <Check
                  className={cn(
                    "ml-auto size-3.5 shrink-0",
                    value === preset.id ? "opacity-100" : "opacity-0",
                  )}
                />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
