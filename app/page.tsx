import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { BrandDot } from "@/components/brand-dot";
import { HomeComposer } from "@/components/home-composer";
import { MySnippets } from "@/components/my-snippets";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import { Suspense } from "react";

export default function Home() {
  const showEnvWarning = process.env.NODE_ENV === "development" && !hasEnvVars;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5">
        <nav className="flex h-16 items-center justify-between border-b border-border text-sm">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-2">
              <BrandDot />
              <p className="font-medium tracking-tight">Supagist</p>
            </a>
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

        <section className="flex flex-1 flex-col gap-12 py-10 lg:gap-16 lg:py-16">
          <HomeComposer />
          <Suspense>
            <MySnippets />
          </Suspense>
        </section>

        <footer className="flex flex-col gap-3 border-t border-border py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="font-mono uppercase tracking-code-label">
            Built with{" "}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-link underline-offset-2 hover:underline"
            >
              Supabase
            </a>{" "}
            and{" "}
            <a
              href="https://lumis.sh"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              Lumis
            </a>{" "}
            · Backgrounds by{" "}
            <a
              href="https://ray.so"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              ray.so
            </a>
          </p>
          <div className="flex items-center gap-5 font-mono uppercase tracking-code-label">
            <a
              href="https://github.com/leandrocp/supagist/blob/main/ARCHITECTURE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              Architecture
            </a>
            <a
              href="https://github.com/leandrocp/supagist"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              GitHub
            </a>
            <a href="/terms" className="underline-offset-2 hover:text-foreground hover:underline">
              Terms
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
