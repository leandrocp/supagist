import Link from "next/link";
import type { ReactNode } from "react";

export const CONTACT_EMAIL = "supagist@leandro.io";

/** Shared shell for /terms, /privacy and /help/data, in the original Terms style. */
export function LegalPage({
  title,
  subtitle,
  updated,
  children,
}: {
  title: string;
  subtitle: string;
  updated: string;
  children: ReactNode;
}) {
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
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">Last updated {updated}</p>
        </div>
        {children}
        <p className="border-t border-border pt-6 text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground hover:underline">
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="hover:text-foreground hover:underline">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link href="/help/data" className="hover:text-foreground hover:underline">
            Your data
          </Link>{" "}
          · <ContactLink />
        </p>
      </div>
    </main>
  );
}

/** One numbered clause, matching the original Terms list. */
export function Clause({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{n}.</span>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <div className="mt-1 space-y-2 text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}

/** A headed section for the longer Privacy and help pages. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 text-sm">
      <h2 className="font-medium text-foreground">{title}</h2>
      <div className="space-y-2 text-muted-foreground">{children}</div>
    </section>
  );
}

export function ContactLink() {
  return (
    <a
      href={`mailto:${CONTACT_EMAIL}`}
      className="text-foreground underline-offset-2 hover:underline"
    >
      {CONTACT_EMAIL}
    </a>
  );
}
