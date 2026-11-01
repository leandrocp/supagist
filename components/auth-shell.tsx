import type { ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { Envelope } from "@/components/brand/envelope";
import { SiteFooter } from "@/components/site-footer";

/**
 * Layout for the auth pages and the OAuth consent page (site spec §1, the
 * auth boards): the form in a 432 px column on the left, and on desktop a
 * quiet panel with the sealed envelope and the tagline on the right.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <AppNav />
      <div className="grid flex-1 gap-8 px-5 pt-[34px] md:px-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,752px)] lg:pt-0">
        <div className="flex flex-col justify-center lg:pl-16 lg:pb-16">
          <div className="w-full max-w-[432px]">{children}</div>
        </div>
        <aside
          aria-hidden="true"
          className="relative hidden min-h-[736px] flex-col items-center justify-center rounded-[18px] bg-surf2 lg:flex"
        >
          <Envelope className="w-[460px]" rotate={-2.2} seal={76 / 460} sealOffset={[0, 0]} />
          <p className="absolute bottom-10 left-12 font-mono text-base italic tracking-wider text-muted-foreground">
            Your code, sealed and sent.
          </p>
        </aside>
      </div>
      <SiteFooter />
    </main>
  );
}
