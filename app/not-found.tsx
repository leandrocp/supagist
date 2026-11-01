import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { Envelope } from "@/components/brand/envelope";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <AppNav />
      <section className="flex flex-1 flex-col items-center justify-center px-5 py-14 text-center md:px-12">
        {/* The envelope is empty and unsealed: the letter is gone. */}
        <Envelope className="w-[min(100%,420px)]" rotate={-3} seal={null} />
        <p className="eyebrow mt-10 text-wax-text">404</p>
        <h1 className="mt-4 font-display text-[34px] leading-tight text-foreground md:text-[52px]">
          This snippet has scrolled away.
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground md:text-base">
          The link is stale or the snippet was removed. Snippets that go untouched for six months
          are cleaned up automatically.
        </p>
        <Button asChild className="mt-8">
          <Link href="/">Back to Supagist</Link>
        </Button>
      </section>
      <SiteFooter />
    </main>
  );
}
