"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Laptop, Menu, Moon, Sun } from "lucide-react";
import { NAV_LINKS } from "@/components/nav-links";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, hasEnvVars } from "@/lib/utils";

/**
 * Below md the nav keeps only the seal, wordmark and account control; the
 * destinations and the theme choice fold into this menu.
 */
export function MobileMenu({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Menu"
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surf2 focus-visible:focus-ring",
            className,
          )}
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {NAV_LINKS.map(({ href, label }) =>
          href === "/snippets" && !hasEnvVars ? null : (
            <DropdownMenuItem key={href} asChild className="min-h-11 text-[15px]">
              <Link href={href}>{label}</Link>
            </DropdownMenuItem>
          ),
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Theme
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={mounted ? theme : undefined}
          onValueChange={(next) => setTheme(next)}
        >
          <DropdownMenuRadioItem className="flex min-h-11 gap-2" value="light">
            <Sun className="text-muted-foreground" /> <span>Light</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className="flex min-h-11 gap-2" value="dark">
            <Moon className="text-muted-foreground" /> <span>Dark</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className="flex min-h-11 gap-2" value="system">
            <Laptop className="text-muted-foreground" /> <span>System</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
