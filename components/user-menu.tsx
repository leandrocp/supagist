"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Laptop, LogOut, Moon, Sun } from "lucide-react";
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
import { UserAvatar } from "@/components/user-avatar";
import { createClient } from "@/lib/supabase/client";

/**
 * One control for everything account-shaped: identity, appearance, sign-out.
 *
 * These used to sit in the nav as three separate widgets — a "Hey <name>"
 * label, a Logout button and a theme icon — which crowded the bar and gave
 * equal visual weight to a destructive action and a preference.
 */
export function UserMenu({ username, avatarUrl }: { username: string; avatarUrl?: string | null }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  // next-themes resolves on the client; render the trigger regardless so the
  // nav doesn't reflow, but only show the active theme once it is known.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${username}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <UserAvatar username={username} avatarUrl={avatarUrl} size="default" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2 font-normal">
          <UserAvatar username={username} avatarUrl={avatarUrl} size="sm" />
          <span className="min-w-0 truncate">
            <span className="text-muted-foreground">@</span>
            {username}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Theme
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={mounted ? theme : undefined}
          onValueChange={(next) => setTheme(next)}
        >
          <DropdownMenuRadioItem className="flex gap-2" value="light">
            <Sun className="text-muted-foreground" /> <span>Light</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className="flex gap-2" value="dark">
            <Moon className="text-muted-foreground" /> <span>Dark</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className="flex gap-2" value="system">
            <Laptop className="text-muted-foreground" /> <span>System</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex gap-2" onSelect={() => void logout()}>
          <LogOut className="text-muted-foreground" /> <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
