import type { CSSProperties } from "react";
import { AppNav } from "@/components/app-nav";
import { HeroEnvelope } from "@/components/brand/hero-envelope";
import { HomeComposer } from "@/components/home-composer";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
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

      <AppNav showPresence />

      <section
        aria-labelledby="hero-title"
        className="relative grid items-center gap-8 overflow-x-clip px-5 pt-6 pb-10 md:px-12 lg:grid-cols-[minmax(0,40rem)_minmax(0,1fr)] lg:gap-6 lg:pt-6 lg:pb-12 lg:pl-16"
      >
        <div className="flex flex-col">
          {/* Light entrance. The h1 only moves (no fade) so its first paint,
              the page's LCP, is not held back. */}
          <p className="eyebrow rise-in text-wax-text">Your code, sealed and sent</p>
          <h1
            id="hero-title"
            className="rise mt-4 font-display text-[44px] leading-[0.98] text-foreground md:mt-4 md:text-[72px] xl:text-[88px]"
          >
            Code worth
            <br />
            sharing.
          </h1>
          <p
            style={{ "--i": 1 } as CSSProperties}
            className="rise-in mt-4 max-w-[540px] text-[17px] leading-normal text-muted-foreground md:mt-5 md:text-[20px]"
          >
            Turn a snippet into a beautiful, branded card. Seal it, share it, or render it straight
            from your agent.
          </p>
          <div
            style={{ "--i": 2 } as CSSProperties}
            className="rise-in mt-6 flex flex-wrap items-center gap-x-[22px] gap-y-3 md:mt-7"
          >
            <Button asChild size="lg">
              <a href="#composer">Create a snippet</a>
            </Button>
            <Link
              href="/agents"
              className="inline-flex min-h-11 items-center gap-0.5 rounded-full px-1 text-[17px] font-semibold text-postal hover:underline focus-visible:focus-ring"
            >
              <span className="md:hidden">Agent skill</span>
              <span className="hidden md:inline">Get the agent skill</span>
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>

        {/* Envelope B with the real product card laid in front of its lower
            left, as if it just came out. */}
        <HeroEnvelope />
      </section>

      {/* The composer itself is the page's subject below the fold. */}
      <section id="composer" aria-label="Create a snippet" className="scroll-mt-4 px-5 md:px-12">
        <HomeComposer />
      </section>

      <SiteFooter />
    </main>
  );
}
