import { AppNav } from "@/components/app-nav";
import { HomeComposer } from "@/components/home-composer";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      {/* Full-bleed so the bar's edges line up with the composer below it. */}
      <AppNav showPresence fullBleed />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5">
        {/* The composer itself is the page's subject, so the title only needs
            to exist for assistive tech and document outline. */}
        <h1 className="sr-only">Create a snippet</h1>

        {/* The published-snippet list used to sit under the composer, below the
            fold of a viewport-height editor where nobody found it. It lives at
            /snippets now, linked from the nav. */}
        <section className="flex flex-1 flex-col gap-12 pt-10 pb-0 lg:gap-16 lg:pt-16 lg:pb-0">
          <HomeComposer />
        </section>

        <footer className="flex flex-col border-t border-border py-4 text-sm">
          <div className="flex flex-col gap-3 text-xs text-foreground-muted sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="font-mono uppercase tracking-code-label">
              Built with{" "}
              <Link
                href="https://supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-link underline-offset-2 hover:underline"
              >
                Supabase
              </Link>{" "}
              and{" "}
              <Link
                href="https://lumis.sh"
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:text-foreground hover:underline"
              >
                Lumis
              </Link>{" "}
              · Inspired by{" "}
              <Link
                href="https://ray.so"
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:text-foreground hover:underline"
              >
                ray.so
              </Link>
            </p>
            <div className="flex items-center gap-5 font-mono uppercase tracking-code-label">
              <Link
                href="https://github.com/leandrocp/supagist/blob/main/ARCHITECTURE.md"
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:text-foreground hover:underline"
              >
                Architecture
              </Link>
              <Link
                href="https://github.com/leandrocp/supagist"
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:text-foreground hover:underline"
              >
                GitHub
              </Link>
              <Link
                href="/terms"
                className="underline-offset-2 hover:text-foreground hover:underline"
              >
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
