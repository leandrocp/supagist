import { AppNav } from "@/components/app-nav";
import { HomeComposer } from "@/components/home-composer";
import { SiteFooter } from "@/components/site-footer";

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

        <SiteFooter />
      </div>
    </main>
  );
}
