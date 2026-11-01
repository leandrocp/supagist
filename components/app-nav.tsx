import { Suspense } from "react";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { SealMark } from "@/components/brand/seal-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { EnvVarWarning } from "@/components/env-var-warning";
import { HomePresence } from "@/components/home-presence";
import { MobileMenu } from "@/components/mobile-menu";
import { NavLinks } from "@/components/nav-links";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";

type Props = {
  /** Live lobby presence belongs to the composer, so only the home page asks for it. */
  showPresence?: boolean;
};

/**
 * The single app bar, shared by every page that has chrome: the flat seal and
 * wordmark, then New and Snippets; account and theme on the right. It spans
 * the page at the page padding (48 px desktop, 20 px mobile) and has no rule
 * under it: the site separates by tone, never by lines.
 *
 * Below md the destinations and the theme choice move into `MobileMenu`.
 */
export function AppNav({ showPresence = false }: Props) {
  const showEnvWarning = process.env.NODE_ENV === "development" && !hasEnvVars;

  return (
    <nav
      data-testid="app-nav"
      className="flex h-16 shrink-0 items-center justify-between gap-4 px-5 md:h-[76px] md:px-12"
    >
      <div className="flex shrink-0 items-center gap-[34px]">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-md text-foreground focus-visible:focus-ring"
        >
          <SealMark className="size-7 md:size-8" />
          <Wordmark className="h-[22px] md:h-[26px]" />
        </Link>

        {/* "New" is an explicit destination rather than relying on the wordmark
            doubling as the way back to the composer. */}
        <NavLinks className="hidden md:flex" />
      </div>

      <div className="flex min-w-0 items-center gap-2 md:gap-4">
        {showPresence && hasEnvVars ? <HomePresence /> : null}
        {showEnvWarning ? (
          <>
            <EnvVarWarning />
            <ThemeSwitcher className="hidden md:inline-flex" />
          </>
        ) : hasEnvVars ? (
          <Suspense fallback={null}>
            <AuthButton />
          </Suspense>
        ) : (
          <ThemeSwitcher className="hidden md:inline-flex" />
        )}
        <MobileMenu className="md:hidden" />
      </div>
    </nav>
  );
}
