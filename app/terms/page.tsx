import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-linear-to-b from-background via-background to-muted/30">
      <div className="mx-auto max-w-2xl px-5 py-16 space-y-10">
        <div>
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Supagist
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">Terms of Use</h1>
          <p className="mt-1 text-sm text-muted-foreground">Simple terms for a simple tool.</p>
        </div>

        <ol className="space-y-6 text-sm">
          <li className="flex gap-4">
            <span className="mt-0.5 shrink-0 text-muted-foreground">1.</span>
            <div>
              <p className="font-medium text-foreground">Supagist is open source.</p>
              <p className="mt-1 text-muted-foreground">
                The full source code is publicly available. You are free to inspect, fork, and run
                your own instance.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="mt-0.5 shrink-0 text-muted-foreground">2.</span>
            <div>
              <p className="font-medium text-foreground">
                No data is sold or shared with third parties.
              </p>
              <p className="mt-1 text-muted-foreground">
                Your code and activity are used only to operate this service.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="mt-0.5 shrink-0 text-muted-foreground">3.</span>
            <div>
              <p className="font-medium text-foreground">
                Inactive snippets may be deleted after 6 months.
              </p>
              <p className="mt-1 text-muted-foreground">
                Snippets that have not been viewed for six months are automatically removed. There
                is no recovery.
              </p>
            </div>
          </li>
        </ol>
      </div>
    </main>
  );
}
