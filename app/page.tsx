import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { BrandDot } from "@/components/brand-dot";
import { HomeComposer } from "@/components/home-composer";
import { MySnippets } from "@/components/my-snippets";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Badge } from "@/components/ui/badge";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

export default function Home() {
  const showEnvWarning = process.env.NODE_ENV === "development" && !hasEnvVars;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5">
        <nav className="flex h-16 items-center justify-between border-b border-border text-sm">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center gap-2">
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

          <div className="flex items-center gap-2">
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

        <section className="flex flex-1 flex-col gap-12 pt-10 pb-0 lg:gap-16 lg:pt-16 lg:pb-0">
          <HomeComposer />
          <Suspense>
            <MySnippets />
          </Suspense>
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
