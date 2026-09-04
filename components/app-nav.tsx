import { Suspense } from "react";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { BrandDot } from "@/components/brand-dot";
import { EnvVarWarning } from "@/components/env-var-warning";
import { HomePresence } from "@/components/home-presence";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Badge } from "@/components/ui/badge";
import { cn, hasEnvVars } from "@/lib/utils";

type Props = {
  /** Live lobby presence belongs to the composer, so only the home page asks for it. */
  showPresence?: boolean;
  /** Full-bleed on the home page, where it sits flush against the composer. */
  fullBleed?: boolean;
};

/**
 * The single app bar, shared by every page that has chrome.
 *
 * It previously existed as three hand-copied variants (home, snippet view, and
 * whatever came next), which is how they drifted apart in the first place.
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
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 hover:opacity-80">
          <BrandDot />
          <p className="font-semibold tracking-tight">Supagist</p>
        </Link>
        <Badge
          variant="outline"
          className="hidden gap-1.5 border-brand/20 bg-brand-subtle font-normal text-brand-strong sm:inline-flex"
        >
          <span aria-hidden className="size-1.5 rounded-full bg-brand" />
          Built on Supabase
        </Badge>
      </div>

      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        {showPresence && hasEnvVars ? <HomePresence /> : null}
        {hasEnvVars ? (
          <Link
            href="/snippets"
            className="shrink-0 text-foreground-light transition-colors hover:text-foreground"
          >
            Snippets
          </Link>
        ) : null}
        {showEnvWarning ? (
          <EnvVarWarning />
        ) : hasEnvVars ? (
          <Suspense fallback={null}>
            <AuthButton />
          </Suspense>
        ) : null}
        <ThemeSwitcher />
      </div>
    </nav>
  );
}
