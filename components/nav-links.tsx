"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, hasEnvVars } from "@/lib/utils";

export const NAV_LINKS = [
  { href: "/", label: "New" },
  { href: "/snippets", label: "Snippets" },
  { href: "/agents", label: "Agents" },
] as const;

/** The nav's destinations. The current page reads in ink, the rest muted. */
export function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <div className={cn("items-center gap-[34px] text-[15px] font-medium", className)}>
      {NAV_LINKS.map(({ href, label }) =>
        href === "/snippets" && !hasEnvVars ? null : (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className="shrink-0 rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:focus-ring aria-[current=page]:text-foreground"
          >
            {label}
          </Link>
        ),
      )}
    </div>
  );
}
