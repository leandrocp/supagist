"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BrandDot } from "@/components/brand-dot";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error in the browser console so it shows up in session
    // recordings / dev tools. Real error tracking (Sentry et al.) is a
    // separate follow-up.
    console.error("[Supagist] route render error", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5">
        <nav className="flex h-16 items-center border-b border-border text-sm">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <BrandDot />
            <span className="font-medium tracking-tight">Supagist</span>
          </Link>
        </nav>

        <section className="flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
          <p className="font-mono text-xs uppercase tracking-code-label text-muted-foreground">
            Something went wrong
          </p>
          <h1 className="text-3xl font-medium tracking-tight">
            We couldn&apos;t render this page.
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            The error has been logged. Try again, and if it keeps happening, head back home.
          </p>
          {error.digest ? (
            <p className="font-mono text-xs uppercase tracking-code-label text-muted-foreground">
              Reference: {error.digest}
            </p>
          ) : null}
          <div className="flex items-center gap-3">
            <Button variant="pill" size="pill" onClick={reset}>
              Try again
            </Button>
            <Button asChild variant="pill-secondary" size="pill">
              <Link href="/">Back to Supagist</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
