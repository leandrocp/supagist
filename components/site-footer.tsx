import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SealMark } from "@/components/brand/seal-mark";
import { Wordmark } from "@/components/brand/wordmark";

const LINKS = [
  {
    href: "https://github.com/leandrocp/supagist/blob/main/ARCHITECTURE.md",
    label: "Architecture",
    external: true,
  },
  { href: "https://github.com/leandrocp/supagist", label: "GitHub", external: true },
  { href: "/agents", label: "Agents", external: false },
  { href: "/terms", label: "Terms", external: false },
  { href: "/privacy", label: "Privacy", external: false },
  { href: "/help/data", label: "Your data", external: false },
] as const;

const creditLink = "underline-offset-2 hover:text-foreground hover:underline";

/**
 * Shared page footer: the flat seal and the credit line on the left, project
 * links on the right; stacked on mobile. Like the nav it spans the page at the
 * page padding and has no rule above it: tone and space separate it.
 */
export function SiteFooter() {
  return (
    <footer
      data-testid="site-footer"
      className="mt-auto flex flex-col gap-4 px-5 pt-[34px] pb-6 text-sm text-muted-foreground md:flex-row-reverse md:items-center md:justify-between md:px-12 md:pt-14 md:pb-5"
    >
      <div className="flex flex-col gap-3 md:hidden">
        <span className="flex items-center gap-2 text-foreground">
          <SealMark className="size-[22px]" />
          <Wordmark className="h-[18px]" />
        </span>
      </div>

      <ul className="flex flex-wrap items-center gap-x-6 gap-y-3 text-foreground">
        {LINKS.map(({ href, label, external }) => (
          <li key={href}>
            <Link
              href={href}
              className="inline-flex items-center gap-0.5 rounded-sm underline-offset-4 hover:underline focus-visible:focus-ring"
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {label}
              {external ? <ArrowUpRight aria-hidden="true" className="size-3.5" /> : null}
            </Link>
          </li>
        ))}
      </ul>

      <p className="flex items-center gap-2.5">
        <SealMark className="hidden size-[22px] md:block" />
        <span>
          Built with{" "}
          <Link
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            className={creditLink}
          >
            Supabase
          </Link>{" "}
          and{" "}
          <Link
            href="https://lumis.sh"
            target="_blank"
            rel="noopener noreferrer"
            className={creditLink}
          >
            Lumis
          </Link>
          . Inspired by{" "}
          <Link
            href="https://ray.so"
            target="_blank"
            rel="noopener noreferrer"
            className={creditLink}
          >
            ray.so
          </Link>
        </span>
      </p>
    </footer>
  );
}
