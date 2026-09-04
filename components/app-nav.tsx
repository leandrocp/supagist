import { Suspense } from "react";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { BrandDot } from "@/components/brand-dot";
import { EnvVarWarning } from "@/components/env-var-warning";
import { HomePresence } from "@/components/home-presence";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { cn, hasEnvVars } from "@/lib/utils";

type Props = {
  /** Live lobby presence belongs to the composer, so only the home page asks for it. */
  showPresence?: boolean;
  /** Full-bleed on the home page, where it sits flush against the composer. */
  fullBleed?: boolean;
};

const NAV_LINKS = [
  { href: "/", label: "New" },
  { href: "/snippets", label: "Snippets" },
] as const;

/**
 * The single app bar, shared by every page that has chrome.
 *
 * Layout follows the usual reading order: brand and destinations on the left,
 * account and preferences on the right. Everything account-shaped lives behind
 * one avatar menu — see `UserMenu`.
 */
export function AppNav({ showPresence = false, fullBleed = false }: Props) {
  const showEnvWarning = process.env.NODE_ENV === "development" && !hasEnvVars;

  return (
    <nav
      data-testid="app-nav"
      className={cn(
        "flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border text-sm",
        fullBleed && "px-5",
      )}
    >
      <div className="flex min-w-0 items-center gap-4 sm:gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 hover:opacity-80">
          <BrandDot />
          <p className="font-semibold tracking-tight">Supagist</p>
        </Link>

        {/* "New" is an explicit destination rather than relying on the wordmark
            doubling as the way back to the composer. */}
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          {NAV_LINKS.map(({ href, label }) =>
            href === "/snippets" && !hasEnvVars ? null : (
              <Link
                key={href}
                href={href}
                className="shrink-0 text-foreground-light transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            ),
          )}
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        {showPresence && hasEnvVars ? <HomePresence /> : null}
        {showEnvWarning ? (
          <>
            <EnvVarWarning />
            <ThemeSwitcher />
          </>
        ) : hasEnvVars ? (
          <Suspense fallback={null}>
            <AuthButton />
          </Suspense>
        ) : (
          <ThemeSwitcher />
        )}
      </div>
    </nav>
  );
}
