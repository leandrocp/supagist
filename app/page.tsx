import { AppNav } from "@/components/app-nav";
import { HomeComposer } from "@/components/home-composer";
import { SiteFooter } from "@/components/site-footer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Terminal } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Alert
        role="note"
        aria-label="Supagist agent skill"
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-none border-x-0 border-t-0 px-5 py-2"
      >
        <Terminal aria-hidden="true" />
        <div className="min-w-0 flex-1 sm:flex-none">
          <AlertTitle className="line-clamp-none">Use Supagist in your AI agent</AlertTitle>
          <AlertDescription>
            Create branded code images from Claude Code, Codex, OpenCode, Amp, and more.
          </AlertDescription>
        </div>
        <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
          <a
            href="https://github.com/leandrocp/supagist#supagist-agent-skill"
            target="_blank"
            rel="noopener noreferrer"
          >
            Get the skill
            <ArrowUpRight aria-hidden="true" data-icon="inline-end" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </Button>
      </Alert>
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
      </div>

      {/* Outside the centred column, like the nav — the divider has to reach
          both viewport edges to line up with the full-bleed composer. */}
      <SiteFooter fullBleed />
    </main>
  );
}
