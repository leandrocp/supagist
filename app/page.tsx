import type { CSSProperties } from "react";
import { AppNav } from "@/components/app-nav";
import { IntroEnvelope } from "@/components/brand/intro-envelope";
import { HomeComposer } from "@/components/home-composer";
import { SiteFooter } from "@/components/site-footer";
import { ArrowRight, Terminal } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <aside
        aria-label="Supagist agent skill"
        className="hidden min-h-[46px] flex-wrap items-center justify-center gap-x-3.5 gap-y-1 bg-surf2 px-5 py-2 text-sm md:flex"
      >
        <Terminal aria-hidden="true" className="size-4 shrink-0 text-wax-text" />
        <strong className="font-semibold">Use Supagist in your AI agent</strong>
        <span className="hidden text-muted-foreground lg:inline">
          Create branded code images from Claude Code, Codex, OpenCode, Amp, and more.
        </span>
        <Link
          href="/agents"
          className="inline-flex items-center gap-0.5 rounded-sm font-semibold text-postal hover:underline focus-visible:focus-ring"
        >
          Get the skill
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </aside>

      <AppNav showPresence className="mx-auto w-full max-w-[1296px]" />

      {/* Editor first: a short centred intro, then the card itself is the call
          to action. Nav, intro, editor and controls share one column. */}
      <section
        aria-labelledby="hero-title"
        className="mx-auto flex w-full max-w-[1296px] flex-col items-center px-5 pt-4 pb-3 text-center md:px-12 md:pt-6 md:pb-6"
      >
        <IntroEnvelope />
        {/* Light entrance. The h1 only moves (no fade) so its first paint,
            the page's LCP, is not held back. */}
        <p className="eyebrow rise-in mt-4 text-wax-text md:mt-[18px]">
          Your code, sealed and sent
        </p>
        <h1
          id="hero-title"
          className="rise mt-3 font-display text-[40px] leading-none text-foreground md:mt-4 md:text-[64px]"
        >
          Code worth sharing.
        </h1>
        <p
          style={{ "--i": 1 } as CSSProperties}
          className="rise-in mt-3 max-w-[760px] text-[17px] leading-normal text-muted-foreground md:text-[18px] md:leading-[27px]"
        >
          Paste your code into the card, pick a look, and share it. Or{" "}
          <Link
            href="/agents"
            className="rounded-sm py-3 font-semibold whitespace-nowrap text-postal hover:underline focus-visible:focus-ring"
          >
            render it from your agent →
          </Link>
        </p>
      </section>

      <section
        id="composer"
        aria-label="Create a snippet"
        className="mx-auto w-full max-w-[1296px] scroll-mt-4 px-5 md:px-12"
      >
        <HomeComposer />
      </section>

      <SiteFooter />
    </main>
  );
}
