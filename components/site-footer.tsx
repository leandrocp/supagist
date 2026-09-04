import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const LINKS = [
  {
    href: "https://github.com/leandrocp/supagist/blob/main/ARCHITECTURE.md",
    label: "Architecture",
    external: true,
  },
  { href: "https://github.com/leandrocp/supagist", label: "GitHub", external: true },
  { href: "/terms", label: "Terms", external: false },
] as const;

const linkClass = "underline-offset-2 hover:text-foreground hover:underline";

/**
 * Shared page footer. Carries the "Built on Supabase" badge, which used to sit
 * in the nav next to the wordmark — it is provenance, not navigation, so it
 * competed with the actual destinations up there.
 */
export function SiteFooter() {
  return (
    <footer className="flex flex-col gap-3 border-t border-border py-4 text-xs text-foreground-muted sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Badge
          variant="outline"
          className="gap-1.5 border-brand/20 bg-brand-subtle font-normal text-brand-strong"
        >
          <span aria-hidden className="size-1.5 rounded-full bg-brand" />
          Built on Supabase
        </Badge>
        <p className="font-mono uppercase tracking-code-label">
          Built with{" "}
          <Link
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`text-brand-link ${linkClass}`}
          >
            Supabase
          </Link>{" "}
          and{" "}
          <Link
            href="https://lumis.sh"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Lumis
          </Link>{" "}
          · Inspired by{" "}
          <Link
            href="https://ray.so"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            ray.so
          </Link>
        </p>
      </div>

      <div className="flex items-center gap-5 font-mono uppercase tracking-code-label">
        {LINKS.map(({ href, label, external }) => (
          <Link
            key={href}
            href={href}
            className={linkClass}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
