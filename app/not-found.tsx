import Link from "next/link";
import { BrandDot } from "@/components/brand-dot";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5">
        <nav className="flex h-16 items-center border-b border-border text-sm">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <BrandDot />
            <span className="font-medium tracking-tight">supagist</span>
          </Link>
        </nav>

        <section className="flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
          <p className="font-mono text-xs uppercase tracking-code-label text-muted-foreground">
            404
          </p>
          <h1 className="text-3xl font-medium tracking-tight">This snippet has scrolled away.</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            The link is stale or the snippet was removed. Snippets that go untouched for six months
            are cleaned up automatically.
          </p>
          <Button asChild variant="pill" size="pill">
            <Link href="/">Back to supagist</Link>
          </Button>
        </section>
      </div>
    </main>
  );
}
