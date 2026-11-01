"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CircleAlert } from "lucide-react";
import { SealMark } from "@/components/brand/seal-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { MobileMenu } from "@/components/mobile-menu";
import { NavLinks } from "@/components/nav-links";
import { SiteFooter } from "@/components/site-footer";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/client-error-reporting";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Supagist] route render error", error);
    reportClientError(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col bg-background">
      {/* A client boundary cannot render the server AppNav (its account
          control reads the session on the server), so this is the same bar
          without it. */}
      <nav className="flex h-16 shrink-0 items-center justify-between gap-4 px-5 md:h-[76px] md:px-12">
        <div className="flex min-w-0 items-center gap-[34px]">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 rounded-md text-foreground focus-visible:focus-ring"
          >
            <SealMark className="size-7 md:size-8" />
            <Wordmark className="h-[22px] md:h-[26px]" />
          </Link>
          <NavLinks className="hidden md:flex" />
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher className="hidden md:inline-flex" />
          <MobileMenu className="md:hidden" />
        </div>
      </nav>

      <section className="flex flex-1 flex-col justify-center px-5 py-14 md:px-12">
        <div className="mx-auto w-full max-w-[640px]">
          <CircleAlert aria-hidden="true" className="size-8 text-wax-text" />
          <p className="eyebrow mt-6 text-wax-text">Something went wrong</p>
          <h1 className="mt-5 font-display text-[34px] leading-tight text-foreground md:text-[52px]">
            We couldn&apos;t render this page.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground md:text-[17px]">
            The error has been logged. Try again, and if it keeps happening, head back home.
          </p>
          {error.digest ? (
            <p className="mt-4 font-mono text-[13px] text-muted-foreground">
              Reference: {error.digest}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button onClick={reset}>Try again</Button>
            <Button asChild variant="secondary">
              <Link href="/">Back to Supagist</Link>
            </Button>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
