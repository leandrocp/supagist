import Link from "next/link";
import { Children, isValidElement, type ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { SiteFooter } from "@/components/site-footer";

export const CONTACT_EMAIL = "supagist@leandro.io";

/** URL fragment for a section heading: "What we collect" → "what-we-collect". */
function anchorFor(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Section and clause titles, in order, for the table of contents. */
function collectHeadings(children: ReactNode): string[] {
  const titles: string[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<{ title?: string; children?: ReactNode }>(child)) return;
    if (child.type === Section || child.type === Clause) {
      if (child.props.title) titles.push(child.props.title);
    } else {
      titles.push(...collectHeadings(child.props.children));
    }
  });
  return titles;
}

/**
 * Shared shell for /terms, /privacy and /help/data (site spec §1): a 720 px
 * body with a 220 px sticky table of contents on the left on desktop. The
 * page bodies stay exactly as written; only this shell is styled.
 */
export function LegalPage({
  title,
  subtitle,
  updated,
  eyebrow = "Legal",
  children,
}: {
  title: string;
  subtitle: string;
  updated: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  const headings = collectHeadings(children);

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <AppNav />
      <div className="mx-auto grid w-full max-w-[1100px] flex-1 gap-14 px-5 pt-[34px] pb-14 md:px-12 md:pt-14 lg:grid-cols-[220px_minmax(0,720px)] lg:gap-[116px] lg:pt-[72px]">
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-10 flex flex-col gap-5">
            <p className="eyebrow text-[11px] text-wax-text">On this page</p>
            <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
              {headings.map((heading) => (
                <li key={heading}>
                  <a
                    href={`#${anchorFor(heading)}`}
                    className="rounded-sm transition-colors hover:text-foreground focus-visible:focus-ring"
                  >
                    {heading.replace(/\.$/, "")}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <article className="flex min-w-0 flex-col gap-10 text-[15px] leading-[1.75] text-muted-foreground md:text-base [&_a]:text-postal [&_a]:underline-offset-4 [&_a:hover]:underline [&_li>span.text-foreground:first-child]:font-semibold">
          <header className="flex flex-col gap-3">
            <p className="eyebrow text-[11px] text-wax-text">{eyebrow}</p>
            <h1 className="font-display text-[44px] leading-[1.05] text-foreground md:text-[56px]">
              {title}
            </h1>
            <p className="text-[17px] text-muted-foreground md:text-lg">{subtitle}</p>
            <p className="eyebrow text-[11px] text-muted-foreground">Last updated {updated}</p>
          </header>
          {children}
          <p className="text-sm">
            <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link> ·{" "}
            <Link href="/help/data">Your data</Link> · <ContactLink />
          </p>
        </article>
      </div>
      <SiteFooter />
    </main>
  );
}

/** One numbered clause, matching the original Terms list. */
export function Clause({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li id={anchorFor(title)} className="flex scroll-mt-10 gap-4">
      <span className="mt-1 shrink-0 font-mono text-sm text-faint">{n}.</span>
      <div>
        <h2 className="font-display text-2xl leading-snug text-foreground">{title}</h2>
        <div className="mt-2 space-y-3">{children}</div>
      </div>
    </li>
  );
}

/** A headed section for the longer Privacy and help pages. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section id={anchorFor(title)} className="scroll-mt-10 space-y-3">
      <h2 className="font-display text-[26px] leading-snug text-foreground md:text-[28px]">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function ContactLink() {
  return <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
}
